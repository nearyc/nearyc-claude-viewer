import React, { useRef, useState, useEffect, useMemo } from 'react';
import { FolderOpen, Star, Trash2, Tag, CheckSquare, Square } from 'lucide-react';
import { useMobile } from '../contexts/MobileContext';
import { formatRelativeTime } from '../utils/time';
import type { Session } from '../types';
import { useSwipe } from '../hooks/useSwipe';
import { useLongPress } from '../hooks/useLongPress';
import { useTimeRefresh, isSessionActive } from '../hooks/useTimeRefresh';

interface SwipeableSessionItemProps {
  session: Session;
  isSelected: boolean;
  isBatchSelected: boolean;
  hasCustom: boolean;
  title: string;
  customName: string | undefined;
  enableBatchSelection: boolean;
  batchSelectionCount: number;
  onSelect: (session: Session) => void;
  onDelete: (session: Session) => void;
  onToggleFavorite: (sessionId: string) => void;
  onToggleSelection: (sessionId: string) => void;
  onLongPress: (sessionId: string) => void;
  getSessionTags: (sessionId: string) => string[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const SwipeableSessionItem: React.FC<SwipeableSessionItemProps> = React.memo(({
  session,
  isSelected,
  isBatchSelected,
  hasCustom,
  title,
  customName,
  enableBatchSelection,
  batchSelectionCount,
  onSelect,
  onDelete,
  onToggleFavorite,
  onToggleSelection,
  onLongPress,
  getSessionTags,
  t,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const { isMobile } = useMobile();

  // Time refresh to update relative time display
  useTimeRefresh(10000); // Refresh every 10 seconds

  // Check if session is actively running (updated within last 20 seconds)
  const isActive = useMemo(() => isSessionActive(session), [session.updatedAt]);

  // Swipe handlers
  useSwipe(itemRef, {
    onSwipeLeft: () => {
      if (isMobile) {
        setSwipeOffset(-80); // Show delete button
      }
    },
    onSwipeRight: () => {
      if (isMobile) {
        setSwipeOffset(80); // Show favorite button
      }
    },
    threshold: 50,
  });

  // Long press handler for batch selection
  const { bind: bindLongPress, isPressing } = useLongPress({
    onLongPress: () => {
      onLongPress(session.sessionId);
    },
    onClick: () => {
      onSelect(session);
    },
    delay: 500,
    preventContextMenu: true,
  });

  // Apply long press binding when ref is available (mobile always needs click handling)
  useEffect(() => {
    if (itemRef.current && isMobile) {
      return bindLongPress(itemRef.current);
    }
  }, [bindLongPress, isMobile]);

  // Close swipe on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(event.target as Node)) {
        setSwipeOffset(0);
      }
    };

    if (swipeOffset !== 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [swipeOffset]);

  const sessionTags = getSessionTags(session.sessionId);

  return (
    <div className="relative overflow-hidden">
      {/* Swipe Actions Background */}
      {isMobile && (
        <div className="absolute inset-0 flex justify-between items-center px-4">
          {/* Right swipe - Favorite action */}
          <button
            onClick={() => {
              onToggleFavorite(session.sessionId);
              setSwipeOffset(0);
            }}
            className="flex items-center justify-center w-16 h-full rounded-l-lg transition-colors"
            style={{
              backgroundColor: hasCustom ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.2)',
              color: 'rgb(234, 179, 8)',
            }}
          >
            <Star className="w-6 h-6" fill={hasCustom ? 'currentColor' : 'none'} />
          </button>

          {/* Left swipe - Delete action */}
          <button
            onClick={() => {
              onDelete(session);
              setSwipeOffset(0);
            }}
            className="flex items-center justify-center w-16 h-full rounded-r-lg transition-colors"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: 'rgb(239, 68, 68)',
            }}
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Session Item */}
      <div
        ref={itemRef}
        onClick={() => {
          // Only handle click directly on desktop (mobile uses long press hook)
          if (!isMobile) {
            onSelect(session);
          }
        }}
        className={`w-full px-3 py-2 md:py-1.5 text-left rounded-lg transition-all duration-150 border-2 group relative cursor-pointer min-h-[56px] md:min-h-0 flex flex-col justify-center ${
          isPressing ? 'scale-[0.98]' : ''
        } ${isActive ? 'animate-pulse-subtle' : ''}`}
        style={{
          backgroundColor: isSelected
            ? 'rgba(59, 130, 246, 0.1)'
            : isBatchSelected
              ? 'rgba(59, 130, 246, 0.05)'
              : hasCustom
                ? 'rgba(234, 179, 8, 0.05)'
                : 'var(--bg-primary)',
          borderColor: isSelected
            ? 'rgba(59, 130, 246, 0.3)'
            : isBatchSelected
              ? 'rgba(59, 130, 246, 0.2)'
              : isActive
                ? 'rgba(34, 197, 94, 0.6)'
                : hasCustom
                  ? 'rgba(234, 179, 8, 0.2)'
                  : 'var(--border-primary)',
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
          boxShadow: isActive ? '0 0 8px rgba(34, 197, 94, 0.2)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected && !isMobile) {
            e.currentTarget.style.backgroundColor = isBatchSelected
              ? 'rgba(59, 130, 246, 0.1)'
              : isActive
                ? 'rgba(34, 197, 94, 0.08)'
                : hasCustom
                  ? 'rgba(234, 179, 8, 0.1)'
                  : 'var(--bg-hover)';
            e.currentTarget.style.borderColor = isBatchSelected
              ? 'rgba(59, 130, 246, 0.3)'
              : isActive
                ? 'rgba(34, 197, 94, 0.8)'
                : hasCustom
                  ? 'rgba(234, 179, 8, 0.3)'
                  : 'var(--border-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected && !isMobile) {
            e.currentTarget.style.backgroundColor = isBatchSelected
              ? 'rgba(59, 130, 246, 0.05)'
              : isActive
                ? 'rgba(34, 197, 94, 0.05)'
                : hasCustom
                  ? 'rgba(234, 179, 8, 0.05)'
                  : 'var(--bg-primary)';
            e.currentTarget.style.borderColor = isBatchSelected
              ? 'rgba(59, 130, 246, 0.2)'
              : isActive
                ? 'rgba(34, 197, 94, 0.6)'
                : hasCustom
                  ? 'rgba(234, 179, 8, 0.2)'
                  : 'var(--border-primary)';
          }
        }}
      >
        <div className="flex items-center gap-2 mb-0.5 md:mb-0.5">
          {/* Batch selection checkbox */}
          {(enableBatchSelection || batchSelectionCount > 0) && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection(session.sessionId);
              }}
              className="flex-shrink-0 p-1 rounded transition-colors cursor-pointer min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-0.5 flex items-center justify-center"
              style={{
                color: isBatchSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {isBatchSelected ? (
                <CheckSquare className="w-5 h-5 md:w-3.5 md:h-3.5" fill="currentColor" />
              ) : (
                <Square className="w-5 h-5 md:w-3.5 md:h-3.5" />
              )}
            </span>
          )}
          {hasCustom && (
            <Star
              className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 flex-shrink-0"
              style={{ color: 'rgb(234, 179, 8)' }}
              fill="currentColor"
            />
          )}
          <div
            className="font-medium text-sm truncate"
            style={{
              color: isSelected
                ? 'var(--accent-blue-light)'
                : hasCustom
                  ? 'rgb(234, 179, 8)'
                  : 'var(--text-secondary)',
            }}
          >
            {title}
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 text-xs md:text-xs mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <FolderOpen className="w-3 h-3 md:w-3 md:h-3" />
          <span className="truncate">{session.project}</span>
        </div>

        {/* Session Tags - Hidden on mobile */}
        {sessionTags.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-1 mb-2">
            {sessionTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: 'rgb(96, 165, 250)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <Tag className="w-2.5 h-2.5 mr-0.5" />
                {tag}
              </span>
            ))}
            {sessionTags.length > 3 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                }}
              >
                +{sessionTags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-muted)' }}>
            {session.inputCount} {t('session.inputs')}
          </span>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-tertiary)' }}>
              {formatRelativeTime(session.updatedAt)}
            </span>
            {/* Delete button - Hidden on mobile, visible on hover for desktop */}
            <span
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session);
              }}
              className="hidden md:flex p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer min-h-0 min-w-0 items-center justify-center"
              style={{
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-red)';
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={t('common.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prev.session.sessionId === next.session.sessionId &&
    prev.session.updatedAt === next.session.updatedAt &&
    prev.isSelected === next.isSelected &&
    prev.isBatchSelected === next.isBatchSelected &&
    prev.hasCustom === next.hasCustom &&
    prev.title === next.title
  );
});

export default SwipeableSessionItem;
