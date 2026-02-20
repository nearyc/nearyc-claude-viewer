import React, { useMemo } from 'react';
import type { Session } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useIsMobile } from '../hooks/useMediaQuery';

interface ActivityData {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityHeatmapProps {
  sessions: Session[];
  days?: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  sessions,
  days = 90,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const heatmapData = useMemo(() => {
    const now = new Date();
    const data: ActivityData[] = [];

    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      data.push({ date: dateStr, count: 0, level: 0 });
    }

    // Count sessions per day
    sessions.forEach((session) => {
      const dateStr = new Date(session.createdAt).toISOString().split('T')[0];
      const dayData = data.find((d) => d.date === dateStr);
      if (dayData) {
        dayData.count++;
      }
    });

    // Calculate levels based on counts
    const counts = data.map((d) => d.count).filter((c) => c > 0);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

    data.forEach((day) => {
      if (day.count === 0) {
        day.level = 0;
      } else if (maxCount <= 3) {
        day.level = day.count as 1 | 2 | 3 | 4;
      } else {
        const ratio = day.count / maxCount;
        if (ratio <= 0.25) day.level = 1;
        else if (ratio <= 0.5) day.level = 2;
        else if (ratio <= 0.75) day.level = 3;
        else day.level = 4;
      }
    });

    return data;
  }, [sessions, days]);

  const weeks = useMemo(() => {
    const w: ActivityData[][] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      w.push(heatmapData.slice(i, i + 7));
    }
    return w;
  }, [heatmapData]);

  const getColor = (level: number): string => {
    switch (level) {
      case 0:
        return 'var(--bg-tertiary)';
      case 1:
        return 'var(--accent-blue-subtle)';
      case 2:
        return 'var(--accent-blue-light)';
      case 3:
        return 'var(--accent-blue-medium)';
      case 4:
        return 'var(--accent-blue-strong)';
      default:
        return 'var(--bg-tertiary)';
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const totalSessions = sessions.length;
  const activeDays = heatmapData.filter((d) => d.count > 0).length;
  const maxSessionsInDay = Math.max(...heatmapData.map((d) => d.count));

  return (
    <div
      className="p-3 md:p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-4`}>
        <h3
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('activity.title')}
        </h3>
        <div className={`flex items-center gap-2 md:gap-4 text-xs`} style={{ color: 'var(--text-muted)' }}>
          <span>{t('activity.sessionsCount')}: {totalSessions}</span>
          <span>{t('activity.activeDays')}: {activeDays}</span>
          {maxSessionsInDay > 0 && !isMobile && <span>{t('activity.maxPerDay')}: {maxSessionsInDay}</span>}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-sm transition-all hover:ring-2 cursor-pointer`}
                style={{ backgroundColor: getColor(day.level) }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-blue)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title={`${formatDate(day.date)}: ${day.count} ${t('activity.sessionsCount')}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{t('activity.less')}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-sm`}
            style={{ backgroundColor: getColor(level) }}
          />
        ))}
        <span>{t('activity.more')}</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
