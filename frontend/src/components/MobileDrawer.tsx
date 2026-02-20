import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  List,
  FolderGit2,
  Users,
  Circle,
  Moon,
  Sun,
  Eye,
  Languages,
  Check,
  X,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import type { ViewType, DashboardStats, Project } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import type { ThemeId } from '../styles/themes';

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  stats: DashboardStats | null;
  projects: Project[];
  isConnected: boolean;
  selectedProject?: string | null;
  onSelectProject?: (projectPath: string | null) => void;
}

interface NavItem {
  id: ViewType;
  labelKey: string;
  icon: LucideIcon;
  count?: number;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onViewChange,
  stats,
  projects,
  isConnected,
  selectedProject,
  onSelectProject,
}) => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useI18n();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  // Handle ESC key to close drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  // Swipe gesture handlers for closing drawer
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Only start swipe if touching near the edge of the drawer
    if (drawerRef.current) {
      const rect = drawerRef.current.getBoundingClientRect();
      if (touch.clientX > rect.right - 50) {
        setTouchStartX(touch.clientX);
        setTouchCurrentX(touch.clientX);
        setIsSwiping(true);
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || touchStartX === null) return;
    const touch = e.touches[0];
    setTouchCurrentX(touch.clientX);
  }, [isSwiping, touchStartX]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping || touchStartX === null || touchCurrentX === null) {
      setIsSwiping(false);
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }

    const swipeDistance = touchCurrentX - touchStartX;
    const minSwipeDistance = 80; // Minimum distance to trigger close

    if (swipeDistance < -minSwipeDistance) {
      // Swiped left (negative distance), close the drawer
      onClose();
    }

    setIsSwiping(false);
    setTouchStartX(null);
    setTouchCurrentX(null);
  }, [isSwiping, touchStartX, touchCurrentX, onClose]);

  // Calculate transform based on swipe progress
  const getSwipeTransform = useCallback(() => {
    if (!isSwiping || touchStartX === null || touchCurrentX === null) return 0;
    const diff = touchCurrentX - touchStartX;
    return Math.min(0, diff); // Only allow leftward movement
  }, [isSwiping, touchStartX, touchCurrentX]);

  // Touch feedback handlers
  const handleItemPressStart = useCallback((itemId: string) => {
    setPressedItem(itemId);
  }, []);

  const handleItemPressEnd = useCallback(() => {
    setPressedItem(null);
  }, []);

  const themeOptions: { id: ThemeId; icon: typeof Moon; label: string }[] = [
    { id: 'dark', icon: Moon, label: t('theme.dark') },
    { id: 'eyeCare', icon: Eye, label: t('theme.eyeCare') },
    { id: 'lightEyeCare', icon: Sun, label: t('theme.lightEyeCare') },
  ];

  const languageOptions: { id: 'zh-CN' | 'en'; label: string; flag: string }[] = [
    { id: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { id: 'en', label: 'EN', flag: '🇺🇸' },
  ];

  const navItems: NavItem[] = [
    { id: 'dashboard', labelKey: 'navigation.dashboard', icon: LayoutDashboard },
    { id: 'sessions', labelKey: 'navigation.sessions', icon: List, count: stats?.totalSessions },
    { id: 'teams', labelKey: 'navigation.agentTeams', icon: Users, count: stats?.totalTeams },
  ];

  const handleViewClick = (view: ViewType) => {
    if (view === 'sessions' || view === 'dashboard') {
      onSelectProject?.(null);
    }
    onViewChange(view);
    onClose();
  };

  const handleProjectClick = (projectPath: string) => {
    onSelectProject?.(projectPath);
    onViewChange('projects');
    onClose();
  };

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ease-in-out z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 h-full w-[280px] z-50 transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--bg-primary)',
          transform: isOpen && isSwiping
            ? `translateX(${getSwipeTransform()}px)`
            : undefined,
          transition: isSwiping ? 'none' : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t('navigation.menu')}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
              }}
            >
              <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--accent-blue-light)' }} />
            </div>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Claude Viewer
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Main Nav Items */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewClick(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150 border"
                  style={{
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    borderColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                  />
                  <span className="text-sm font-medium flex-1">{t(item.labelKey as never)}</span>
                  {item.count !== undefined && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-tertiary)',
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Projects Section */}
          <div className="mt-6">
            <div className="px-3 mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <FolderGit2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                {t('navigation.projects')}
              </span>
              <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                {stats?.totalProjects || 0}
              </span>
            </div>
            <div className="space-y-0.5">
              {projects.slice(0, 5).map((project) => {
                const isActive = selectedProject === project.path;
                return (
                  <button
                    key={project.path}
                    onClick={() => handleProjectClick(project.path)}
                    className="w-full px-3 py-2.5 text-left rounded-lg transition-all duration-150 border"
                    style={{
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                      borderColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                      />
                      <span className="text-sm truncate flex-1">{project.name}</span>
                      <span
                        className="text-xs"
                        style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                      >
                        {project.sessionCount}
                      </span>
                    </div>
                  </button>
                );
              })}
              {projects.length > 5 && (
                <div className="px-3 py-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  +{projects.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Settings & Connection Status */}
        <div
          className="absolute bottom-0 left-0 right-0 border-t"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          {/* Theme & Language Selectors */}
          <div className="px-4 py-3 space-y-3">
            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('settings.theme')}
              </span>
              <div className="flex-1 flex gap-1">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = theme === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setTheme(option.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-all border"
                      style={{
                        backgroundColor: isActive ? 'var(--accent-blue-subtle)' : 'var(--bg-tertiary)',
                        color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        borderColor: isActive ? 'var(--accent-blue)' : 'var(--border-secondary)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        }
                      }}
                      title={option.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {isActive && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Languages className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <div className="flex-1 flex gap-1">
                {languageOptions.map((option) => {
                  const isActive = locale === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setLocale(option.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-all border"
                      style={{
                        backgroundColor: isActive ? 'var(--accent-blue-subtle)' : 'var(--bg-tertiary)',
                        color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        borderColor: isActive ? 'var(--accent-blue)' : 'var(--border-secondary)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        }
                      }}
                      title={option.label}
                    >
                      <span>{option.flag}</span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Circle
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
                  color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
                }}
              />
              <span>{isConnected ? t('status.connected') : t('status.disconnected')}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
};

// Trigger button component for mobile
export interface MobileDrawerTriggerProps {
  onClick: () => void;
}

export const MobileDrawerTrigger: React.FC<MobileDrawerTriggerProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg transition-colors lg:hidden"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      aria-label="Open menu"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
};

export default MobileDrawer;
