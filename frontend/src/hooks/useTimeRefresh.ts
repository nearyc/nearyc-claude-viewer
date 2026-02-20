import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to force re-render for time display updates
 * Returns a tick value that changes every interval, triggering re-render
 */
export function useTimeRefresh(intervalMs: number = 30000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return tick;
}

/**
 * Check if a session is currently active (has activity within last 20 seconds)
 */
export function isSessionActive(session: { updatedAt: number }): boolean {
  const now = Date.now();
  const diff = now - session.updatedAt;
  return diff < 20000; // 20 seconds
}
