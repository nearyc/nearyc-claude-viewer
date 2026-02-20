import { useEffect, useRef, useCallback } from 'react';

// Polling constants
const DEFAULT_POLLING_INTERVAL_MS = 5000; // 5 seconds

interface PollingOptions {
  interval?: number;      // Polling interval in milliseconds, default 5000 (5 seconds)
  enabled?: boolean;      // Whether to enable polling, default true
  onTick: () => void;     // Polling callback
}

/**
 * Hook for polling mechanism as a backup to WebSocket real-time updates
 * Useful when WebSocket is disconnected or unreliable
 */
export function useTeamPolling({ interval = DEFAULT_POLLING_INTERVAL_MS, enabled = true, onTick }: PollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTickRef = useRef(onTick);

  // Keep callback up to date
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled) return;

    // Execute immediately on mount
    onTickRef.current();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      onTickRef.current();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled]);

  // Manual refresh trigger
  const refresh = useCallback(() => {
    onTickRef.current();
  }, []);

  return { refresh };
}
