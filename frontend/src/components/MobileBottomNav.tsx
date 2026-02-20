import React, { useState, useCallback } from 'react';
import {
  LayoutDashboard,
  List,
  Users,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { ViewType } from '../types';
import { useTranslation } from '../hooks/useTranslation';

export interface MobileBottomNavBadge {
  view: ViewType;
  count: number;
}

export interface MobileBottomNavProps {
  /** Current active view */
  currentView: ViewType;
  /** Callback when view changes */
  onViewChange: (view: ViewType) => void;
  /** Optional callback for More menu */
  onMorePress?: () => void;
  /** Badge configuration for unread counts */
  badges?: MobileBottomNavBadge[];
}

interface NavItem {
  id: Exclude<ViewType, 'projects'>;
  labelKey: string;
  icon: LucideIcon;
}

/**
 * Mobile bottom navigation bar component
 * Fixed at the bottom of the screen on mobile devices
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  onMorePress,
  badges = [],
}) => {
  const { t } = useTranslation();
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  const navItems: NavItem[] = [
    { id: 'dashboard', labelKey: 'navigation.dashboard', icon: LayoutDashboard },
    { id: 'sessions', labelKey: 'navigation.sessions', icon: List },
    { id: 'teams', labelKey: 'navigation.agentTeams', icon: Users },
  ];

  const handleNavClick = useCallback((viewId: Exclude<ViewType, 'projects'>) => {
    onViewChange(viewId);
  }, [onViewChange]);

  const handleMoreClick = useCallback(() => {
    onMorePress?.();
  }, [onMorePress]);

  const handleTouchStart = useCallback((itemId: string) => {
    setPressedItem(itemId);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setPressedItem(null);
  }, []);

  // Check if a nav item is active
  // For 'projects' view, we consider 'sessions' as active since they're related
  const isActive = useCallback((itemId: Exclude<ViewType, 'projects'>) => {
    if (currentView === 'projects') {
      return itemId === 'sessions';
    }
    return currentView === itemId;
  }, [currentView]);

  // Get badge count for a view
  const getBadgeCount = useCallback((viewId: ViewType): number | undefined => {
    const badge = badges.find(b => b.view === viewId);
    return badge?.count;
  }, [badges]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          const isPressed = pressedItem === item.id;
          const badgeCount = getBadgeCount(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              onTouchStart={() => handleTouchStart(item.id)}
              onTouchEnd={handleTouchEnd}
              onMouseDown={() => handleTouchStart(item.id)}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 active:scale-95"
              style={{
                color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                transform: isPressed ? 'scale(0.92)' : 'scale(1)',
              }}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className="w-5 h-5 transition-transform duration-200"
                  style={{
                    color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                    transform: active ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                />
                {/* Badge for unread counts */}
                {badgeCount !== undefined && badgeCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 animate-in fade-in zoom-in duration-200"
                    style={{
                      backgroundColor: 'var(--accent-red)',
                      color: '#ffffff',
                    }}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span
                className="text-xs font-medium transition-all duration-200"
                style={{
                  color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {t(item.labelKey as never)}
              </span>
              {/* Active indicator dot */}
              {active && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full animate-in fade-in zoom-in duration-200"
                  style={{ backgroundColor: 'var(--accent-blue)' }}
                />
              )}
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={handleMoreClick}
          onTouchStart={() => handleTouchStart('more')}
          onTouchEnd={handleTouchEnd}
          onMouseDown={() => handleTouchStart('more')}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 active:scale-95"
          style={{
            color: 'var(--text-muted)',
            transform: pressedItem === 'more' ? 'scale(0.92)' : 'scale(1)',
          }}
          aria-label={t('common.more')}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-xs font-medium">{t('common.more')}</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
