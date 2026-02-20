import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { MessageSquare, FolderOpen, Search, Star, Trash2, RefreshCw, Tag, CheckSquare, Square, Filter, X } from 'lucide-react';
import { useMobile } from '../contexts/MobileContext';
import { formatRelativeTime } from '../utils/time';
import type { Session } from '../types';
import { isSystemContent } from '../types';
import { useSessionNames } from '../hooks/useSessionNames';
import { useSessionTags } from '../hooks/useSessionTags';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';
import { deleteSession } from '../api/delete';
import { useTranslation } from '../hooks/useTranslation';
import { useSwipe } from '../hooks/useSwipe';
import { useLongPress } from '../hooks/useLongPress';
import { useTimeRefresh, isSessionActive } from '../hooks/useTimeRefresh';

interface SessionListProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
  projectFilter?: string | null;
  onSessionDeleted?: (sessionId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // Batch selection props
  selectedSessionIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  enableBatchSelection?: boolean;
}

const getSessionTitle = (session: Session, emptyLabel: string): string => {
  if (session.inputs.length === 0) {
    return emptyLabel;
  }

  // Find the first non-system input
  const validInput = session.inputs.find(input => !isSystemContent(input.display));

  if (!validInput) {
    return emptyLabel;
  }

  const content = validInput.display || '';
  return content.slice(0, 50) + (content.length > 50 ? '...' : '');
};

// Swipeable Session Item Component
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

const SwipeableSessionItem: React.FC<SwipeableSessionItemProps> = ({
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
};

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedId,
  onSelect,
  projectFilter,
  onSessionDeleted,
  onRefresh,
  isRefreshing,
  selectedSessionIds = new Set(),
  onSelectionChange,
  enableBatchSelection = false,
}) => {
  const { t } = useTranslation();
  const { isMobile, closeDrawer } = useMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyStarred, setShowOnlyStarred] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const { getSessionName, hasCustomName } = useSessionNames();
  const { getSessionTags, getAllTags, getTagCounts } = useSessionTags();

  // Local state for batch selection when not controlled externally
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());

  // Use external or local selection state
  const effectiveSelectedIds = onSelectionChange ? selectedSessionIds : localSelectedIds;
  const effectiveOnSelectionChange = onSelectionChange || setLocalSelectedIds;

  const allTags = useMemo(() => getAllTags(), [getAllTags]);
  const tagCounts = useMemo(() => getTagCounts(), [getTagCounts]);

  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    if (projectFilter) {
      filtered = filtered.filter((s) => s.project === projectFilter);
    }

    // Filter by custom name (starred) toggle
    if (showOnlyStarred) {
      filtered = filtered.filter((s) => hasCustomName(s.sessionId));
    }

    // Filter by selected tag
    if (selectedTag) {
      filtered = filtered.filter((s) => {
        const sessionTags = getSessionTags(s.sessionId);
        return sessionTags.includes(selectedTag);
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((session) => {
        const customName = getSessionName(session.sessionId);
        const title = customName || getSessionTitle(session, t('session.emptySession'));
        const project = session.project.toLowerCase();
        const tags = getSessionTags(session.sessionId);
        return (
          title.toLowerCase().includes(query) ||
          project.includes(query) ||
          tags.some((tag) => tag.includes(query))
        );
      });
    }

    // Sort: by updatedAt only (no special treatment for starred sessions)
    return [...filtered].sort((a, b) => {
      return b.updatedAt - a.updatedAt;
    });
  }, [sessions, searchQuery, projectFilter, showOnlyStarred, selectedTag, getSessionTags]);

  const handleDeleteClick = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setDeletingSession(session);
  };

  // Batch selection handlers
  const handleToggleSelection = useCallback((e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const newSelection = new Set(effectiveSelectedIds);
    if (newSelection.has(sessionId)) {
      newSelection.delete(sessionId);
    } else {
      newSelection.add(sessionId);
    }
    effectiveOnSelectionChange(newSelection);
  }, [effectiveSelectedIds, effectiveOnSelectionChange]);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredSessions.map(s => s.sessionId));
    effectiveOnSelectionChange(allIds);
  }, [filteredSessions, effectiveOnSelectionChange]);

  const handleClearSelection = useCallback(() => {
    effectiveOnSelectionChange(new Set());
  }, [effectiveOnSelectionChange]);

  const handleConfirmDelete = async () => {
    if (!deletingSession) return;

    const sessionId = deletingSession.sessionId;
    try {
      await deleteSession(sessionId);
      onSessionDeleted?.(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert(t('session.deleteError'));
    } finally {
      setDeletingSession(null);
    }
  };

  // Expose selection methods via ref-like pattern through props
  const batchSelectionCount = effectiveSelectedIds.size;

  // Handle session select with mobile drawer close
  const handleSessionSelect = useCallback((session: Session) => {
    onSelect(session);
    if (isMobile) {
      closeDrawer();
    }
  }, [onSelect, isMobile, closeDrawer]);

  // Toggle favorite (custom name) for a session
  const handleToggleFavorite = useCallback((sessionId: string) => {
    const currentName = getSessionName(sessionId);
    const hasCustom = hasCustomName(sessionId);

    if (hasCustom) {
      // Remove custom name to unfavorite
      localStorage.removeItem(`session_name_${sessionId}`);
    } else {
      // Add a default favorite name
      localStorage.setItem(`session_name_${sessionId}`, t('session.favorite'));
    }

    // Trigger storage event to update other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: `session_name_${sessionId}`,
      newValue: hasCustom ? null : t('session.favorite'),
    }));
  }, [getSessionName, hasCustomName, t]);

  // Handle long press to enter batch selection mode
  const handleLongPress = useCallback((sessionId: string) => {
    if (!enableBatchSelection) return;

    const newSelection = new Set(effectiveSelectedIds);
    newSelection.add(sessionId);
    effectiveOnSelectionChange(newSelection);
  }, [enableBatchSelection, effectiveSelectedIds, effectiveOnSelectionChange]);

  // Show toast message
  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

  // Handle refresh with toast
  const handleRefresh = useCallback(() => {
    onRefresh?.();
    showToastMessage(t('common.refresh'));
  }, [onRefresh, showToastMessage, t]);

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
          <MessageSquare className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {projectFilter ? `${t('filter.project')}: ${projectFilter}` : t('navigation.sessions')}
          </span>

          {/* Refresh button - icon only on mobile */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={t('common.refresh')}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all disabled:opacity-50 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 justify-center"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Mobile filter toggle */}
          {isMobile && (
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              title={t('filter.title')}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-xs transition-all"
              style={{
                backgroundColor: (showOnlyStarred || selectedTag) ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                color: (showOnlyStarred || selectedTag) ? 'rgb(96, 165, 250)' : 'var(--text-muted)',
                border: `1px solid ${(showOnlyStarred || selectedTag) ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
              }}
            >
              <Filter className="w-4 h-4" />
            </button>
          )}

          {/* Desktop: Star toggle button */}
          {!isMobile && (
            <button
              onClick={() => setShowOnlyStarred(!showOnlyStarred)}
              title={showOnlyStarred ? t('common.all') : t('filter.showOnlyStarred')}
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all"
              style={{
                backgroundColor: showOnlyStarred ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-tertiary)',
                color: showOnlyStarred ? 'rgb(234, 179, 8)' : 'var(--text-muted)',
                border: `1px solid ${showOnlyStarred ? 'rgba(234, 179, 8, 0.3)' : 'var(--border-primary)'}`,
              }}
            >
              <Star className="w-3 h-3" fill={showOnlyStarred ? 'currentColor' : 'none'} />
              <span>{showOnlyStarred ? t('common.all') : t('filter.showOnlyStarred')}</span>
            </button>
          )}

          {/* Desktop: Tag filter button */}
          {!isMobile && allTags.length > 0 && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setSelectedTag(selectedTag ? null : allTags[0])}
                title={selectedTag ? t('filter.clearFilters') : t('tag.title')}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all"
                style={{
                  backgroundColor: selectedTag ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                  color: selectedTag ? 'rgb(96, 165, 250)' : 'var(--text-muted)',
                  border: `1px solid ${selectedTag ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
                }}
              >
                <Tag className="w-3 h-3" />
                <span>{selectedTag || t('tag.title')}</span>
                {selectedTag && (
                  <span
                    className="ml-1 px-1 rounded text-[10px]"
                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }}
                  >
                    {tagCounts[selectedTag] || 0}
                  </span>
                )}
              </button>
            </div>
          )}

          <span
            className="text-sm px-2 py-0.5 rounded-full hidden sm:inline-block"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            {filteredSessions.length}
          </span>

          {/* Batch selection toggle */}
          {enableBatchSelection && (
            <button
              onClick={() => effectiveOnSelectionChange(new Set())}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all min-h-[44px] md:min-h-0"
              style={{
                backgroundColor: batchSelectionCount > 0 ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                color: batchSelectionCount > 0 ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: `1px solid ${batchSelectionCount > 0 ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
              }}
              title={batchSelectionCount > 0 ? t('status.selected', { count: batchSelectionCount }) : t('common.selectAll')}
            >
              <CheckSquare className="w-3 h-3" />
              <span className="hidden sm:inline">{batchSelectionCount > 0 ? batchSelectionCount : t('common.selectAll')}</span>
            </button>
          )}
        </div>

        {/* Mobile Filter Panel */}
        {isMobile && showMobileFilters && (
          <div className="mb-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('filter.title')}</span>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-1 rounded"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Star filter */}
              <button
                onClick={() => setShowOnlyStarred(!showOnlyStarred)}
                className="flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all min-h-[44px]"
                style={{
                  backgroundColor: showOnlyStarred ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-tertiary)',
                  color: showOnlyStarred ? 'rgb(234, 179, 8)' : 'var(--text-muted)',
                  border: `1px solid ${showOnlyStarred ? 'rgba(234, 179, 8, 0.3)' : 'var(--border-primary)'}`,
                }}
              >
                <Star className="w-4 h-4" fill={showOnlyStarred ? 'currentColor' : 'none'} />
                <span>{showOnlyStarred ? t('common.all') : t('filter.showOnlyStarred')}</span>
              </button>

              {/* Tag filters */}
              {allTags.slice(0, 5).map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all min-h-[44px]"
                    style={{
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                      color: isSelected ? 'rgb(96, 165, 250)' : 'var(--text-muted)',
                      border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
                    }}
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tag Filter Bar - Desktop only */}
        {!isMobile && allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {allTags.slice(0, 8).map((tag) => {
              const isSelected = selectedTag === tag;
              const count = tagCounts[tag] || 0;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'var(--bg-tertiary)',
                    color: isSelected ? 'rgb(96, 165, 250)' : 'var(--text-muted)',
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
                  }}
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <span
                    className="ml-0.5 px-1 rounded text-[10px]"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(59, 130, 246, 0.3)'
                        : 'var(--bg-secondary)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2 py-0.5 rounded-full text-xs transition-all"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                {t('filter.clearFilters')}
              </button>
            )}
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          >
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('filter.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-2 md:py-1.5 rounded-lg text-base md:text-sm transition-colors focus:outline-none min-h-[44px] md:min-h-0"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3 border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <Search className="w-5 h-5 opacity-40" />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? t('empty.noSearchResults') : t('empty.noSessions')}
            </p>
          </div>
        ) : (
          <div className="py-2 px-2">
            {filteredSessions.map((session) => {
              const isSelected = selectedId === session.sessionId;
              const isBatchSelected = effectiveSelectedIds.has(session.sessionId);
              const customName = getSessionName(session.sessionId);
              const hasCustom = !!customName;
              const title = customName || getSessionTitle(session, t('session.emptySession'));

              return (
                <SwipeableSessionItem
                  key={session.sessionId}
                  session={session}
                  isSelected={isSelected}
                  isBatchSelected={isBatchSelected}
                  hasCustom={hasCustom}
                  title={title}
                  customName={customName}
                  enableBatchSelection={enableBatchSelection}
                  batchSelectionCount={batchSelectionCount}
                  onSelect={handleSessionSelect}
                  onDelete={setDeletingSession}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleSelection={(sessionId) => {
                    const mockEvent = { stopPropagation: () => {} } as React.MouseEvent;
                    handleToggleSelection(mockEvent, sessionId);
                  }}
                  onLongPress={handleLongPress}
                  getSessionTags={getSessionTags}
                  t={t}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingSession}
        title={t('common.delete')}
        message={
          deletingSession
            ? t('session.deleteSingleConfirm')
            : ''
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingSession(null)}
        isDestructive={true}
      />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default SessionList;
