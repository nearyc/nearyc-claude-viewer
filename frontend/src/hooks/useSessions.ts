import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { Session, Project, DashboardStats, ApiResponse, Team } from '../types';

const API_BASE = '/api';

// Default polling interval: 10 seconds
const DEFAULT_POLL_INTERVAL_MS = 10000;

export function useSessions(pollInterval: number = DEFAULT_POLL_INTERVAL_MS) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Request ID to prevent race conditions
  const requestIdRef = useRef<number>(0);

  const fetchSessions = useCallback(async (forceRefresh = false, silent = false) => {
    // Only cancel previous request if it's a user-initiated action (not silent/polling)
    // This prevents polling from interrupting in-flight requests
    if (!silent && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Increment request ID for this request
    const currentRequestId = ++requestIdRef.current;

    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await axios.get<ApiResponse<Session[]>>(`${API_BASE}/sessions`, {
        params: {
          _t: Date.now(), // Add timestamp to bypass browser cache
          ...(forceRefresh && { refresh: 'true' }), // Force backend to reload from disk
        },
        signal: abortController.signal,
      });

      // Check if this is still the latest request (prevent race condition)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (response.data.success && response.data.data) {
        setSessions(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch sessions');
      }
    } catch (err) {
      // Ignore canceled request errors
      if (axios.isCancel(err)) {
        return;
      }

      // Check if this is still the latest request (prevent race condition)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      // Check if this is still the latest request before updating loading state
      if (currentRequestId === requestIdRef.current && !silent) {
        setLoading(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSessions(false);

    // Cleanup: cancel in-flight request and increment request ID
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      requestIdRef.current++;
    };
  }, [fetchSessions]);

  // Polling for sessions list updates
  useEffect(() => {
    if (pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      // Use cache (forceRefresh=false) for polling to avoid backend file scanning
      // Only use forceRefresh=true for user-initiated actions
      fetchSessions(false, true); // use cache, silent mode
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [pollInterval, fetchSessions]);

  return { sessions, loading, error, refetch: () => fetchSessions(true), setSessions };
}

export function useSession(
  sessionId: string | null,
  pollInterval: number = 0,
  fullConversation: boolean = true,
  initialMessageLimit: number = 100 // Load last 100 messages initially
) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Track if user has loaded full conversation - persists across updates
  const isFullConversationLoadedRef = useRef(false);

  // AbortController for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Request ID to prevent race conditions
  const requestIdRef = useRef<number>(0);

  const fetchSession = useCallback(
    async (silent = false, loadFull = false) => {
      if (!sessionId) return;

      // Only cancel previous request if it's a user-initiated action (not silent/polling)
      if (!silent && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Increment request ID for this request
      const currentRequestId = ++requestIdRef.current;

      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        let url: string;
        if (fullConversation) {
          // If user has already loaded full conversation, or loadFull is explicitly requested,
          // fetch all messages without limit
          const shouldLoadFull = loadFull || isFullConversationLoadedRef.current;
          const limit = shouldLoadFull ? 0 : initialMessageLimit;
          url =
            limit > 0
              ? `${API_BASE}/sessions/${sessionId}?full=true&limit=${limit}`
              : `${API_BASE}/sessions/${sessionId}?full=true`;
        } else {
          url = `${API_BASE}/sessions/${sessionId}`;
        }
        const response = await axios.get<ApiResponse<Session>>(url, {
          signal: abortController.signal,
        });

        // Check if this is still the latest request (prevent race condition)
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (response.data.success && response.data.data) {
          setSession(response.data.data);
          setHasMoreMessages(response.data.data.hasMoreMessages || false);
        } else {
          setError(response.data.error || 'Failed to fetch session');
        }
      } catch (err) {
        // Ignore canceled request errors
        if (axios.isCancel(err)) {
          return;
        }

        // Check if this is still the latest request (prevent race condition)
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to fetch session');
      } finally {
        // Check if this is still the latest request before updating loading state
        if (currentRequestId === requestIdRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [sessionId, fullConversation, initialMessageLimit]
  );

  // Load full conversation (all messages)
  const loadFullConversation = useCallback(async () => {
    isFullConversationLoadedRef.current = true;
    await fetchSession(false, true);
  }, [fetchSession]);

  useEffect(() => {
    // Reset full conversation flag when session changes
    isFullConversationLoadedRef.current = false;
    fetchSession(false);

    // Cleanup: cancel in-flight request and increment request ID
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      requestIdRef.current++;
    };
  }, [fetchSession]);

  // Optional polling as fallback when WebSocket is not working
  useEffect(() => {
    if (!sessionId || pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchSession(true);
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [sessionId, pollInterval, fetchSession]);

  return {
    session,
    loading,
    error,
    hasMoreMessages,
    refetch: () => fetchSession(false),
    setSession,
    loadFullConversation,
  };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<ApiResponse<Project[]>>(`${API_BASE}/projects`);
      if (response.data.success && response.data.data) {
        setProjects(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects, setProjects };
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Calculate stats from sessions and teams endpoints
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

        setStats(calculatedStats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats, setStats };
}
