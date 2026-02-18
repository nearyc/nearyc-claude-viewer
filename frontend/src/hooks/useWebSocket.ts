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
const WS_URL = '';

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

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setState(prev => ({ ...prev, connected: true, error: null }));
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setState(prev => ({ ...prev, connected: false, error: null }));
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err);
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
      addTimeout(() => {
        setState(prev => {
          const newSet = new Set(prev.updatingSessions);
          newSet.delete(data.session.sessionId);
          return { ...prev, updatingSessions: newSet };
        });
      }, 2000);
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
  }, [addTimeout]);

  const disconnect = useCallback(() => {
    clearAllTimeouts();
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, [clearAllTimeouts]);

  const subscribeToSession = useCallback((sessionId: string) => {
    socketRef.current?.emit('session:subscribe', sessionId);
  }, []);

  const unsubscribeFromSession = useCallback((sessionId: string) => {
    socketRef.current?.emit('session:unsubscribe', sessionId);
  }, []);

  const subscribeToProject = useCallback((projectName: string) => {
    // Project subscription not implemented in backend yet
    console.log('[WebSocket] Project subscription requested:', projectName);
  }, []);

  const unsubscribeFromProject = useCallback((projectName: string) => {
    // Project unsubscription not implemented in backend yet
    console.log('[WebSocket] Project unsubscription requested:', projectName);
  }, []);

  const subscribeToTeam = useCallback((teamId: string) => {
    socketRef.current?.emit('team:subscribe', teamId);
  }, []);

  const unsubscribeFromTeam = useCallback((teamId: string) => {
    socketRef.current?.emit('team:unsubscribe', teamId);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    socket: socketRef.current,
    subscribeToSession,
    unsubscribeFromSession,
    subscribeToProject,
    unsubscribeFromProject,
    subscribeToTeam,
    unsubscribeFromTeam,
    reconnect: connect,
    isSessionUpdating: (sessionId: string) => state.updatingSessions.has(sessionId),
  };
}
