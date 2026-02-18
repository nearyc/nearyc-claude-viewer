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
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
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
  // Find the first non-system input
  const validInput = session.inputs.find(input => !isSystemContent(input.display));
  const title = validInput
    ? validInput.display.slice(0, 50) + (validInput.display.length > 50 ? '...' : '')
    : 'Empty Session';

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
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <MessageSquare className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm truncate group-hover:text-gray-200"
          style={{ color: 'var(--text-secondary)' }}
        >
          {title}
        </div>
        <div
          className="flex items-center gap-2 text-xs mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>{session.inputCount} inputs</span>
          <span style={{ color: 'var(--text-tertiary)' }}>•</span>
          <span>{formatRelativeTime(session.updatedAt)}</span>
        </div>
      </div>
      <ArrowRight
        className="w-4 h-4 transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      />
    </button>
  );
};

interface TeamListItemProps {
  team: Team;
  onClick: () => void;
}

const TeamListItem: React.FC<TeamListItemProps> = ({ team, onClick }) => (
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
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderColor: 'rgba(139, 92, 246, 0.2)',
      }}
    >
      <Users className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
    </div>
    <div className="flex-1 min-w-0">
      <div
        className="text-sm truncate group-hover:text-gray-200"
        style={{ color: 'var(--text-secondary)' }}
      >
        {team.name}
      </div>
      <div
        className="flex items-center gap-2 text-xs mt-0.5"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>{team.memberCount} members</span>
        <span style={{ color: 'var(--text-tertiary)' }}>•</span>
        <span>{team.messageCount} messages</span>
      </div>
    </div>
    <ArrowRight
      className="w-4 h-4 transition-colors"
      style={{ color: 'var(--text-tertiary)' }}
    />
  </button>
);

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
  if (!stats) {
    return (
      <EmptyState
        icon={<TrendingUp className="w-7 h-7 opacity-40" />}
        message="Loading dashboard..."
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
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<List className="w-5 h-5" />}
            label="Total Sessions"
            value={stats.totalSessions}
            color="blue"
          />
          <StatCard
            icon={<FolderGit2 className="w-5 h-5" />}
            label="Total Projects"
            value={stats.totalProjects}
            color="green"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Teams"
            value={stats.totalTeams}
            color="purple"
          />
          <StatCard
            icon={<MessageSquare className="w-5 h-5" />}
            label="Total Messages"
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
                  Recent Sessions
                </h2>
              </div>
              {onViewChange && (
                <button
                  onClick={() => onViewChange('sessions')}
                  className="text-xs flex items-center gap-1"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  View all
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
                  <p className="text-sm">No recent sessions</p>
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
                  Recent Teams
                </h2>
              </div>
              {onViewChange && (
                <button
                  onClick={() => onViewChange('teams')}
                  className="text-xs flex items-center gap-1"
                  style={{ color: 'var(--accent-purple)' }}
                >
                  View all
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
                  <p className="text-sm">No teams yet</p>
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
