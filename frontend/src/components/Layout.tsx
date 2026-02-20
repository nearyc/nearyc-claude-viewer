import React, { useState, useCallback, useEffect } from 'react';
import { ResizablePanel, getStoredWidth, storeWidth } from './ResizablePanel';
import { MobileDrawer, MobileDrawerTrigger } from './MobileDrawer';
import { MobileBackButton } from './MobileBackButton';
import { useMobile } from '../contexts/MobileContext';
import type { ViewType, DashboardStats, Project } from '../types';

interface LayoutProps {
  leftPanel: React.ReactNode;
  middlePanel: React.ReactNode;
  rightPanel: React.ReactNode;
  currentView: ViewType;
  // Mobile detail view props
  showMobileDetail?: boolean;
  onMobileDetailBack?: (() => void) | undefined;
  mobileDetailTitle?: string;
  // Mobile drawer props
  stats?: DashboardStats | null;
  projects?: Project[];
  isConnected?: boolean;
  selectedProject?: string | null;
  onSelectProject?: (projectPath: string | null) => void;
  onViewChange?: (view: ViewType) => void;
}

const LEFT_PANEL_KEY = 'leftPanel';
const MIDDLE_PANEL_KEY = 'middlePanel';

const DEFAULT_LEFT_WIDTH = 256;
const DEFAULT_MIDDLE_WIDTH = 320;

const MIN_LEFT_WIDTH = 200;
const MAX_LEFT_WIDTH = 400;
const MIN_MIDDLE_WIDTH = 240;
const MAX_MIDDLE_WIDTH = 500;

const MOBILE_BREAKPOINT = 1024;

export const Layout: React.FC<LayoutProps> = ({
  leftPanel,
  middlePanel,
  rightPanel,
  currentView,
  showMobileDetail = false,
  onMobileDetailBack,
  mobileDetailTitle,
  stats,
  projects = [],
  isConnected = false,
  selectedProject,
  onSelectProject,
  onViewChange,
}) => {
  const { isMobile, setIsMobile, isDrawerOpen, openDrawer, closeDrawer } = useMobile();
  const isTeamsView = currentView === 'teams';

  // Load stored widths from localStorage
  const [leftWidth, setLeftWidth] = useState(() => getStoredWidth(LEFT_PANEL_KEY, DEFAULT_LEFT_WIDTH));
  const [middleWidth, setMiddleWidth] = useState(() => getStoredWidth(MIDDLE_PANEL_KEY, DEFAULT_MIDDLE_WIDTH));

  // Handle responsive
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(newIsMobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  const handleLeftResize = useCallback((width: number) => {
    setLeftWidth(width);
    storeWidth(LEFT_PANEL_KEY, width);
  }, []);

  const handleMiddleResize = useCallback((width: number) => {
    setMiddleWidth(width);
    storeWidth(MIDDLE_PANEL_KEY, width);
  }, []);

  // Mobile drawer view change handler
  const handleMobileViewChange = useCallback((view: ViewType) => {
    onViewChange?.(view);
    closeDrawer();
  }, [onViewChange, closeDrawer]);

  // Mobile layout
  if (isMobile) {
    return (
      <div
        className="flex flex-col h-full w-full safe-area-top safe-area-bottom relative"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Mobile Header - Fixed at top using fixed positioning */}
        <div
          className="flex items-center px-4 py-3 border-b safe-area-left safe-area-right fixed top-0 left-0 right-0 z-50"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
            height: '56px',
          }}
        >
          {showMobileDetail ? (
            <>
              <MobileBackButton onClick={onMobileDetailBack} />
              <span className="ml-3 font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {mobileDetailTitle || '详情'}
              </span>
            </>
          ) : (
            <>
              <MobileDrawerTrigger onClick={openDrawer} />
              <span className="ml-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                Claude Viewer
              </span>
            </>
          )}
        </div>

        {/* Mobile Content - Add top padding to account for fixed header */}
        <div
          className="flex-1 overflow-hidden safe-area-left safe-area-right"
          style={{
            paddingTop: '56px',
            height: '100%',
          }}
        >
          {showMobileDetail ? rightPanel : middlePanel}
        </div>

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          currentView={currentView}
          onViewChange={handleMobileViewChange}
          stats={stats || null}
          projects={projects}
          isConnected={isConnected}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
        />
      </div>
    );
  }

  // Desktop layout
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
