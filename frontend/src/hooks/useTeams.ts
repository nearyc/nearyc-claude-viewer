import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Team, TeamWithInboxes, Message, ApiResponse } from '../types';

const API_BASE = '/api';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<ApiResponse<Team[]>>(`${API_BASE}/teams`, {
        params: {
          _t: Date.now(), // Add timestamp to bypass browser cache
          ...(forceRefresh && { refresh: 'true' }), // Force backend to reload from disk
        },
      });
      if (response.data.success && response.data.data) {
        setTeams(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch teams');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams(false);
  }, [fetchTeams]);

  return { teams, loading, error, refetch: () => fetchTeams(true), setTeams };
}

export function useTeam(teamId: string | null, pollInterval: number = 0) {
  const [team, setTeam] = useState<TeamWithInboxes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async (silent = false) => {
    if (!teamId) return;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await axios.get<ApiResponse<TeamWithInboxes>>(
        `${API_BASE}/teams/${teamId}?messages=true`
      );
      if (response.data.success && response.data.data) {
        setTeam(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch team');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam(false);
  }, [fetchTeam]);

  // Optional polling as fallback when WebSocket is not working
  useEffect(() => {
    if (!teamId || pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchTeam(true);
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [teamId, pollInterval, fetchTeam]);

  return { team, loading, error, refetch: () => fetchTeam(false), setTeam };
}

export function useTeamMessages(teamId: string | null, memberId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!teamId || !memberId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<ApiResponse<Message[]>>(
        `${API_BASE}/teams/${teamId}/messages?member=${memberId}`
      );
      if (response.data.success && response.data.data) {
        setMessages(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch messages');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [teamId, memberId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loading, error, refetch: fetchMessages, setMessages };
}
