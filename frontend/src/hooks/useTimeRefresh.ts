import { useState, useEffect } from 'react';

// Time-related constants
const DEFAULT_REFRESH_INTERVAL_MS = 30000; // 30 seconds
const SESSION_ACTIVE_THRESHOLD_MS = 20000; // 20 seconds

// Global timer state - shared across all hook instances
let globalTimer: ReturnType<typeof setInterval> | null = null;
const callbacks = new Set<() => void>();

/**
 * Ensure global timer is running
 * Creates timer only if it doesn't exist
 */
function ensureTimer(intervalMs: number): void {
  if (globalTimer) return;
  globalTimer = setInterval(() => {
    callbacks.forEach(cb => cb());
  }, intervalMs);
}

/**
 * Stop global timer if no more callbacks
 */
function stopTimerIfEmpty(): void {
  if (callbacks.size === 0 && globalTimer) {
    clearInterval(globalTimer);
    globalTimer = null;
  }
}

/**
 * Hook to force re-render for time display updates
 * Returns a tick value that changes every interval, triggering re-render
 *
 * Uses a global shared timer to avoid creating multiple timers
 * when many components use this hook simultaneously.
 */
export function useTimeRefresh(intervalMs: number = DEFAULT_REFRESH_INTERVAL_MS): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const callback = () => setTick(t => t + 1);
    callbacks.add(callback);
    ensureTimer(intervalMs);

    return () => {
      callbacks.delete(callback);
      stopTimerIfEmpty();
    };
  }, [intervalMs]);

  return tick;
}

/**
 * Check if a session is currently active (has activity within last 20 seconds)
 */
export function isSessionActive(session: { updatedAt: number }): boolean {
  const now = Date.now();
  const diff = now - session.updatedAt;
  return diff < SESSION_ACTIVE_THRESHOLD_MS;
}
