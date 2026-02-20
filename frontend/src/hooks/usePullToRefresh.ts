import { useEffect, useRef, useCallback, RefObject, useState } from 'react';

interface PullToRefreshConfig {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  resistance?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  startY: number;
  currentY: number;
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

const DEFAULT_THRESHOLD = 80;
const DEFAULT_MAX_PULL_DISTANCE = 150;
const DEFAULT_RESISTANCE = 0.6;

export function usePullToRefresh(
  ref: RefObject<HTMLElement | null>,
  config: PullToRefreshConfig
): {
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
  progress: number;
} {
  const stateRef = useRef<PullToRefreshState>({
    startY: 0,
    currentY: 0,
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
  });

  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const threshold = config.threshold ?? DEFAULT_THRESHOLD;
  const maxPullDistance = config.maxPullDistance ?? DEFAULT_MAX_PULL_DISTANCE;
  const resistance = config.resistance ?? DEFAULT_RESISTANCE;
  const disabled = config.disabled ?? false;

  const isAtTop = useCallback((): boolean => {
    const element = ref.current;
    if (!element) return false;

    return element.scrollTop <= 0;
  }, [ref]);

  const calculatePullDistance = useCallback(
    (deltaY: number): number => {
      const resisted = deltaY * resistance;
      return Math.min(resisted, maxPullDistance);
    },
    [resistance, maxPullDistance]
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (disabled || stateRef.current.isRefreshing) return;

      if (!isAtTop()) return;

      stateRef.current.startY = event.touches[0].clientY;
      stateRef.current.isPulling = true;
    },
    [disabled, isAtTop]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (disabled || !stateRef.current.isPulling || stateRef.current.isRefreshing) {
        return;
      }

      const touchY = event.touches[0].clientY;
      const deltaY = touchY - stateRef.current.startY;

      if (deltaY < 0) {
        stateRef.current.isPulling = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      if (deltaY > 0 && isAtTop()) {
        const distance = calculatePullDistance(deltaY);
        stateRef.current.pullDistance = distance;
        setPullDistance(distance);
        setIsPulling(true);

        if (distance > 0) {
          event.preventDefault();
        }
      }
    },
    [disabled, isAtTop, calculatePullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!stateRef.current.isPulling) return;

    stateRef.current.isPulling = false;
    setIsPulling(false);

    const distance = stateRef.current.pullDistance;

    if (distance >= threshold && !stateRef.current.isRefreshing) {
      stateRef.current.isRefreshing = true;
      setIsRefreshing(true);

      try {
        await config.onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        stateRef.current.isRefreshing = false;
        setIsRefreshing(false);
        stateRef.current.pullDistance = 0;
        setPullDistance(0);
      }
    } else {
      stateRef.current.pullDistance = 0;
      setPullDistance(0);
    }
  }, [threshold, config]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    progress,
  };
}

export default usePullToRefresh;
