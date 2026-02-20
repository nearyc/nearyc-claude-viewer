import React, { useMemo } from 'react';
import type { Session } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useIsMobile } from '../hooks/useMediaQuery';

interface TrendData {
  label: string;
  count: number;
  timestamp: number;
}

interface TrendChartProps {
  sessions: Session[];
  days?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  sessions,
  days = 14,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const trendData = useMemo(() => {
    const now = new Date();
    const data: TrendData[] = [];

    // Initialize days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        label: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
        count: 0,
        timestamp: date.getTime(),
      });
    }

    // Count sessions per day
    sessions.forEach((session) => {
      const sessionDate = new Date(session.createdAt);
      const dayData = data.find((d) => {
        const dDate = new Date(d.timestamp);
        return (
          dDate.getDate() === sessionDate.getDate() &&
          dDate.getMonth() === sessionDate.getMonth() &&
          dDate.getFullYear() === sessionDate.getFullYear()
        );
      });
      if (dayData) {
        dayData.count++;
      }
    });

    return data;
  }, [sessions, days]);

  const maxCount = useMemo(() => {
    return Math.max(...trendData.map((d) => d.count), 1);
  }, [trendData]);

  const totalSessions = trendData.reduce((sum, d) => sum + d.count, 0);
  const averageCount = totalSessions / days;

  // Calculate SVG path for the line
  const svgWidth = 600;
  const svgHeight = isMobile ? 100 : 120;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const points = trendData.map((d, i) => {
    const x = padding.left + (i / (trendData.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight;
    return { x, y, data: d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Area path for gradient fill
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

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
          {t('activity.trend')}
        </h3>
        <div className="flex items-center gap-2 md:gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{t('activity.total')}: {totalSessions}</span>
          {!isMobile && <span>{t('activity.average')}: {averageCount.toFixed(1)}/{t('time.day')}</span>}
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ minHeight: isMobile ? '100px' : '120px' }}
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - ratio)}
            x2={svgWidth - padding.right}
            y2={padding.top + chartHeight * (1 - ratio)}
            stroke="var(--border-secondary)"
            strokeDasharray="2,2"
          />
        ))}

        {/* Y-axis labels */}
        {[0, maxCount / 2, maxCount].map((value, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={padding.top + chartHeight * (1 - i / 2) + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--text-muted)"
          >
            {Math.round(value)}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#trendGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent-blue)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.data.count > 0 ? 4 : 2}
              fill={p.data.count > 0 ? 'var(--accent-blue)' : 'var(--bg-tertiary)'}
              stroke="var(--bg-secondary)"
              strokeWidth="2"
            />
            {/* X-axis labels */}
            {i % Math.ceil(points.length / 7) === 0 && (
              <text
                x={p.x}
                y={svgHeight - 8}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-muted)"
              >
                {p.data.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default TrendChart;
