import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Session, Team } from '../types';

export type CommandType =
  | 'navigate-dashboard'
  | 'navigate-sessions'
  | 'navigate-teams'
  | 'navigate-projects'
  | 'open-session'
  | 'open-team'
  | 'refresh-data';

export interface Command {
  id: string;
  type: CommandType;
  title: string;
  subtitle?: string;
  icon?: string;
  shortcut?: string;
  data?: unknown;
}

export interface CommandPaletteState {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  commands: Command[];
}

interface UseCommandPaletteOptions {
  sessions: Session[];
  teams: Team[];
  onNavigateToDashboard: () => void;
  onNavigateToSessions: () => void;
  onNavigateToTeams: () => void;
  onNavigateToProjects: () => void;
  onOpenSession: (sessionId: string) => void;
  onOpenTeam: (teamId: string) => void;
  onRefreshData?: () => void;
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const {
    sessions,
    teams,
    onNavigateToDashboard,
    onNavigateToSessions,
    onNavigateToTeams,
    onNavigateToProjects,
    onOpenSession,
    onOpenTeam,
    onRefreshData,
  } = options;

  const [state, setState] = useState<CommandPaletteState>({
    isOpen: false,
    searchQuery: '',
    selectedIndex: 0,
    commands: [],
  });

  // Generate all available commands
  const allCommands = useMemo<Command[]>(() => {
    const commands: Command[] = [
      {
        id: 'navigate-dashboard',
        type: 'navigate-dashboard',
        title: 'Go to Dashboard',
        subtitle: 'View overview and recent activity',
        shortcut: 'G D',
      },
      {
        id: 'navigate-sessions',
        type: 'navigate-sessions',
        title: 'Go to Sessions',
        subtitle: 'Browse all sessions',
        shortcut: 'G S',
      },
      {
        id: 'navigate-teams',
        type: 'navigate-teams',
        title: 'Go to Teams',
        subtitle: 'View agent teams',
        shortcut: 'G T',
      },
      {
        id: 'navigate-projects',
        type: 'navigate-projects',
        title: 'Go to Projects',
        subtitle: 'Browse by project',
        shortcut: 'G P',
      },
    ];

    // Add session commands
    if (sessions.length > 0) {
      commands.push(
        ...sessions.slice(0, 20).map((session) => ({
          id: `open-session-${session.sessionId}`,
          type: 'open-session' as const,
          title: session.inputs[0]?.display?.slice(0, 50) || 'Untitled Session',
          subtitle: `Session in ${session.project}`,
          data: session.sessionId,
        }))
      );
    }

    // Add team commands
    if (teams.length > 0) {
      commands.push(
        ...teams.map((team) => ({
          id: `open-team-${team.id}`,
          type: 'open-team' as const,
          title: team.name,
          subtitle: `Team with ${team.memberCount} members`,
          data: team.id,
        }))
      );
    }

    // Add refresh command
    if (onRefreshData) {
      commands.push({
        id: 'refresh-data',
        type: 'refresh-data',
        title: 'Refresh Data',
        subtitle: 'Reload all data from server',
        shortcut: 'R',
      });
    }

    return commands;
  }, [sessions, teams, onRefreshData]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!state.searchQuery.trim()) {
      return allCommands;
    }

    const query = state.searchQuery.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query) ||
        cmd.subtitle?.toLowerCase().includes(query) ||
        cmd.shortcut?.toLowerCase().includes(query)
    );
  }, [allCommands, state.searchQuery]);

  // Use filteredCommands directly instead of syncing to state to avoid infinite loop
  // The commands are computed from allCommands and searchQuery, no need to store in state

  const open = useCallback(() => {
    setState({
      isOpen: true,
      searchQuery: '',
      selectedIndex: 0,
      commands: [],
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      if (prev.isOpen) {
        return { ...prev, isOpen: false };
      }
      return {
        isOpen: true,
        searchQuery: '',
        selectedIndex: 0,
        commands: [],
      };
    });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query, selectedIndex: 0 }));
  }, []);

  const selectNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIndex: (prev.selectedIndex + 1) % filteredCommands.length,
    }));
  }, [filteredCommands]);

  const selectPrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIndex:
        prev.selectedIndex <= 0 ? filteredCommands.length - 1 : prev.selectedIndex - 1,
    }));
  }, [filteredCommands]);

  const executeCommand = useCallback(
    (command?: Command) => {
      const cmd = command || filteredCommands[state.selectedIndex];
      if (!cmd) return;

      switch (cmd.type) {
        case 'navigate-dashboard':
          onNavigateToDashboard();
          break;
        case 'navigate-sessions':
          onNavigateToSessions();
          break;
        case 'navigate-teams':
          onNavigateToTeams();
          break;
        case 'navigate-projects':
          onNavigateToProjects();
          break;
        case 'open-session':
          if (typeof cmd.data === 'string') {
            onOpenSession(cmd.data);
          }
          break;
        case 'open-team':
          if (typeof cmd.data === 'string') {
            onOpenTeam(cmd.data);
          }
          break;
        case 'refresh-data':
          onRefreshData?.();
          break;
      }

      close();
    },
    [
      filteredCommands,
      state.selectedIndex,
      onNavigateToDashboard,
      onNavigateToSessions,
      onNavigateToTeams,
      onNavigateToProjects,
      onOpenSession,
      onOpenTeam,
      onRefreshData,
      close,
    ]
  );

  // Keyboard shortcut handler (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
        return;
      }

      if (!state.isOpen) return;

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNext();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrevious();
        return;
      }

      // Enter to execute
      if (e.key === 'Enter') {
        e.preventDefault();
        executeCommand();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isOpen, toggle, close, selectNext, selectPrevious, executeCommand]);

  return {
    isOpen: state.isOpen,
    searchQuery: state.searchQuery,
    selectedIndex: state.selectedIndex,
    commands: filteredCommands,
    open,
    close,
    toggle,
    setSearchQuery,
    selectNext,
    selectPrevious,
    executeCommand,
  };
}

export default useCommandPalette;
