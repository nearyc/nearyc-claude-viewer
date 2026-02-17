import React, { useState, useCallback } from 'react';
import { ResizablePanel, getStoredWidth, storeWidth } from './ResizablePanel';
import type { ViewType } from '../types';

interface LayoutProps {
  leftPanel: React.ReactNode;
  middlePanel: React.ReactNode;
  rightPanel: React.ReactNode;
  currentView: ViewType;
}

const LEFT_PANEL_KEY = 'leftPanel';
const MIDDLE_PANEL_KEY = 'middlePanel';

const DEFAULT_LEFT_WIDTH = 256; // 64 * 4 = 256px (w-64)
const DEFAULT_MIDDLE_WIDTH = 320; // 80 * 4 = 320px (w-80)

const MIN_LEFT_WIDTH = 200;
const MAX_LEFT_WIDTH = 400;
const MIN_MIDDLE_WIDTH = 240;
const MAX_MIDDLE_WIDTH = 500;

export const Layout: React.FC<LayoutProps> = ({ leftPanel, middlePanel, rightPanel, currentView }) => {
  // For teams view, we need a different layout (no middle panel or different structure)
  const isTeamsView = currentView === 'teams';

  // Load stored widths from localStorage
  const [leftWidth, setLeftWidth] = useState(() => getStoredWidth(LEFT_PANEL_KEY, DEFAULT_LEFT_WIDTH));
  const [middleWidth, setMiddleWidth] = useState(() => getStoredWidth(MIDDLE_PANEL_KEY, DEFAULT_MIDDLE_WIDTH));

  const handleLeftResize = useCallback((width: number) => {
    setLeftWidth(width);
    storeWidth(LEFT_PANEL_KEY, width);
  }, []);

  const handleMiddleResize = useCallback((width: number) => {
    setMiddleWidth(width);
    storeWidth(MIDDLE_PANEL_KEY, width);
  }, []);

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Left Panel - Sidebar (Resizable) */}
      <ResizablePanel
        initialWidth={leftWidth}
        minWidth={MIN_LEFT_WIDTH}
        maxWidth={MAX_LEFT_WIDTH}
        direction="right"
        className="flex flex-col"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onResize={handleLeftResize}
      >
        {leftPanel}
      </ResizablePanel>

      {/* Middle Panel - List (Resizable, not in teams view) */}
      {isTeamsView ? (
        <div
          className="flex-1 flex flex-col"
        >
          {middlePanel}
        </div>
      ) : (
        <ResizablePanel
          initialWidth={middleWidth}
          minWidth={MIN_MIDDLE_WIDTH}
          maxWidth={MAX_MIDDLE_WIDTH}
          direction="right"
          className="flex flex-col border-r"
          style={{ borderColor: 'var(--border-primary)' }}
          onResize={handleMiddleResize}
        >
          {middlePanel}
        </ResizablePanel>
      )}

      {/* Right Panel - Detail (hidden in teams view, handled in middlePanel) */}
      {!isTeamsView && (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {rightPanel}
        </div>
      )}
    </div>
  );
};

export default Layout;
