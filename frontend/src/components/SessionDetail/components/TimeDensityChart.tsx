import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import type { ChatMessage } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';

interface TimeDensityChartProps {
  messages: ChatMessage[];
  onSelectTime: (timestamp: number) => void;
}

export const TimeDensityChart: React.FC<TimeDensityChartProps> = ({ messages, onSelectTime }) => {
  const { t } = useTranslation();

  const densityData = useMemo(() => {
    if (messages.length === 0) return [];

    const minTime = Math.min(...messages.map(m => m.timestamp));
    const maxTime = Math.max(...messages.map(m => m.timestamp));
    const timeRange = maxTime - minTime;

    if (timeRange === 0) return [{ time: minTime, count: messages.length, intensity: 1 }];

    // Create 20 time buckets
    const bucketCount = 20;
    const bucketSize = timeRange / bucketCount;
    const buckets: { time: number; count: number; intensity: number }[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = minTime + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      const count = messages.filter(
        m => m.timestamp >= bucketStart && m.timestamp < bucketEnd
      ).length;
      buckets.push({ time: bucketStart, count, intensity: 0 });
    }

    // Normalize intensity
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    buckets.forEach(b => {
      b.intensity = b.count / maxCount;
    });

    return buckets;
  }, [messages]);

  return (
    <div className="px-4 py-2 border-b border-[var(--bg-secondary)]/60 bg-[var(--bg-primary)]/30">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <span className="text-xs text-[var(--text-muted)]">{t('activity.activity')}</span>
      </div>
      <div className="flex items-end gap-0.5 h-8">
        {densityData.map((bucket, i) => (
          <button
            key={i}
            onClick={() => onSelectTime(bucket.time)}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80"
            style={{
              height: `${Math.max(20, bucket.intensity * 100)}%`,
              backgroundColor: `rgba(99, 102, 241, ${0.2 + bucket.intensity * 0.8})`,
            }}
            title={`${bucket.count} messages`}
          />
        ))}
      </div>
    </div>
  );
};
