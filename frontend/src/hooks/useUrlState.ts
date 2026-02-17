import { useState, useEffect, useCallback, useRef } from 'react';
import type { ViewType } from '../types';

export interface UrlState {
  view: ViewType;
  sessionId: string | null;
  teamId: string | null;
  projectPath: string | null;
}

interface ParsedHash {
  view: ViewType;
  id: string | null;
  path: string | null;
}

const parseHash = (hash: string): ParsedHash => {
  // Remove leading #/
  const cleanHash = hash.replace(/^#\/?/, '');

  if (!cleanHash) {
    return { view: 'dashboard', id: null, path: null };
  }

  const parts = cleanHash.split('/').filter(Boolean);

  if (parts.length === 0) {
    return { view: 'dashboard', id: null, path: null };
  }

  const [resource, identifier] = parts;

  switch (resource) {
    case 'sessions':
      return {
        view: 'sessions',
        id: identifier || null,
        path: null,
      };
    case 'teams':
      return {
        view: 'teams',
        id: identifier || null,
        path: null,
      };
    case 'projects':
      return {
        view: 'projects',
        id: null,
        path: identifier || null,
      };
    case 'dashboard':
      return {
        view: 'dashboard',
        id: null,
        path: null,
      };
    default:
      return { view: 'dashboard', id: null, path: null };
  }
};

const buildHash = (view: ViewType, id: string | null, projectPath: string | null): string => {
  switch (view) {
    case 'sessions':
      return id ? `#/sessions/${id}` : '#/sessions';
    case 'teams':
      return id ? `#/teams/${id}` : '#/teams';
    case 'projects':
      return projectPath ? `#/projects/${encodeURIComponent(projectPath)}` : '#/projects';
    case 'dashboard':
    default:
      return '#/dashboard';
  }
};

export function useUrlState() {
  const [state, setState] = useState<UrlState>(() => {
    const parsed = parseHash(window.location.hash);
    return {
      view: parsed.view,
      sessionId: parsed.view === 'sessions' ? parsed.id : null,
      teamId: parsed.view === 'teams' ? parsed.id : null,
      projectPath: parsed.view === 'projects' ? parsed.path : null,
    };
  });

  const isUpdatingFromHash = useRef(false);
  const pendingUpdate = useRef<Partial<UrlState> | null>(null);

  // Sync state from URL hash changes (e.g., browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      isUpdatingFromHash.current = true;
      const parsed = parseHash(window.location.hash);

      setState({
        view: parsed.view,
        sessionId: parsed.view === 'sessions' ? parsed.id : null,
        teamId: parsed.view === 'teams' ? parsed.id : null,
        projectPath: parsed.view === 'projects' ? parsed.path : null,
      });

      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromHash.current = false;
      }, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL hash when state changes (but not when change came from hash)
  useEffect(() => {
    if (isUpdatingFromHash.current) return;

    const newHash = buildHash(state.view, state.sessionId || state.teamId, state.projectPath);

    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  }, [state]);

  const navigateTo = useCallback((updates: Partial<UrlState>) => {
    setState((prev) => {
      const newState = { ...prev };

      if (updates.view !== undefined) {
        newState.view = updates.view;
        // Clear irrelevant IDs when switching views
        if (updates.view !== 'sessions') {
          newState.sessionId = null;
        }
        if (updates.view !== 'teams') {
          newState.teamId = null;
        }
        if (updates.view !== 'projects') {
          newState.projectPath = null;
        }
      }

      if (updates.sessionId !== undefined) {
        newState.sessionId = updates.sessionId;
        if (updates.sessionId) {
          newState.view = 'sessions';
        }
      }

      if (updates.teamId !== undefined) {
        newState.teamId = updates.teamId;
        if (updates.teamId) {
          newState.view = 'teams';
        }
      }

      if (updates.projectPath !== undefined) {
        newState.projectPath = updates.projectPath;
        if (updates.projectPath) {
          newState.view = 'projects';
        }
      }

      return newState;
    });
  }, []);

  const navigateToDashboard = useCallback(() => {
    navigateTo({ view: 'dashboard', sessionId: null, teamId: null, projectPath: null });
  }, [navigateTo]);

  const navigateToSessions = useCallback((sessionId?: string) => {
    navigateTo({
      view: 'sessions',
      sessionId: sessionId || null,
      teamId: null,
      projectPath: null,
    });
  }, [navigateTo]);

  const navigateToTeams = useCallback((teamId?: string) => {
    navigateTo({
      view: 'teams',
      sessionId: null,
      teamId: teamId || null,
      projectPath: null,
    });
  }, [navigateTo]);

  const navigateToProjects = useCallback((projectPath?: string) => {
    navigateTo({
      view: 'projects',
      sessionId: null,
      teamId: null,
      projectPath: projectPath || null,
    });
  }, [navigateTo]);

  return {
    state,
    navigateTo,
    navigateToDashboard,
    navigateToSessions,
    navigateToTeams,
    navigateToProjects,
  };
}

export default useUrlState;
