import React, { useMemo } from 'react';
import { MessageSquare, Users, Clock } from 'lucide-react';
import type { Session, Team } from '../types';
import { isSystemContent } from '../types';
import { formatRelativeTime } from '../utils/time';
import { useTranslation } from '../hooks/useTranslation';

interface ActivityTimelineProps {
  sessions: Session[];
  teams: Team[];
  maxItems?: number;
}

interface TimelineItem {
  id: string;
  type: 'session' | 'team';
  title: string;
  subtitle?: string;
  timestamp: number;
  icon: React.ReactNode;
  color: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  sessions,
  teams,
  maxItems = 20,
}) => {
  const { t } = useTranslation();
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add session activities
    sessions.forEach((session) => {
      // Find the first non-system input
      const validInput = session.inputs.find(input => !isSystemContent(input.display));
      const title = validInput
        ? validInput.display.slice(0, 60) + (validInput.display.length > 60 ? '...' : '')
        : t('session.emptySession');

      items.push({
        id: `session-${session.id}`,
        type: 'session',
        title,
        subtitle: session.project,
        timestamp: session.updatedAt,
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        color: 'var(--accent-blue)',
      });
    });

    // Add team activities
    teams.forEach((team) => {
      items.push({
        id: `team-${team.id}`,
        type: 'team',
        title: team.name,
        subtitle: t('team.membersWithCount', { count: team.memberCount }),
        timestamp: team.updatedAt,
        icon: <Users className="w-3.5 h-3.5" />,
        color: 'var(--accent-purple)',
      });
    });

    // Sort by timestamp desc and limit
    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxItems);
  }, [sessions, teams, maxItems]);

  const groupedItems = useMemo(() => {
    const groups: { label: string; items: TimelineItem[] }[] = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const today: TimelineItem[] = [];
    const yesterday: TimelineItem[] = [];
    const thisWeek: TimelineItem[] = [];
    const older: TimelineItem[] = [];

    timelineItems.forEach((item) => {
      const diff = now - item.timestamp;
      if (diff < oneDay) {
        today.push(item);
      } else if (diff < 2 * oneDay) {
        yesterday.push(item);
      } else if (diff < 7 * oneDay) {
        thisWeek.push(item);
      } else {
        older.push(item);
      }
    });

    if (today.length > 0) groups.push({ label: t('activity.today'), items: today });
    if (yesterday.length > 0) groups.push({ label: t('activity.yesterday'), items: yesterday });
    if (thisWeek.length > 0) groups.push({ label: t('activity.thisWeek'), items: thisWeek });
    if (older.length > 0) groups.push({ label: t('activity.earlier'), items: older });

    return groups;
  }, [timelineItems]);

  if (timelineItems.length === 0) {
    return (
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <h3
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('activity.realTime')}
        </h3>
        <div
          className="text-center py-8 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('activity.noActivity')}
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('activity.realTime')}
        </h3>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock className="w-3 h-3" />
          <span>{t('activity.recentCount', { count: timelineItems.length })}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {groupedItems.map((group) => (
          <div key={group.label}>
            <div
              className="text-xs font-medium mb-2 px-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {group.label}
            </div>
            <div className="space-y-2">
              {group.items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer group"
                  style={{
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: `${item.color}20`,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div
                        className="text-xs truncate mt-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div
                    className="text-xs flex-shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {formatRelativeTime(item.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
