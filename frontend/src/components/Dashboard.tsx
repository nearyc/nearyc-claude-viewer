import React from 'react';
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

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const styles = COLOR_STYLES[color];

  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className="p-2 rounded-lg border"
          style={{
            backgroundColor: styles.bg,
            color: styles.text,
            borderColor: styles.border,
          }}
        >
          {icon}
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
        className="px-6 py-4 border-b"
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

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<List className="w-5 h-5" />}
            label={t('dashboard.totalSessions')}
            value={stats.totalSessions}
            color="blue"
          />
          <StatCard
            icon={<FolderGit2 className="w-5 h-5" />}
            label={t('dashboard.totalProjects')}
            value={stats.totalProjects}
            color="green"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label={t('dashboard.totalTeams')}
            value={stats.totalTeams}
            color="purple"
          />
          <StatCard
            icon={<MessageSquare className="w-5 h-5" />}
            label={t('dashboard.totalMessages')}
            value={stats.totalInputs}
            color="orange"
          />
        </div>

        {/* Visualization Section */}
        <div className="grid grid-cols-2 gap-6">
          <ActivityHeatmap sessions={stats.recentSessions} days={90} />
          <TrendChart sessions={stats.recentSessions} days={14} />
        </div>

        {/* Activity Timeline */}
        <ActivityTimeline
          sessions={stats.recentSessions}
          teams={stats.recentTeams}
          maxItems={15}
        />

        {/* Two Column Layout */}
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
      </div>
    </div>
  );
};

export default Dashboard;
