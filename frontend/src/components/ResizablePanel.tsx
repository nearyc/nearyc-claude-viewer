import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  direction?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
  onResize?: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

const STORAGE_KEY = 'resizable-panel-widths';

export const getStoredWidth = (key: string, defaultWidth: number): number => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const widths = JSON.parse(stored);
      if (widths[key] !== undefined) {
        return widths[key];
      }
    }
  } catch {
    // Ignore storage errors
  }
  return defaultWidth;
};

export const storeWidth = (key: string, width: number): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const widths = stored ? JSON.parse(stored) : {};
    widths[key] = width;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // Ignore storage errors
  }
};

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  initialWidth,
  minWidth = 200,
  maxWidth = 600,
  direction = 'right',
  className = '',
  style = {},
  onResize,
  onResizeStart,
  onResizeEnd,
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = panelRef.current?.offsetWidth || width;
      onResizeStart?.();
    },
    [width, onResizeStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = direction === 'right'
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX;

      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));

      setWidth(newWidth);
      onResize?.(newWidth);
    },
    [isResizing, direction, minWidth, maxWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      onResizeEnd?.();
    }
  }, [isResizing, onResizeEnd]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={panelRef}
      className={`relative flex-shrink-0 ${className}`}
      style={{
        width: `${width}px`,
        ...style,
      }}
    >
      {children}

      {/* Resize handle */}
      <div
        className={`absolute top-0 bottom-0 w-1 cursor-col-resize transition-colors z-10
          ${direction === 'right' ? 'right-0' : 'left-0'}
          ${isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-500/50'}
        `}
        onMouseDown={handleMouseDown}
        style={{
          transform: direction === 'right' ? 'translateX(50%)' : 'translateX(-50%)',
        }}
      />
    </div>
  );
};

interface CollapsiblePanelProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  collapsedWidth?: number;
  expandedWidth: number;
  className?: string;
  style?: React.CSSProperties;
  onCollapseChange?: (collapsed: boolean) => void;
  collapseDirection?: 'left' | 'right';
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  children,
  defaultCollapsed = false,
  collapsedWidth = 48,
  expandedWidth,
  className = '',
  style = {},
  onCollapseChange,
  collapseDirection = 'right',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  }, [isCollapsed, onCollapseChange]);

  return (
    <div
      className={`relative flex-shrink-0 transition-all duration-200 ${className}`}
      style={{
        width: isCollapsed ? collapsedWidth : expandedWidth,
        ...style,
      }}
    >
      {children}

      {/* Collapse toggle button */}
      <button
        onClick={toggleCollapse}
        className="absolute top-4 z-20 flex items-center justify-center w-5 h-8
                   bg-gray-700 hover:bg-gray-600 border border-gray-600
                   rounded transition-colors"
        style={{
          [collapseDirection === 'right' ? 'right' : 'left']: -2.5,
        }}
        title={isCollapsed ? '展开面板' : '折叠面板'}
      >
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-200
            ${isCollapsed
              ? (collapseDirection === 'right' ? '-rotate-180' : 'rotate-0')
              : (collapseDirection === 'right' ? 'rotate-0' : '-rotate-180')
            }
          `}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

export default ResizablePanel;
