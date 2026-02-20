import { useEffect, useRef, useCallback, useState } from 'react';

interface LongPressConfig {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  preventContextMenu?: boolean;
}

interface LongPressState {
  startX: number;
  startY: number;
  startTime: number;
  timerId: number | null;
  hasTriggeredLongPress: boolean;
  isActive: boolean;
}

const DEFAULT_DELAY = 500;
const MOVE_THRESHOLD = 10;

export function useLongPress(config: LongPressConfig) {
  const stateRef = useRef<LongPressState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    timerId: null,
    hasTriggeredLongPress: false,
    isActive: false,
  });

  const [isPressing, setIsPressing] = useState(false);

  const delay = config.delay ?? DEFAULT_DELAY;
  const preventContextMenu = config.preventContextMenu ?? true;

  const clearTimer = useCallback(() => {
    if (stateRef.current.timerId !== null) {
      window.clearTimeout(stateRef.current.timerId);
      stateRef.current.timerId = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      const target = event.currentTarget as HTMLElement;
      if (!target) return;

      stateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startTime: Date.now(),
        timerId: null,
        hasTriggeredLongPress: false,
        isActive: true,
      };

      setIsPressing(true);

      stateRef.current.timerId = window.setTimeout(() => {
        stateRef.current.hasTriggeredLongPress = true;
        config.onLongPress();
        setIsPressing(false);
      }, delay);

      target.setPointerCapture(event.pointerId);
    },
    [config, delay]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!stateRef.current.isActive) return;

      const deltaX = Math.abs(event.clientX - stateRef.current.startX);
      const deltaY = Math.abs(event.clientY - stateRef.current.startY);

      if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
        clearTimer();
        stateRef.current.isActive = false;
        setIsPressing(false);
      }
    },
    [clearTimer]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const target = event.currentTarget as HTMLElement;
      if (!target) return;

      clearTimer();

      const wasLongPress = stateRef.current.hasTriggeredLongPress;
      stateRef.current.isActive = false;
      setIsPressing(false);

      if (!wasLongPress && config.onClick) {
        config.onClick();
      }

      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may not be captured
      }
    },
    [clearTimer, config]
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent) => {
      const target = event.currentTarget as HTMLElement;
      if (!target) return;

      clearTimer();
      stateRef.current.isActive = false;
      stateRef.current.hasTriggeredLongPress = false;
      setIsPressing(false);

      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may not be captured
      }
    },
    [clearTimer]
  );

  const handleContextMenu = useCallback(
    (event: Event) => {
      if (preventContextMenu && stateRef.current.isActive) {
        event.preventDefault();
      }
    },
    [preventContextMenu]
  );

  const bind = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;

      element.addEventListener('pointerdown', handlePointerDown, { passive: true });
      element.addEventListener('pointermove', handlePointerMove, { passive: true });
      element.addEventListener('pointerup', handlePointerUp, { passive: true });
      element.addEventListener('pointercancel', handlePointerCancel, { passive: true });

      if (preventContextMenu) {
        element.addEventListener('contextmenu', handleContextMenu);
      }

      return () => {
        element.removeEventListener('pointerdown', handlePointerDown);
        element.removeEventListener('pointermove', handlePointerMove);
        element.removeEventListener('pointerup', handlePointerUp);
        element.removeEventListener('pointercancel', handlePointerCancel);
        element.removeEventListener('contextmenu', handleContextMenu);
        clearTimer();
      };
    },
    [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleContextMenu, preventContextMenu, clearTimer]
  );

  return { bind, isPressing };
}

export default useLongPress;
