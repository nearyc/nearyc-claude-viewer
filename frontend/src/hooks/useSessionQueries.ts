import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Session, Project, DashboardStats, ApiResponse, Team, ChatMessage } from '../types';
import { indexedDBStorage } from '../db/sessions';
import { useCache } from '../hooks/useCache';

const API_BASE = '/api';

// Custom hook for managing sessions with multiple cache layers
export const useSessionsQuery = () => {
  const queryClient = useQueryClient();
  const cache = useCache();

  // Main query for sessions with cache hierarchy: memory -> indexedDB -> API
  return useQuery<Session[], Error>({
    queryKey: ['sessions'],
    queryFn: async (): Promise<Session[]> => {
      // Try memory cache first
      const cachedInMemory = cache.get<Session[]>('sessions');
      if (cachedInMemory) {
        console.log('Returning sessions from memory cache');
        return cachedInMemory;
      }

      // Try IndexedDB cache
      try {
        const sessionsFromDB = await indexedDBStorage.getSessions();
        if (sessionsFromDB.length > 0) {
          console.log('Returning sessions from IndexedDB cache');
          // Store in memory cache as well
          cache.set('sessions', sessionsFromDB, 5 * 60 * 1000); // 5 minutes
          return sessionsFromDB;
        }
      } catch (error) {
        console.warn('IndexedDB not available or error reading sessions:', error);
      }

      // Finally, fetch from API
      console.log('Fetching sessions from API');
      const response = await axios.get<ApiResponse<Session[]>>(`${API_BASE}/sessions`, {
        params: {
          _t: Date.now(), // Add timestamp to bypass browser cache
        },
      });

      if (response.data.success && response.data.data) {
        // Update caches
        cache.set('sessions', response.data.data, 5 * 60 * 1000); // 5 minutes
        try {
          await indexedDBStorage.saveSessions(response.data.data.map(s => ({...s, id: s.sessionId})));
        } catch (error) {
          console.warn('Error saving to IndexedDB:', error);
        }
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch sessions');
      }
    },
    staleTime: 30000, // 30 seconds before becoming stale
    gcTime: 300000,   // 5 minutes before garbage collection
  });
};

// Query for individual session
export const useSessionQuery = (sessionId: string | null, options?: { limit?: number; full?: boolean }) => {
  const queryClient = useQueryClient();
  const cache = useCache();

  return useQuery<Session, Error>({
    queryKey: ['session', sessionId, options?.limit],
    queryFn: async (): Promise<Session> => {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      // Try memory cache first (only when no limit is specified)
      if (!options?.limit) {
        const cachedInMemory = cache.get<Session>(`session-${sessionId}`);
        if (cachedInMemory) {
          console.log(`Returning session ${sessionId} from memory cache`);
          return cachedInMemory;
        }
      }

      // Try IndexedDB cache (only when no limit is specified)
      if (!options?.limit) {
        try {
          const allSessions = await indexedDBStorage.getSessions();
          const sessionFromDB = allSessions.find(s => s.sessionId === sessionId);
          if (sessionFromDB) {
            console.log(`Returning session ${sessionId} from IndexedDB cache`);
            // Store in memory cache as well
            cache.set(`session-${sessionId}`, sessionFromDB, 5 * 60 * 1000); // 5 minutes
            return sessionFromDB;
          }
        } catch (error) {
          console.warn('IndexedDB not available or error reading session:', error);
        }
      }

      // Build query params
      const params: Record<string, string | number> = {};
      if (options?.full !== false) {
        params.full = 'true';
      }
      if (options?.limit) {
        params.limit = options.limit;
      }

      // Fetch from API
      console.log(`Fetching session ${sessionId} from API`, params);
      const response = await axios.get<ApiResponse<Session>>(
        `${API_BASE}/sessions/${sessionId}`,
        { params }
      );

      if (response.data.success && response.data.data) {
        // Update caches (only when no limit is specified)
        if (!options?.limit) {
          cache.set(`session-${sessionId}`, response.data.data, 5 * 60 * 1000); // 5 minutes
        }
        return response.data.data;
      } else {
        throw new Error(response.data.error || `Failed to fetch session ${sessionId}`);
      }
    },
    enabled: !!sessionId, // Only run query if sessionId is provided
    staleTime: 60000, // 1 minute before becoming stale
  });
};

// Query for projects
export const useProjectsQuery = () => {
  const queryClient = useQueryClient();
  const cache = useCache();

  return useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      // Try memory cache first
      const cachedInMemory = cache.get<Project[]>('projects');
      if (cachedInMemory) {
        console.log('Returning projects from memory cache');
        return cachedInMemory;
      }

      // Try IndexedDB cache
      try {
        const projectsFromDB = await indexedDBStorage.getProjects();
        if (projectsFromDB.length > 0) {
          console.log('Returning projects from IndexedDB cache');
          // Store in memory cache as well
          cache.set('projects', projectsFromDB, 10 * 60 * 1000); // 10 minutes
          return projectsFromDB;
        }
      } catch (error) {
        console.warn('IndexedDB not available or error reading projects:', error);
      }

      // Finally, fetch from API
      console.log('Fetching projects from API');
      const response = await axios.get<ApiResponse<Project[]>>(`${API_BASE}/projects`);

      if (response.data.success && response.data.data) {
        // Update caches
        cache.set('projects', response.data.data, 10 * 60 * 1000); // 10 minutes
        try {
          await indexedDBStorage.saveProjects(response.data.data.map(p => ({...p, id: p.path})));
        } catch (error) {
          console.warn('Error saving projects to IndexedDB:', error);
        }
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch projects');
      }
    },
    staleTime: 60000, // 1 minute before becoming stale
  });
};

// Mutation to delete a session
export const useDeleteSessionMutation = () => {
  const queryClient = useQueryClient();
  const cache = useCache();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await axios.delete<ApiResponse<boolean>>(`${API_BASE}/sessions/${sessionId}`);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete session');
      }
      return response.data.data;
    },
    onSuccess: (_, sessionId) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });

      // Also clear related cache entries
      cache.remove(`session-${sessionId}`);
    },
  });
};

// Query for dashboard stats
export const useDashboardStatsQuery = () => {
  const cache = useCache();

  return useQuery<DashboardStats, Error>({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Try memory cache first
      const cachedInMemory = cache.get<DashboardStats>('dashboard-stats');
      if (cachedInMemory) {
        console.log('Returning dashboard stats from memory cache');
        return cachedInMemory;
      }

      // Fetch from API
      console.log('Fetching dashboard stats from API');
      const [sessionsRes, teamsRes] = await Promise.all([
        axios.get<ApiResponse<Session[]>>(`${API_BASE}/sessions`),
        axios.get<ApiResponse<Team[]>>(`${API_BASE}/teams`),
      ]);

      if (sessionsRes.data.success && teamsRes.data.success && sessionsRes.data.data && teamsRes.data.data) {
        const sessions = sessionsRes.data.data;
        const teams = teamsRes.data.data;

        const totalInputs = sessions.reduce((sum, s) => sum + s.inputCount, 0);
        const totalMembers = teams.reduce((sum, t) => sum + (t.memberCount || 0), 0);

        const calculatedStats: DashboardStats = {
          totalSessions: sessions.length,
          totalProjects: new Set(sessions.map(s => s.project)).size,
          totalInputs,
          totalTeams: teams.length,
          totalMembers,
          recentSessions: sessions.slice(0, 10).sort((a, b) => b.updatedAt - a.updatedAt),
          recentTeams: teams.slice(0, 5),
          allSessions: sessions, // Include all sessions for activity charts
        };

        // Update cache
        cache.set('dashboard-stats', calculatedStats, 30 * 1000); // 30 seconds

        return calculatedStats;
      } else {
        throw new Error('Failed to fetch dashboard stats');
      }
    },
    staleTime: 30000, // 30 seconds before becoming stale
  });
};

// Mutation to load more messages for a session
export const useLoadMoreMessagesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; offset: number }) => {
      const response = await axios.get<ApiResponse<{
        messages: ChatMessage[];
        totalCount: number;
      }>>(`${API_BASE}/sessions/${params.sessionId}/messages?offset=${params.offset}&limit=all`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load messages');
      }
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // Update cache, append messages
      queryClient.setQueryData(['session', variables.sessionId, 50], (old: Session | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, ...data.messages],
          hasMore: false,  // All messages loaded
        };
      });
    },
  });
};