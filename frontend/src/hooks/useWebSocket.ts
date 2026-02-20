import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  Session,
  Project,
  Team,
  TeamWithInboxes,
  Message,
  DashboardStats,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../types';

// Use relative URL to leverage Vite proxy
const WS_URL = '/';

// WebSocket constants
const SESSION_UPDATE_INDICATOR_DURATION_MS = 2000; // 2 seconds

interface WebSocketState {
  connected: boolean;
  error: string | null;
  updatingSessions: Set<string>;
}

interface WebSocketCallbacks {
  onSessionsInit?: (sessions: Session[]) => void;
  onSessionsUpdated?: (sessions: Session[]) => void;
  onSessionData?: (session: Session) => void;
  onSessionUpdated?: (session: Session) => void;
  onProjectsInit?: (projects: Project[]) => void;
  onProjectsUpdated?: (projects: Project[]) => void;
  onTeamsInit?: (teams: Team[]) => void;
  onTeamsUpdated?: (teams: Team[]) => void;
  onTeamData?: (team: TeamWithInboxes) => void;
  onTeamUpdated?: (team: Team) => void;
  onMessagesUpdated?: (data: { teamId: string; memberId: string; messages: Message[] }) => void;
  onStatsUpdated?: (stats: DashboardStats) => void;
}

export function useWebSocket(callbacks: WebSocketCallbacks = {}) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const callbacksRef = useRef(callbacks);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    error: null,
    updatingSessions: new Set(),
  });

  // Keep callbacks ref up to date without triggering reconnection
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Helper to track timeouts for cleanup
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(callback, delay);
    timeoutsRef.current.add(timeout);
    return timeout;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
  }, []);

  // Connection effect - runs once on mount
  useEffect(() => {
    // Check if socket already exists (avoid double connection)
    if (socketRef.current) {
      return;
    }

    // Create socket connection
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.id);
      setState(prev => ({ ...prev, connected: true, error: null }));
    });

    socket.on('disconnect', () => {
      setState(prev => ({ ...prev, connected: false, error: null }));
    });

    socket.on('connect_error', (err) => {
      setState(prev => ({ ...prev, connected: false, error: err.message }));
    });

    // Sessions events
    socket.on('sessions:initial', (data: { sessions: Session[] }) => {
      callbacksRef.current.onSessionsInit?.(data.sessions);
    });

    socket.on('sessions:updated', (data: { sessions: Session[] }) => {
      if (data.sessions) {
        callbacksRef.current.onSessionsUpdated?.(data.sessions);
      }
    });

    socket.on('session:data', (session: Session) => {
      console.log('[WebSocket] Received session:data:', session.sessionId);
      callbacksRef.current.onSessionData?.(session);
    });

    socket.on('session:updated', (data: { session: Session }) => {
      setState(prev => {
        const newSet = new Set(prev.updatingSessions);
        newSet.add(data.session.sessionId);
        return { ...prev, updatingSessions: newSet };
      });
      callbacksRef.current.onSessionUpdated?.(data.session);

      // Track timeout for cleanup
      const timeout = setTimeout(() => {
        setState(prev => {
          const newSet = new Set(prev.updatingSessions);
          newSet.delete(data.session.sessionId);
          return { ...prev, updatingSessions: newSet };
        });
      }, SESSION_UPDATE_INDICATOR_DURATION_MS);
      timeoutsRef.current.add(timeout);
    });

    // Projects events
    socket.on('projects:initial', (data: { projects: Project[] }) => {
      callbacksRef.current.onProjectsInit?.(data.projects);
    });

    socket.on('projects:updated', (data: { projects: Project[] }) => {
      if (data.projects) {
        callbacksRef.current.onProjectsUpdated?.(data.projects);
      }
    });

    // Teams events
    socket.on('teams:initial', (data: { teams: Team[] }) => {
      callbacksRef.current.onTeamsInit?.(data.teams);
    });

    socket.on('teams:updated', (data: { teams: Team[] }) => {
      if (data.teams) {
        callbacksRef.current.onTeamsUpdated?.(data.teams);
      }
    });

    socket.on('team:data', (team: TeamWithInboxes) => {
      callbacksRef.current.onTeamData?.(team);
    });

    socket.on('team:updated', (data: { team: Team }) => {
      callbacksRef.current.onTeamUpdated?.(data.team);
    });

    // Handle team:messages event from backend (includes memberId)
    socket.on('team:messages', (data: { teamId: string; memberId: string; messages: Message[] }) => {
      callbacksRef.current.onMessagesUpdated?.(data);
    });

    // Legacy: Handle messages:updated event (if used elsewhere)
    socket.on('messages:updated', (data: { teamId: string; memberId: string; messages: Message[] }) => {
      callbacksRef.current.onMessagesUpdated?.(data);
    });

    // Stats events
    socket.on('stats:updated', (stats: DashboardStats) => {
      callbacksRef.current.onStatsUpdated?.(stats);
    });

    socketRef.current = socket;

    // Cleanup on unmount
    return () => {
      clearAllTimeouts();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Empty deps - only run on mount/unmount

  // Subscription helpers
  const subscribeToSession = useCallback((sessionId: string) => {
    socketRef.current?.emit('session:subscribe', sessionId);
  }, []);

  const unsubscribeFromSession = useCallback((sessionId: string) => {
    socketRef.current?.emit('session:unsubscribe', sessionId);
  }, []);

  const subscribeToProject = useCallback((projectName: string) => {
    // TODO: Implement project subscription
  }, []);

  const unsubscribeFromProject = useCallback((projectName: string) => {
    // TODO: Implement project unsubscription
  }, []);

  const subscribeToTeam = useCallback((teamId: string) => {
    socketRef.current?.emit('team:subscribe', teamId);
  }, []);

  const unsubscribeFromTeam = useCallback((teamId: string) => {
    socketRef.current?.emit('team:unsubscribe', teamId);
  }, []);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  return {
    ...state,
    socket: socketRef.current,
    subscribeToSession,
    unsubscribeFromSession,
    subscribeToProject,
    unsubscribeFromProject,
    subscribeToTeam,
    unsubscribeFromTeam,
    reconnect,
    isSessionUpdating: (sessionId: string) => state.updatingSessions.has(sessionId),
  };
}
