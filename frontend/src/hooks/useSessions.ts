import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Session, Project, DashboardStats, ApiResponse, Team } from '../types';

const API_BASE = '/api';

// Default polling interval: 10 seconds
const DEFAULT_POLL_INTERVAL_MS = 10000;

export function useSessions(pollInterval: number = DEFAULT_POLL_INTERVAL_MS) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async (forceRefresh = false, silent = false) => {
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
      });
      if (response.data.success && response.data.data) {
        setSessions(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch sessions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSessions(false);
  }, [fetchSessions]);

  // Polling for sessions list updates
  useEffect(() => {
    if (pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchSessions(true, true); // force refresh, silent mode
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [pollInterval, fetchSessions]);

  return { sessions, loading, error, refetch: () => fetchSessions(true), setSessions };
}

export function useSession(sessionId: string | null, pollInterval: number = 0, fullConversation: boolean = true) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async (silent = false) => {
    if (!sessionId) return;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const url = fullConversation
        ? `${API_BASE}/sessions/${sessionId}?full=true`
        : `${API_BASE}/sessions/${sessionId}`;
      const response = await axios.get<ApiResponse<Session>>(url);
      if (response.data.success && response.data.data) {
        setSession(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [sessionId, fullConversation]);

  useEffect(() => {
    fetchSession(false);
  }, [fetchSession]);

  // Optional polling as fallback when WebSocket is not working
  useEffect(() => {
    if (!sessionId || pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchSession(true);
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [sessionId, pollInterval, fetchSession]);

  return { session, loading, error, refetch: () => fetchSession(false), setSession };
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
