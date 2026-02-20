import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout,
  Sidebar,
  Dashboard,
  SessionList,
  SessionDetail,
  TeamList,
  TeamDetail,
  MemberList,
  MessagePanel,
} from './components';
import { useSessions, useSession, useProjects, useDashboardStats } from './hooks/useSessions';
import { useTeams, useTeam } from './hooks/useTeams';
import { useUrlState } from './hooks/useUrlState';
import { useCommandPalette } from './hooks/useCommandPalette';
import { SessionNamesProvider } from './hooks/useSessionNames';
import { TeamNamesProvider } from './hooks/useTeamNames';
import { MobileProvider, useMobile } from './contexts/MobileContext';
import { CommandPalette } from './components/CommandPalette';
import { BatchActionBar } from './components/BatchActionBar';
import { useServerEvents } from './lib/sse';
import type { Session, Team, TeamWithInboxes, Message } from './types';

function AppContent() {
  // URL state management
  const { state: urlState, navigateTo } = useUrlState();
  const { view: currentView, sessionId: selectedSessionId, teamId: selectedTeamId, projectPath: selectedProject } = urlState;

  // Mobile context
  const { isMobile } = useMobile();

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
  const { session: selectedSession } = useSession(selectedSessionId, 0, true);
  const { team: fetchedTeamData } = useTeam(selectedTeamId, 5000); // 5s polling for real-time updates

  // SSE connection state
  const { connectionState } = useServerEvents();
  const isConnected = connectionState === 'connected';

  // Update local state when data is fetched - 合并为一个 useEffect
  useEffect(() => {
    if (fetchedSessions) setSessions(fetchedSessions);
    if (fetchedProjects) setProjects(fetchedProjects);
    if (fetchedStats) setStats(fetchedStats);
    if (fetchedTeams) setTeams(fetchedTeams);
    if (fetchedTeamData) setTeamData(fetchedTeamData);
  }, [fetchedSessions, fetchedProjects, fetchedStats, fetchedTeams, fetchedTeamData]);

  // Listen to SSE events and refresh data
  useEffect(() => {
    const handleSessionChanged = (event: CustomEvent) => {
      console.log('[App] SSE sessionChanged:', event.detail);
      // Refresh current session if it matches
      if (event.detail.sessionId === selectedSessionId) {
        refetchSessions();
      }
    };

    const handleSessionListChanged = (event: CustomEvent) => {
      console.log('[App] SSE sessionListChanged:', event.detail);
      // Refresh sessions list
      refetchSessions();
      refetchStats();
    };

    const handleAgentSessionChanged = (event: CustomEvent) => {
      console.log('[App] SSE agentSessionChanged:', event.detail);
      // Refresh teams data
      refetchTeams();
    };

    window.addEventListener('sse:sessionChanged', handleSessionChanged as EventListener);
    window.addEventListener('sse:sessionListChanged', handleSessionListChanged as EventListener);
    window.addEventListener('sse:agentSessionChanged', handleAgentSessionChanged as EventListener);

    return () => {
      window.removeEventListener('sse:sessionChanged', handleSessionChanged as EventListener);
      window.removeEventListener('sse:sessionListChanged', handleSessionListChanged as EventListener);
      window.removeEventListener('sse:agentSessionChanged', handleAgentSessionChanged as EventListener);
    };
  }, [selectedSessionId, refetchSessions, refetchStats, refetchTeams]);

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
    // SSE will automatically refresh the sessions list via cache invalidation
  }, [selectedSessionId, navigateTo]);

  // Handle team deletion - clear selection if the deleted team was selected
  const handleTeamDeleted = useCallback((deletedTeamId?: string) => {
    if (deletedTeamId && selectedTeamId === deletedTeamId) {
      navigateTo({ teamId: null });
      setSelectedMemberId(null);
    }
    // SSE will automatically refresh the teams list via cache invalidation
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
      isConnected={isConnected}
      selectedProject={decodedProjectPath}
      onSelectProject={handleSelectProject}
    />
  );

  // Render middle panel based on current view
  const renderMiddlePanel = () => {
    switch (currentView) {
      case 'dashboard':
        // Mobile: Dashboard is the main view (not SessionList)
        if (isMobile) {
          return null; // Dashboard will be rendered in rightPanel for mobile
        }
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
        // Desktop: 3-column layout in middle panel
        // Mobile: TeamList only, TeamDetail goes to right panel
        if (isMobile) {
          return (
            <TeamList
              teams={teams}
              selectedId={selectedTeamId}
              onSelect={handleSelectTeam}
              onTeamDeleted={handleTeamDeleted}
              onRefresh={refetchTeams}
              isRefreshing={teamsLoading}
            />
          );
        }
        // Desktop: Show all three panels side by side
        return (
          <div className="flex h-full w-full">
            {/* TeamList: 30% width */}
            <div
              className="w-[30%] border-r"
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
            {/* MemberList: 25% width */}
            <div
              className="w-[25%] border-r"
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
            {/* MessagePanel: remaining 45% width */}
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
        // Desktop: Dashboard in right panel
        // Mobile: Dashboard is the main view (rendered here)
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
        // Desktop: null (rendered in middle panel)
        // Mobile: TeamDetail in right panel
        if (isMobile) {
          return (
            <TeamDetail
              team={teamData}
              onBack={() => navigateTo({ teamId: null })}
              onViewSession={handleViewSession}
              hideHeader={true}
            />
          );
        }
        return null;
      default:
        return null;
    }
  };

  // Mobile detail view logic
  // Dashboard is also a "detail" view on mobile (rendered in rightPanel)
  const showMobileDetail = Boolean(isMobile && (
    currentView === 'dashboard' ||
    (currentView === 'sessions' && selectedSessionId) ||
    (currentView === 'projects' && selectedSessionId) ||
    (currentView === 'teams' && selectedTeamId)
  ));

  const handleMobileDetailBack = useCallback(() => {
    if (currentView === 'dashboard') {
      navigateTo({ view: 'sessions', sessionId: null, teamId: null, projectPath: null });
    } else if (currentView === 'teams') {
      navigateTo({ teamId: null });
    } else {
      navigateTo({ sessionId: null });
    }
  }, [navigateTo, currentView]);

  const mobileDetailTitle = useMemo(() => {
    if (currentView === 'dashboard') {
      return '概览';
    }
    if (currentView === 'teams' && teamData) {
      return teamData.name;
    }
    if (selectedSession) {
      return `会话 ${selectedSession.sessionId.slice(0, 8)}`;
    }
    return '详情';
  }, [selectedSession, teamData, currentView]);

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
              showMobileDetail={showMobileDetail}
              onMobileDetailBack={handleMobileDetailBack}
              mobileDetailTitle={mobileDetailTitle}
              onViewChange={handleViewChange}
              stats={stats}
              projects={projects}
              isConnected={isConnected}
              selectedProject={decodedProjectPath}
              onSelectProject={handleSelectProject}
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

// Wrapper component to provide MobileProvider context
function App() {
  return (
    <MobileProvider>
      <AppContent />
    </MobileProvider>
  );
}

export default App;
