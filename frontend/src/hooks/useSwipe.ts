import { useEffect, useRef, useCallback, RefObject } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isTracking: boolean;
}

const DEFAULT_THRESHOLD = 50;
const MAX_SWIPE_DURATION = 300;

export function useSwipe(ref: RefObject<HTMLElement | null>, config: SwipeConfig): void {
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
  });

  const threshold = config.threshold ?? DEFAULT_THRESHOLD;

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      const element = ref.current;
      if (!element) return;

      stateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startTime: Date.now(),
        isTracking: true,
      };

      element.setPointerCapture(event.pointerId);
    },
    [ref]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const element = ref.current;
      if (!element || !stateRef.current.isTracking) return;

      const state = stateRef.current;
      const duration = Date.now() - state.startTime;

      stateRef.current.isTracking = false;

      if (duration > MAX_SWIPE_DURATION) {
        return;
      }

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > absY && absX > threshold) {
        if (deltaX > 0 && config.onSwipeRight) {
          config.onSwipeRight();
        } else if (deltaX < 0 && config.onSwipeLeft) {
          config.onSwipeLeft();
        }
      } else if (absY > absX && absY > threshold) {
        if (deltaY > 0 && config.onSwipeDown) {
          config.onSwipeDown();
        } else if (deltaY < 0 && config.onSwipeUp) {
          config.onSwipeUp();
        }
      }

      element.releasePointerCapture(event.pointerId);
    },
    [config, threshold, ref]
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent) => {
      const element = ref.current;
      if (!element) return;

      stateRef.current.isTracking = false;

      try {
        element.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may not be captured
      }
    },
    [ref]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('pointerdown', handlePointerDown, { passive: true });
    element.addEventListener('pointerup', handlePointerUp, { passive: true });
    element.addEventListener('pointercancel', handlePointerCancel, { passive: true });

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [ref, handlePointerDown, handlePointerUp, handlePointerCancel]);
}

export default useSwipe;
