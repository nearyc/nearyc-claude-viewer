import React, { useMemo } from 'react';
import type { Session } from '../types';

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
        return 'rgba(59, 130, 246, 0.2)';
      case 2:
        return 'rgba(59, 130, 246, 0.4)';
      case 3:
        return 'rgba(59, 130, 246, 0.6)';
      case 4:
        return 'rgba(59, 130, 246, 0.85)';
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
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          会话活跃度
        </h3>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{totalSessions} 会话</span>
          <span>{activeDays} 活跃天数</span>
          {maxSessionsInDay > 0 && <span>最多 {maxSessionsInDay}/天</span>}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className="w-3 h-3 rounded-sm transition-all hover:ring-2 hover:ring-white/30 cursor-pointer"
                style={{ backgroundColor: getColor(day.level) }}
                title={`${formatDate(day.date)}: ${day.count} 会话`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getColor(level) }}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
