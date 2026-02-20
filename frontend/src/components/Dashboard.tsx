import React, { useState } from 'react';
import {
  MessageSquare,
  FolderGit2,
  List,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { formatRelativeTime } from '../utils/time';
import type { DashboardStats, Session, Team } from '../types';
import { isSystemContent } from '../types';
import { ActivityHeatmap } from './ActivityHeatmap';
import { TrendChart } from './TrendChart';
import { ActivityTimeline } from './ActivityTimeline';
import { useTranslation } from '../hooks/useTranslation';
import { useIsMobile } from '../hooks/useMediaQuery';

interface DashboardProps {
  stats: DashboardStats | null;
  onViewSession: (sessionId: string) => void;
  onViewTeam: (teamId: string) => void;
  onViewChange?: (view: 'dashboard' | 'sessions' | 'projects' | 'teams') => void;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  isMobile?: boolean;
}

const COLOR_STYLES = {
  blue: {
    bg: 'rgba(59, 130, 246, 0.1)',
    text: 'var(--accent-blue)',
    border: 'rgba(59, 130, 246, 0.2)',
  },
  green: {
    bg: 'rgba(16, 185, 129, 0.1)',
    text: 'var(--accent-green)',
    border: 'rgba(16, 185, 129, 0.2)',
  },
  purple: {
    bg: 'rgba(139, 92, 246, 0.1)',
    text: 'var(--accent-purple)',
    border: 'rgba(139, 92, 246, 0.2)',
  },
  orange: {
    bg: 'rgba(245, 158, 11, 0.1)',
    text: 'var(--accent-amber)',
    border: 'rgba(245, 158, 11, 0.2)',
  },
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, isMobile }) => {
  const styles = COLOR_STYLES[color];

  return (
    <div
      className="p-3 md:p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <div className={`flex items-start ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
        <div className={isMobile ? 'order-2' : ''}>
          <p className="text-xs md:text-sm mb-0.5 md:mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className={`rounded-lg border ${isMobile ? 'p-1.5 order-1' : 'p-2'}`}
          style={{
            backgroundColor: styles.bg,
            color: styles.text,
            borderColor: styles.border,
          }}
        >
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: isMobile ? 'w-4 h-4' : 'w-5 h-5' })}
        </div>
      </div>
    </div>
  );
};

interface SessionListItemProps {
  session: Session;
  onClick: () => void;
}

const SessionListItem: React.FC<SessionListItemProps> = ({ session, onClick }) => {
  const { t } = useTranslation();

  // Find the first non-system input
  const validInput = session.inputs.find(input => !isSystemContent(input.display));
  const title = validInput
    ? validInput.display.slice(0, 50) + (validInput.display.length > 50 ? '...' : '')
    : t('session.emptySession');

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left group"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <MessageSquare className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm truncate group-hover:text-[var(--text-primary)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {title}
        </div>
        <div
          className="flex items-center gap-2 text-xs mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>{session.inputCount} {t('session.inputs')}</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span>{formatRelativeTime(session.updatedAt)}</span>
        </div>
      </div>
      <ArrowRight
        className="w-4 h-4 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      />
    </button>
  );
};

interface TeamListItemProps {
  team: Team;
  onClick: () => void;
}

const TeamListItem: React.FC<TeamListItemProps> = ({ team, onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left group"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <Users className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm truncate group-hover:text-[var(--text-primary)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {team.name}
        </div>
        <div
          className="flex items-center gap-2 text-xs mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>{team.memberCount} {t('team.members')}</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span>{team.messageCount} {t('team.messages')}</span>
        </div>
      </div>
      <ArrowRight
        className="w-4 h-4 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      />
    </button>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div
    className="flex flex-col h-full items-center justify-center"
    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
  >
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {icon}
    </div>
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  onViewSession,
  onViewTeam,
  onViewChange,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'sessions' | 'teams'>('sessions');

  if (!stats) {
    return (
      <EmptyState
        icon={<TrendingUp className="w-7 h-7 opacity-40" />}
        message={t('empty.loadingDashboard')}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="px-4 md:px-6 py-3 md:py-4 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('navigation.dashboard')}
          </h1>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards - Mobile: 2 columns, Desktop: 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            icon={<List className="w-5 h-5" />}
            label={t('dashboard.totalSessions')}
            value={stats.totalSessions}
            color="blue"
            isMobile={isMobile}
          />
          <StatCard
            icon={<FolderGit2 className="w-5 h-5" />}
            label={t('dashboard.totalProjects')}
            value={stats.totalProjects}
            color="green"
            isMobile={isMobile}
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label={t('dashboard.totalTeams')}
            value={stats.totalTeams}
            color="purple"
            isMobile={isMobile}
          />
          <StatCard
            icon={<MessageSquare className="w-5 h-5" />}
            label={t('dashboard.totalMessages')}
            value={stats.totalInputs}
            color="orange"
            isMobile={isMobile}
          />
        </div>

        {/* Visualization Section - Mobile: stacked, Desktop: side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <ActivityHeatmap sessions={stats.recentSessions} days={isMobile ? 60 : 90} />
          <TrendChart sessions={stats.recentSessions} days={isMobile ? 7 : 14} />
        </div>

        {/* Activity Timeline */}
        <ActivityTimeline
          sessions={stats.recentSessions}
          teams={stats.recentTeams}
          maxItems={isMobile ? 10 : 15}
        />

        {/* Mobile: Tab-based layout for Sessions/Teams */}
        {isMobile ? (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 400px)', minHeight: '200px' }}>
            {/* Tab Navigation */}
            <div className="flex border-b mb-4 shrink-0" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'sessions'
                    ? 'border-b-2'
                    : ''
                }`}
                style={{
                  color: activeTab === 'sessions' ? 'var(--accent-blue)' : 'var(--text-muted)',
                  borderColor: activeTab === 'sessions' ? 'var(--accent-blue)' : 'transparent',
                }}
              >
                <Clock className="w-4 h-4" />
                {t('dashboard.recentSessions')}
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'teams'
                    ? 'border-b-2'
                    : ''
                }`}
                style={{
                  color: activeTab === 'teams' ? 'var(--accent-purple)' : 'var(--text-muted)',
                  borderColor: activeTab === 'teams' ? 'var(--accent-purple)' : 'transparent',
                }}
              >
                <Users className="w-4 h-4" />
                {t('dashboard.recentTeams')}
              </button>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-y-auto -mx-4 px-4">
              {activeTab === 'sessions' ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('dashboard.recentSessions')}
                    </h2>
                    {onViewChange && (
                      <button
                        onClick={() => onViewChange('sessions')}
                        className="text-xs flex items-center gap-1"
                        style={{ color: 'var(--accent-blue)' }}
                      >
                        {t('common.viewAll')}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 pb-4">
                    {stats.recentSessions.length === 0 ? (
                      <div
                        className="text-center py-8"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <p className="text-sm">{t('empty.noRecentSessions')}</p>
                      </div>
                    ) : (
                      stats.recentSessions.map((session) => (
                        <SessionListItem
                          key={session.id}
                          session={session}
                          onClick={() => onViewSession(session.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {t('dashboard.recentTeams')}
                    </h2>
                    {onViewChange && (
                      <button
                        onClick={() => onViewChange('teams')}
                        className="text-xs flex items-center gap-1"
                        style={{ color: 'var(--accent-purple)' }}
                      >
                        {t('common.viewAll')}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 pb-4">
                    {stats.recentTeams.length === 0 ? (
                      <div
                        className="text-center py-8"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <p className="text-sm">{t('team.noTeams')}</p>
                      </div>
                    ) : (
                      stats.recentTeams.map((team) => (
                        <TeamListItem
                          key={team.id}
                          team={team}
                          onClick={() => onViewTeam(team.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Desktop: Two Column Layout */
          <div className="grid grid-cols-2 gap-6">
            {/* Recent Sessions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t('dashboard.recentSessions')}
                  </h2>
                </div>
                {onViewChange && (
                  <button
                    onClick={() => onViewChange('sessions')}
                    className="text-xs flex items-center gap-1"
                    style={{ color: 'var(--accent-blue)' }}
                  >
                    {t('common.viewAll')}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {stats.recentSessions.length === 0 ? (
                  <div
                    className="text-center py-8"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <p className="text-sm">{t('empty.noRecentSessions')}</p>
                  </div>
                ) : (
                  stats.recentSessions.map((session) => (
                    <SessionListItem
                      key={session.id}
                      session={session}
                      onClick={() => onViewSession(session.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Recent Teams */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t('dashboard.recentTeams')}
                  </h2>
                </div>
                {onViewChange && (
                  <button
                    onClick={() => onViewChange('teams')}
                    className="text-xs flex items-center gap-1"
                    style={{ color: 'var(--accent-purple)' }}
                  >
                    {t('common.viewAll')}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {stats.recentTeams.length === 0 ? (
                  <div
                    className="text-center py-8"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <p className="text-sm">{t('team.noTeams')}</p>
                  </div>
                ) : (
                  stats.recentTeams.map((team) => (
                    <TeamListItem
                      key={team.id}
                      team={team}
                      onClick={() => onViewTeam(team.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
