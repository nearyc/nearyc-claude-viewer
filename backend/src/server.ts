import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import os from 'os';

import { createSessionsRouter } from './routes/sessions';
import { createTeamsRouter } from './routes/teams';
import { createProjectsRouter } from './routes/projects';
import { createStatsRouter } from './routes/stats';
import { createExecuteRouter } from './routes/execute';
import { createSearchRouter } from './routes/search';
import { createFavoritesRouter } from './routes/favorites';
import { SessionsService } from './services/sessionsService';
import { TeamsService } from './services/TeamsService';
import { StatsService } from './services/statsService';
import { SearchService } from './services/searchService';
import { FavoritesService } from './services/favoritesService';
import { ActivityService, getGlobalActivityService } from './services/activityService';
import { CodeStatsService } from './services/codeStatsService';
import { FileWatcher } from './services/fileWatcher';
import { SSEController } from './services/SSEController';
import { eventBus } from './services/EventBus';

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
  // Skip authentication for health check and SSE endpoints
  if (req.path === '/api/health' || req.path === '/api/sse') {
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

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased for dev)
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
    // Allow common Vite dev server ports + any origin (for Tailscale/mobile access)
    // In production, restrict this to specific domains
    return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
  }
  // Support comma-separated list of origins
  return corsOrigin.split(',').map(origin => origin.trim());
}

export interface ServerInstance {
  app: express.Application;
  httpServer: ReturnType<typeof createServer>;
  fileWatcher: FileWatcher;
  sseController: SSEController;
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
  const projectsDir = path.join(path.dirname(historyFilePath), 'projects');

  console.log('[Server] History file path:', historyFilePath);
  console.log('[Server] Teams directory:', teamsDir);
  console.log('[Server] Projects directory:', projectsDir);

  // Create services
  const sessionsService = new SessionsService(historyFilePath);
  const teamsService = new TeamsService(teamsDir);
  const statsService = new StatsService(sessionsService, teamsService);
  const searchService = new SearchService(sessionsService, teamsService, historyFilePath, teamsDir);
  const codeStatsService = new CodeStatsService(sessionsService, teamsService, historyFilePath, teamsDir);
  const activityService = getGlobalActivityService();
  const favoritesService = new FavoritesService();

  // Create FileWatcher with new fs.watch architecture
  const fileWatcher = new FileWatcher(projectsDir);

  // Create SSE Controller
  const sseController = new SSEController();

  // Create Express app
  const app = express();

  // Security middleware - Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
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

  // CORS configuration - allows localhost dev servers and Tailscale network
  const allowedOrigins = getCorsOrigins();
  app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g., mobile apps, curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Allow configured origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Allow Tailscale IP range (100.64.0.0/10) for mobile access
      // Tailscale assigns IPs in the 100.64.0.0 - 100.127.255.255 range
      if (origin.match(/^https?:\/\/100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}(:\d+)?$/)) {
        callback(null, true);
        return;
      }

      // Allow any localhost origin for development
      if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    },
    credentials: true,
  }));

  // API Key authentication middleware (after CORS, before routes)
  app.use(apiKeyAuth);

  app.use(express.json());

  // Create HTTP server first with port reuse option
  const httpServer = createServer({
    // @ts-ignore - allow port reuse for development (TIME_WAIT issues)
    reusePort: true
  }, app);

  // SSE endpoint - handles server-sent events
  app.get('/api/sse', (req, res) => {
    sseController.handleConnection(res);
  });

  // Routes (without Socket.IO dependency)
  app.use('/api/sessions', createSessionsRouter({ sessionsService }));
  app.use('/api/teams', createTeamsRouter({ teamsService }));
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
          sseClients: sseController.getClientCount(),
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

  // Listen to EventBus events and forward to SSE clients
  eventBus.on('sessionChanged', async (event) => {
    console.log('[EventBus] sessionChanged:', event.projectId, event.sessionId);

    // Broadcast to SSE clients (always, even if no clients connected)
    sseController.broadcast('sessionChanged', {
      projectId: event.projectId,
      sessionId: event.sessionId,
    });

    // Clear cache and get updated session
    sessionsService.clearCache();
    const updatedSession = await sessionsService.getSessionWithConversation(event.sessionId);

    if (updatedSession) {
      // Record activity
      activityService.recordSessionUpdated(
        event.sessionId,
        updatedSession.project,
        updatedSession.messageCount
      );
    }
  });

  eventBus.on('sessionListChanged', async (event) => {
    console.log('[EventBus] sessionListChanged:', event.projectId);

    // Broadcast to SSE clients
    sseController.broadcast('sessionListChanged', {
      projectId: event.projectId,
    });
  });

  eventBus.on('agentSessionChanged', async (event) => {
    console.log('[EventBus] agentSessionChanged:', event.projectId, event.agentSessionId);

    // Broadcast to SSE clients
    sseController.broadcast('agentSessionChanged', {
      projectId: event.projectId,
      agentSessionId: event.agentSessionId,
    });
  });

  // Start file watcher
  fileWatcher.start();
  console.log('[Server] FileWatcher started');

  return {
    app,
    httpServer,
    fileWatcher,
    sseController,
    sessionsService,
    teamsService,
    statsService,
    searchService,
    codeStatsService,
    activityService,
    favoritesService,
  };
}
