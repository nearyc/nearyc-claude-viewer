import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout,
  Sidebar,
  Dashboard,
  SessionList,
  SessionDetail,
  TeamList,
  MemberList,
  MessagePanel,
} from './components';
import { useSessions, useSession, useProjects, useDashboardStats } from './hooks/useSessions';
import { useTeams, useTeam } from './hooks/useTeams';
import { useWebSocket } from './hooks/useWebSocket';
import { useUrlState } from './hooks/useUrlState';
import { useCommandPalette } from './hooks/useCommandPalette';
import { SessionNamesProvider } from './hooks/useSessionNames';
import { TeamNamesProvider } from './hooks/useTeamNames';
import { CommandPalette } from './components/CommandPalette';
import { BatchActionBar } from './components/BatchActionBar';
import type { Session, Team, TeamWithInboxes, Message } from './types';

function App() {
  // URL state management
  const { state: urlState, navigateTo } = useUrlState();
  const { view: currentView, sessionId: selectedSessionId, teamId: selectedTeamId, projectPath: selectedProject } = urlState;

  // Local state
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Batch selection state
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isBatchExporting, setIsBatchExporting] = useState(false);

  // Data state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [teamData, setTeamData] = useState<TeamWithInboxes | null>(null);

  // Decode project path from URL
  const decodedProjectPath = selectedProject ? decodeURIComponent(selectedProject) : null;

  // Fetch data
  const { sessions: fetchedSessions, refetch: refetchSessions, loading: sessionsLoading } = useSessions();
  const { projects: fetchedProjects, refetch: refetchProjects } = useProjects();
  const { stats: fetchedStats, refetch: refetchStats } = useDashboardStats();
  const { teams: fetchedTeams, refetch: refetchTeams, loading: teamsLoading } = useTeams(5000); // 5s polling for team/member changes
  const { session: selectedSession, setSession: setSelectedSession } = useSession(
    selectedSessionId,
    0, // Disable polling - WebSocket handles real-time updates
    true
  );
  const { team: fetchedTeamData } = useTeam(selectedTeamId, 5000); // 5s polling for real-time updates

  // Update local state when data is fetched - 合并为一个 useEffect
  useEffect(() => {
    if (fetchedSessions) setSessions(fetchedSessions);
    if (fetchedProjects) setProjects(fetchedProjects);
    if (fetchedStats) setStats(fetchedStats);
    if (fetchedTeams) setTeams(fetchedTeams);
    if (fetchedTeamData) setTeamData(fetchedTeamData);
  }, [fetchedSessions, fetchedProjects, fetchedStats, fetchedTeams, fetchedTeamData]);

  // WebSocket callbacks
  const handleSessionsInit = useCallback((newSessions: Session[]) => {
    // Only use WebSocket init data if HTTP data hasn't loaded yet
    setSessions((prev) => (prev.length === 0 ? newSessions : prev));
  }, []);

  const handleSessionsUpdated = useCallback((newSessions: Session[]) => {
    setSessions(newSessions);
  }, []);

  const handleSessionData = useCallback(
    (updatedSession: Session) => {
      // Merge with existing session data to preserve full conversation
      setSelectedSession((prev) => {
        if (!prev || prev.sessionId !== updatedSession.sessionId) return prev;
        // Preserve messages if update doesn't have them (WebSocket often sends metadata only)
        const mergedMessages =
          updatedSession.messages && updatedSession.messages.length > 0
            ? updatedSession.messages
            : prev.messages;
        return { ...prev, ...updatedSession, messages: mergedMessages };
      });
      // Update sessions list (metadata only, preserve existing messages)
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === updatedSession.sessionId ? { ...s, ...updatedSession, messages: s.messages } : s
        )
      );
    },
    [setSelectedSession]
  );

  const handleSessionUpdated = useCallback((updatedSession: Session) => {
    setSessions((prev) =>
      prev.map((s) => (s.sessionId === updatedSession.sessionId ? { ...s, ...updatedSession } : s))
    );
  }, []);

  const handleProjectsInit = useCallback((newProjects: any[]) => {
    // Only use WebSocket init data if HTTP data hasn't loaded yet
    setProjects((prev) => (prev.length === 0 ? newProjects : prev));
  }, []);

  const handleProjectsUpdated = useCallback((newProjects: any[]) => {
    setProjects(newProjects);
  }, []);

  const handleStatsUpdated = useCallback((newStats: any) => {
    setStats(newStats);
  }, []);

  const handleTeamsInit = useCallback((newTeams: Team[]) => {
    setTeams(newTeams);
  }, []);

  const handleTeamsUpdated = useCallback((newTeams: Team[]) => {
    setTeams(newTeams);
  }, []);

  const handleTeamData = useCallback((data: TeamWithInboxes) => {
    setTeamData(data);
  }, []);

  const handleTeamUpdated = useCallback((updatedTeam: Team) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === updatedTeam.id ? { ...t, ...updatedTeam } : t))
    );
  }, []);

  // Handle real-time message updates from WebSocket
  const handleMessagesUpdated = useCallback((data: {
    teamId: string;
    memberId: string;
    messages: Message[];
  }) => {
    setTeamData((prev) => {
      if (!prev || prev.id !== data.teamId) return prev;
      return {
        ...prev,
        inboxes: prev.inboxes.map((inbox) =>
          inbox.memberName === data.memberId
            ? { ...inbox, messages: data.messages }
            : inbox
        ),
      };
    });
  }, []);

  // WebSocket connection
  const { connected, subscribeToSession, unsubscribeFromSession, subscribeToTeam, unsubscribeFromTeam } =
    useWebSocket({
      onSessionsInit: handleSessionsInit,
      onSessionsUpdated: handleSessionsUpdated,
      onSessionData: handleSessionData,
      onSessionUpdated: handleSessionUpdated,
      onProjectsInit: handleProjectsInit,
      onProjectsUpdated: handleProjectsUpdated,
      onStatsUpdated: handleStatsUpdated,
      onTeamsInit: handleTeamsInit,
      onTeamsUpdated: handleTeamsUpdated,
      onTeamData: handleTeamData,
      onTeamUpdated: handleTeamUpdated,
      onMessagesUpdated: handleMessagesUpdated,
    });

  // Subscribe to session when selected
  useEffect(() => {
    if (selectedSessionId) {
      subscribeToSession(selectedSessionId);
      return () => {
        unsubscribeFromSession(selectedSessionId);
      };
    }
  }, [selectedSessionId, subscribeToSession, unsubscribeFromSession]);

  // Subscribe to team when selected
  useEffect(() => {
    if (selectedTeamId) {
      subscribeToTeam(selectedTeamId);
      return () => {
        unsubscribeFromTeam(selectedTeamId);
      };
    }
  }, [selectedTeamId, subscribeToTeam, unsubscribeFromTeam]);

  // Handlers
  const handleSelectSession = useCallback((session: Session) => {
    navigateTo({ sessionId: session.sessionId });
  }, [navigateTo]);

  const handleSelectTeam = useCallback((team: Team) => {
    setSelectedMemberId(null);
    navigateTo({ teamId: team.id });
  }, [navigateTo]);

  const handleSelectMember = useCallback((memberName: string | null) => {
    setSelectedMemberId(memberName);
  }, []);

  const handleViewChange = useCallback(
    (view: typeof currentView) => {
      navigateTo({ view });
      if (view !== 'teams') {
        setSelectedMemberId(null);
      }
    },
    [navigateTo]
  );

  const handleViewSession = useCallback(
    (sessionId: string) => {
      navigateTo({ sessionId });
    },
    [navigateTo]
  );

  const handleViewTeam = useCallback(
    (teamId: string) => {
      setSelectedMemberId(null);
      navigateTo({ teamId });
    },
    [navigateTo]
  );

  const handleSelectProject = useCallback((projectPath: string | null) => {
    navigateTo({ projectPath });
  }, [navigateTo]);

  // Command palette integration
  const {
    isOpen: isCommandPaletteOpen,
    searchQuery: commandSearchQuery,
    selectedIndex: commandSelectedIndex,
    commands: commandPaletteCommands,
    setSearchQuery: setCommandSearchQuery,
    executeCommand: executePaletteCommand,
    close: closeCommandPalette,
  } = useCommandPalette({
    sessions,
    teams,
    onNavigateToDashboard: useCallback(() => navigateTo({ view: 'dashboard' }), [navigateTo]),
    onNavigateToSessions: useCallback(() => navigateTo({ view: 'sessions' }), [navigateTo]),
    onNavigateToTeams: useCallback(() => navigateTo({ view: 'teams' }), [navigateTo]),
    onNavigateToProjects: useCallback(() => navigateTo({ view: 'projects' }), [navigateTo]),
    onOpenSession: useCallback((sessionId: string) => navigateTo({ sessionId }), [navigateTo]),
    onOpenTeam: useCallback((teamId: string) => navigateTo({ teamId }), [navigateTo]),
    onRefreshData: useCallback(() => {
      refetchSessions();
      refetchTeams();
      refetchStats();
    }, [refetchSessions, refetchTeams, refetchStats]),
  });

  const handleMarkAllRead = useCallback(async (memberId: string) => {
    // This is a placeholder - in a real implementation, you would call an API
    console.log('Mark all read for member:', memberId);
  }, []);

  // Handle session deletion - clear selection if the deleted session was selected
  const handleSessionDeleted = useCallback((deletedSessionId?: string) => {
    if (deletedSessionId && selectedSessionId === deletedSessionId) {
      navigateTo({ sessionId: null });
    }
    // WebSocket will automatically refresh the sessions list
  }, [selectedSessionId, navigateTo]);

  // Handle team deletion - clear selection if the deleted team was selected
  const handleTeamDeleted = useCallback((deletedTeamId?: string) => {
    if (deletedTeamId && selectedTeamId === deletedTeamId) {
      navigateTo({ teamId: null });
      setSelectedMemberId(null);
    }
    // WebSocket will automatically refresh the teams list
  }, [selectedTeamId, navigateTo]);

  // Batch operations
  const handleBatchDelete = useCallback(async () => {
    if (selectedSessionIds.size === 0) return;

    const confirmed = window.confirm(
      `确定要删除选中的 ${selectedSessionIds.size} 个会话吗？此操作不可恢复。`
    );
    if (!confirmed) return;

    setIsBatchDeleting(true);
    try {
      const { deleteSession } = await import('./api/delete');
      const deletePromises = Array.from(selectedSessionIds).map((sessionId) =>
        deleteSession(sessionId)
      );
      await Promise.all(deletePromises);

      // Clear selection and refresh
      setSelectedSessionIds(new Set());
      refetchSessions();
    } catch (error) {
      console.error('Failed to delete sessions:', error);
      alert('批量删除失败，请重试');
    } finally {
      setIsBatchDeleting(false);
    }
  }, [selectedSessionIds, refetchSessions]);

  const handleBatchExport = useCallback(async () => {
    if (selectedSessionIds.size === 0) return;

    setIsBatchExporting(true);
    try {
      const selectedSessionsData = sessions.filter((s) =>
        selectedSessionIds.has(s.sessionId)
      );

      const exportData = {
        exportDate: new Date().toISOString(),
        totalSessions: selectedSessionsData.length,
        sessions: selectedSessionsData,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export sessions:', error);
      alert('导出失败，请重试');
    } finally {
      setIsBatchExporting(false);
    }
  }, [selectedSessionIds, sessions]);

  // Filter sessions by selected project
  const filteredSessions = decodedProjectPath
    ? sessions.filter((s) => s.project === decodedProjectPath)
    : sessions;

  const handleSelectAllSessions = useCallback(() => {
    const allIds = new Set(filteredSessions.map((s) => s.sessionId));
    setSelectedSessionIds(allIds);
  }, [filteredSessions]);

  const handleClearSessionSelection = useCallback(() => {
    setSelectedSessionIds(new Set());
  }, []);

  // Calculate message counts for members
  const messageCounts = teamData?.inboxes
    ? Object.fromEntries(
        teamData.inboxes.map((inbox) => [inbox.memberName, inbox.messages.length])
      )
    : {};

  // Calculate member colors
  const memberColors = teamData?.members
    ? Object.fromEntries(
        teamData.members.map((m) => {
          const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
            '#06b6d4', '#ef4444', '#6366f1', '#84cc16', '#f97316'
          ];
          let hash = 0;
          for (let i = 0; i < m.name.length; i++) {
            hash = m.name.charCodeAt(i) + ((hash << 5) - hash);
          }
          return [m.name, colors[Math.abs(hash) % colors.length]];
        })
      )
    : {};

  // Render left panel (Sidebar)
  const renderLeftPanel = () => (
    <Sidebar
      currentView={currentView}
      onViewChange={handleViewChange}
      stats={stats}
      projects={projects}
      isConnected={connected}
      selectedProject={decodedProjectPath}
      onSelectProject={handleSelectProject}
    />
  );

  // Render middle panel based on current view
  const renderMiddlePanel = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <SessionList
            sessions={stats?.recentSessions || sessions.slice(0, 10)}
            selectedId={selectedSessionId}
            onSelect={handleSelectSession}
            onSessionDeleted={handleSessionDeleted}
            onRefresh={refetchSessions}
            isRefreshing={sessionsLoading}
          />
        );
      case 'sessions':
        return (
          <SessionList
            sessions={filteredSessions}
            selectedId={selectedSessionId}
            onSelect={handleSelectSession}
            projectFilter={selectedProject}
            onSessionDeleted={handleSessionDeleted}
            onRefresh={refetchSessions}
            isRefreshing={sessionsLoading}
            selectedSessionIds={selectedSessionIds}
            onSelectionChange={setSelectedSessionIds}
            enableBatchSelection={true}
          />
        );
      case 'projects':
        return (
          <SessionList
            sessions={filteredSessions}
            selectedId={selectedSessionId}
            onSelect={handleSelectSession}
            projectFilter={decodedProjectPath}
            onSessionDeleted={handleSessionDeleted}
            onRefresh={refetchSessions}
            isRefreshing={sessionsLoading}
            selectedSessionIds={selectedSessionIds}
            onSelectionChange={setSelectedSessionIds}
            enableBatchSelection={true}
          />
        );
      case 'teams':
        return (
          <div className="flex h-full w-full">
            {/* TeamList: 25% width */}
            <div
              className="w-[25%] border-r"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <TeamList
                teams={teams}
                selectedId={selectedTeamId}
                onSelect={handleSelectTeam}
                onTeamDeleted={handleTeamDeleted}
                onRefresh={refetchTeams}
                isRefreshing={teamsLoading}
              />
            </div>
            {/* MemberList: 20% width */}
            <div
              className="w-[20%] border-r"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <MemberList
                members={teamData?.members || []}
                selectedMember={selectedMemberId}
                onSelectMember={handleSelectMember}
                messageCounts={messageCounts}
                inboxes={teamData?.inboxes}
              />
            </div>
            {/* MessagePanel: remaining 55% width */}
            <div className="flex-1">
              <MessagePanel
                team={teamData}
                selectedMember={selectedMemberId}
                onViewSession={handleViewSession}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render right panel based on current view
  const renderRightPanel = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            onViewSession={handleViewSession}
            onViewTeam={handleViewTeam}
            onViewChange={handleViewChange}
          />
        );
      case 'sessions':
      case 'projects':
        return <SessionDetail session={selectedSession} />;
      case 'teams':
        // MessagePanel is now rendered in middlePanel for teams view
        return null;
      default:
        return null;
    }
  };

  return (
    <SessionNamesProvider>
      <TeamNamesProvider>
        <div
          className="h-screen w-screen"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <Layout
            leftPanel={renderLeftPanel()}
            middlePanel={renderMiddlePanel()}
            rightPanel={renderRightPanel()}
            currentView={currentView}
          />
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            searchQuery={commandSearchQuery}
            selectedIndex={commandSelectedIndex}
            commands={commandPaletteCommands}
            onSearchChange={setCommandSearchQuery}
            onSelectCommand={executePaletteCommand}
            onClose={closeCommandPalette}
          />

          {/* Batch Action Bar */}
          {(currentView === 'sessions' || currentView === 'projects') && (
            <BatchActionBar
              selectedSessions={sessions.filter((s) => selectedSessionIds.has(s.sessionId))}
              onClearSelection={handleClearSessionSelection}
              onSelectAll={handleSelectAllSessions}
              onDeleteSelected={handleBatchDelete}
              onExportSelected={handleBatchExport}
              isDeleting={isBatchDeleting}
              isExporting={isBatchExporting}
            />
          )}
        </div>
      </TeamNamesProvider>
    </SessionNamesProvider>
  );
}

export default App;
