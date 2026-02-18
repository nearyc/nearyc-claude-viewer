import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import os from 'os';
import type { Socket } from 'socket.io';

import { createSessionsRouter } from './routes/sessions';
import { createTeamsRouter } from './routes/teams';
import { createProjectsRouter } from './routes/projects';
import { createStatsRouter } from './routes/stats';
import { createExecuteRouter } from './routes/execute';
import { createSearchRouter } from './routes/search';
import { createFavoritesRouter } from './routes/favorites';
import { SessionsService } from './services/sessionsService';
import { TeamsService } from './services/teamsService';
import { StatsService } from './services/statsService';
import { SearchService } from './services/searchService';
import { FavoritesService } from './services/favoritesService';
import { ActivityService, getGlobalActivityService } from './services/activityService';
import { CodeStatsService } from './services/codeStatsService';
import { FileWatcher } from './services/fileWatcher';
import type { FileWatcherChangeEvent } from './services/fileWatcher';
import type { DashboardStats, TypedSocket } from './types';

// API Key validation helper
function validateApiKey(key: string | undefined): boolean {
  const apiKey = process.env.API_KEY;
  // If API_KEY is not set, allow all requests (development mode)
  if (!apiKey) {
    return true;
  }
  return key === apiKey;
}

// API Key authentication middleware
function apiKeyAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  // Skip authentication for health check endpoint
  if (req.path === '/api/health') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!validateApiKey(apiKey)) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing API key',
    });
    return;
  }

  next();
}

// Socket.IO authentication middleware
function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth.token as string | undefined ??
                socket.handshake.query.token as string | undefined;

  if (!validateApiKey(token)) {
    next(new Error('Unauthorized: Invalid or missing authentication token'));
    return;
  }

  next();
}

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Parse CORS origins from environment variable
function getCorsOrigins(): string[] {
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) {
    return ['http://localhost:5173'];
  }
  // Support comma-separated list of origins
  return corsOrigin.split(',').map(origin => origin.trim());
}

export interface ServerInstance {
  app: express.Application;
  httpServer: ReturnType<typeof createServer>;
  io: SocketIOServer;
  fileWatcher: FileWatcher;
  sessionsService: SessionsService;
  teamsService: TeamsService;
  statsService: StatsService;
  activityService?: ActivityService;
  searchService: SearchService;
  codeStatsService: CodeStatsService;
  favoritesService: FavoritesService;
}

export function createServerInstance(): ServerInstance {
  // Get paths from environment or use defaults
  const historyFilePath = process.env.HISTORY_FILE_PATH || path.join(os.homedir(), '.claude', 'history.jsonl');
  const teamsDir = process.env.TEAMS_DIR || path.join(os.homedir(), '.claude', 'teams');

  console.log('[Server] History file path:', historyFilePath);
  console.log('[Server] Teams directory:', teamsDir);

  // Create services
  const sessionsService = new SessionsService(historyFilePath);
  const teamsService = new TeamsService(teamsDir);
  const statsService = new StatsService(sessionsService, teamsService);
  const searchService = new SearchService(sessionsService, teamsService, historyFilePath, teamsDir);
  const codeStatsService = new CodeStatsService(sessionsService, teamsService, historyFilePath, teamsDir);
  const activityService = getGlobalActivityService();
  const favoritesService = new FavoritesService();
  const fileWatcher = new FileWatcher(historyFilePath, teamsDir);

  // Create Express app
  const app = express();

  // Security middleware - Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow loading resources from different origins
  }));

  // Rate limiting
  app.use(limiter);

  // CORS configuration with strict origin validation
  const allowedOrigins = getCorsOrigins();
  app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g., mobile apps, curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
      }
    },
    credentials: true,
  }));

  // API Key authentication middleware (after CORS, before routes)
  app.use(apiKeyAuth);

  app.use(express.json());

  // Create HTTP server first
  const httpServer = createServer(app);

  // Create Socket.IO server early
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.IO authentication middleware
  io.use(socketAuth);

  // Helper function to broadcast stats to all clients
  async function broadcastStats() {
    try {
      const sessions = await sessionsService.getSessions();
      const projects = await sessionsService.getProjects();
      const teams = await teamsService.getTeams();

      const stats: DashboardStats = {
        totalSessions: sessions.length,
        totalProjects: projects.length,
        totalInputs: sessions.reduce((sum, s) => sum + s.inputCount, 0),
        totalTeams: teams.length,
        totalMembers: teams.reduce((sum, t) => sum + t.memberCount, 0),
        recentSessions: sessions.slice(0, 10),
        recentTeams: teams.slice(0, 10),
      };

      io.emit('stats:updated', stats);
    } catch (error) {
      console.error('[Server] Error broadcasting stats:', error);
    }
  }

  // Routes (defined after io is created so it can be passed to routers)
  app.use('/api/sessions', createSessionsRouter({ sessionsService, io }));
  app.use('/api/teams', createTeamsRouter({ teamsService, io }));
  app.use('/api/projects', createProjectsRouter(sessionsService));
  app.use('/api/stats', createStatsRouter({ statsService, codeStatsService }));
  app.use('/api/search', createSearchRouter({ searchService }));
  app.use('/api/execute', createExecuteRouter());
  app.use('/api/favorites', createFavoritesRouter({ favoritesService }));

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      const sessionStats = sessionsService.getCacheStats();
      const teamStats = teamsService.getCacheStats();

      res.json({
        success: true,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          cache: {
            sessions: sessionStats,
            teams: teamStats,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed',
      });
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket: TypedSocket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Initialize subscription tracking
    socket.data.subscribedSessions = new Set();
    socket.data.subscribedTeams = new Set();

    // Send initial sessions data
    sessionsService.getSessions().then((sessions) => {
      socket.emit('sessions:initial', { sessions });
    });

    // Send initial projects data
    sessionsService.getProjects().then((projects) => {
      socket.emit('projects:initial', { projects });
    });

    // Send initial teams data
    teamsService.getTeams().then((teams) => {
      socket.emit('teams:initial', { teams });
    });

    // Send initial stats
    broadcastStats();

    // Handle session subscription
    socket.on('session:subscribe', (sessionId: string) => {
      console.log('[Socket] Client subscribed to session:', sessionId);
      socket.join(`session:${sessionId}`);
      socket.data.subscribedSessions.add(sessionId);

      // Send session data immediately
      sessionsService.getSessionById(sessionId).then((session) => {
        if (session) {
          socket.emit('session:data', session);
        }
      });
    });

    // Handle session unsubscription
    socket.on('session:unsubscribe', (sessionId: string) => {
      console.log('[Socket] Client unsubscribed from session:', sessionId);
      socket.leave(`session:${sessionId}`);
      socket.data.subscribedSessions.delete(sessionId);
    });

    // Handle team subscription
    socket.on('team:subscribe', (teamId: string) => {
      console.log('[Socket] Client subscribed to team:', teamId);
      socket.join(`team:${teamId}`);
      socket.data.subscribedTeams.add(teamId);

      // Send initial team data with inboxes
      teamsService.getTeamWithInboxes(teamId).then((team) => {
        if (team) {
          socket.emit('team:data', team);
        }
      });
    });

    // Handle team unsubscription
    socket.on('team:unsubscribe', (teamId: string) => {
      console.log('[Socket] Client unsubscribed from team:', teamId);
      socket.leave(`team:${teamId}`);
      socket.data.subscribedTeams.delete(teamId);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });

  // File watcher event handling
  fileWatcher.on('change', async (event: FileWatcherChangeEvent) => {
    console.log('[FileWatcher] Change detected:', event.path, event.type, 'source:', event.source);

    // Handle new team directory creation
    if (event.type === 'addDir' && event.source === 'teams') {
      console.log('[FileWatcher] New team directory detected, refreshing teams data');
      const teams = await teamsService.getTeams();
      io.emit('teams:updated', { teams });
      broadcastStats();
      return;
    }

    if (event.source === 'sessions' || event.source === 'projects') {
      // Sessions or projects data changed - broadcast to all clients
      const sessions = await sessionsService.getSessions();
      const projects = await sessionsService.getProjects();

      io.emit('sessions:updated', { sessions });
      io.emit('projects:updated', { projects });
      broadcastStats();

      console.log('[Socket] Broadcasted sessions:updated and projects:updated to all clients');

      // Check if it's a specific session file change in projects directory
      if (event.source === 'projects' && event.path.endsWith('.jsonl')) {
        const relativePath = path.relative(sessionsService.getProjectsDir(), event.path);
        const pathParts = relativePath.split(/[\\/]/);
        if (pathParts.length >= 2) {
          const sessionId = path.basename(pathParts[1], '.jsonl');
          console.log('[Socket] Session file changed:', sessionId);

          // Clear cache for this session to force reload
          sessionsService.clearCache();

          // Get updated session with conversation and broadcast to subscribers
          const updatedSession = await sessionsService.getSessionWithConversation(sessionId);
          if (updatedSession) {
            io.to(`session:${sessionId}`).emit('session:data', updatedSession);
            io.to(`session:${sessionId}`).emit('session:updated', { session: updatedSession });
            console.log('[Socket] Broadcasted session update to subscribers of:', sessionId);

            // Record session updated activity
            activityService.recordSessionUpdated(
              sessionId,
              updatedSession.project,
              updatedSession.messageCount
            );
          }
        }
      }

      // Record session created activity for new sessions
      if (event.type === 'add' && event.source === 'projects' && event.path.endsWith('.jsonl')) {
        const relativePath = path.relative(sessionsService.getProjectsDir(), event.path);
        const pathParts = relativePath.split(/[\\/]/);
        if (pathParts.length >= 2) {
          const sessionId = path.basename(pathParts[1], '.jsonl');
          const session = await sessionsService.getSessionById(sessionId);
          if (session) {
            activityService.recordSessionCreated(
              sessionId,
              session.project,
              session.inputs[0]?.display
            );
          }
        }
      }
    } else if (event.source === 'teams') {
      // Teams data changed - broadcast to all clients
      const teams = await teamsService.getTeams();
      io.emit('teams:updated', { teams });

      console.log('[Socket] Broadcasted teams:updated to all clients');
      broadcastStats();

      // Check if it's a specific team config change
      const relativePath = path.relative(teamsDir, event.path);
      const pathParts = relativePath.split(/[\\/]/);
      if (pathParts.length >= 2 && pathParts[1] === 'config.json') {
        const teamId = pathParts[0];
        // Broadcast specific team update to subscribers
        const team = await teamsService.getTeamWithInboxes(teamId);
        if (team) {
          io.to(`team:${teamId}`).emit('team:data', team);
        }
      }

      // Check if it's a messages change (inbox file)
      if (pathParts.length >= 3 && pathParts[1] === 'inboxes') {
        const teamId = pathParts[0];
        const memberName = path.basename(pathParts[2], '.json');

        const messages = await teamsService.getMessages(teamId, memberName);
        io.to(`team:${teamId}`).emit('team:messages', {
          teamId,
          messages,
        });

        // Also broadcast updated team data with new message counts
        const teamWithInboxes = await teamsService.getTeamWithInboxes(teamId);
        if (teamWithInboxes) {
          io.to(`team:${teamId}`).emit('team:data', teamWithInboxes);
        }

        console.log('[Socket] Broadcasted team:messages to team:', teamId);

        // Record team message activity for the latest message
        if (messages.length > 0) {
          const latestMessage = messages[messages.length - 1];
          activityService.recordTeamMessage(
            teamId,
            latestMessage.sender,
            latestMessage.recipient,
            latestMessage.content
          );
        }
      }
    }
  });

  fileWatcher.on('ready', async () => {
    console.log('[FileWatcher] Ready - loading initial data');

    // Load initial data
    await sessionsService.loadSessions();

    // Broadcast initial data to all clients
    const sessions = await sessionsService.getSessions();
    const projects = await sessionsService.getProjects();
    const teams = await teamsService.getTeams();

    io.emit('sessions:updated', { sessions });
    io.emit('projects:updated', { projects });
    io.emit('teams:updated', { teams });
    broadcastStats();

    console.log('[Server] Initial data broadcast complete');
  });

  fileWatcher.on('error', (error: Error) => {
    console.error('[FileWatcher] Error:', error);
  });

  // Start file watcher
  fileWatcher.start();

  return {
    app,
    httpServer,
    io,
    fileWatcher,
    sessionsService,
    teamsService,
    statsService,
    searchService,
    codeStatsService,
    activityService,
    favoritesService,
  };
}
