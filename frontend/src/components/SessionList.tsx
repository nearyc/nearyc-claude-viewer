import React, { useState, useMemo, useCallback } from 'react';
import { MessageSquare, Search, Star, Trash2, RefreshCw, Tag, CheckSquare, Filter, X, Hash } from 'lucide-react';
import { useMobile } from '../contexts/MobileContext';
import type { Session } from '../types';
import { isSystemContent } from '../utils/session';
import { useSessionNames } from '../hooks/useSessionNames';
import { useSessionTags } from '../hooks/useSessionTags';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';
import { deleteSession } from '../api/delete';
import { useTranslation } from '../hooks/useTranslation';
import { SwipeableSessionItem } from './SwipeableSessionItem';

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
  // Message count filter states
  const [minMessageCount, setMinMessageCount] = useState<number | null>(null);
  const [maxMessageCount, setMaxMessageCount] = useState<number | null>(null);
  const [showMessageCountFilter, setShowMessageCountFilter] = useState(false);
  const { getSessionName, hasCustomName, setSessionName, removeSessionName } = useSessionNames();
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

    // Filter by message count range
    if (minMessageCount !== null) {
      filtered = filtered.filter((s) => s.messageCount >= minMessageCount);
    }
    if (maxMessageCount !== null) {
      filtered = filtered.filter((s) => s.messageCount <= maxMessageCount);
    }

    // Sort: by updatedAt only (no special treatment for starred sessions)
    return [...filtered].sort((a, b) => {
      return b.updatedAt - a.updatedAt;
    });
  }, [sessions, searchQuery, projectFilter, showOnlyStarred, selectedTag, getSessionTags, minMessageCount, maxMessageCount]);

  const handleDeleteClick = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setDeletingSession(session);
  };

  // Batch selection handlers
  const handleToggleSelection = useCallback((sessionId: string) => {
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
  const handleToggleFavorite = useCallback(async (sessionId: string) => {
    const hasCustom = hasCustomName(sessionId);

    if (hasCustom) {
      // Remove custom name to unfavorite
      await removeSessionName(sessionId);
    } else {
      // Add a default favorite name
      await setSessionName(sessionId, t('session.favorite'));
    }
  }, [hasCustomName, removeSessionName, setSessionName, t]);

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
                backgroundColor: (showOnlyStarred || selectedTag || minMessageCount !== null || maxMessageCount !== null) ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                color: (showOnlyStarred || selectedTag || minMessageCount !== null || maxMessageCount !== null) ? 'rgb(96, 165, 250)' : 'var(--text-muted)',
                border: `1px solid ${(showOnlyStarred || selectedTag || minMessageCount !== null || maxMessageCount !== null) ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
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

          {/* Desktop: Message count filter button */}
          {!isMobile && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowMessageCountFilter(!showMessageCountFilter)}
                title={t('filter.messageCount') || 'Message Count'}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all"
                style={{
                  backgroundColor: (minMessageCount !== null || maxMessageCount !== null) ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-tertiary)',
                  color: (minMessageCount !== null || maxMessageCount !== null) ? 'rgb(16, 185, 129)' : 'var(--text-muted)',
                  border: `1px solid ${(minMessageCount !== null || maxMessageCount !== null) ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-primary)'}`,
                }}
              >
                <Hash className="w-3 h-3" />
                <span>
                  {minMessageCount !== null && maxMessageCount !== null
                    ? `${minMessageCount}-${maxMessageCount}`
                    : minMessageCount !== null
                    ? `>${minMessageCount}`
                    : maxMessageCount !== null
                    ? `<${maxMessageCount}`
                    : t('filter.messageCount') || 'Count'}
                </span>
              </button>

              {/* Message count filter dropdown */}
              {showMessageCountFilter && (
                <div
                  className="absolute top-full left-0 mt-2 p-3 rounded-lg border shadow-lg z-50 min-w-[200px]"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <div className="space-y-3">
                    {/* Min message count */}
                    <div>
                      <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {t('filter.minMessages') || 'Min Messages'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={minMessageCount ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : null;
                          setMinMessageCount(val);
                        }}
                        placeholder="0"
                        className="w-full px-2 py-1 rounded text-sm"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    {/* Max message count */}
                    <div>
                      <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {t('filter.maxMessages') || 'Max Messages'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={maxMessageCount ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : null;
                          setMaxMessageCount(val);
                        }}
                        placeholder="∞"
                        className="w-full px-2 py-1 rounded text-sm"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    {/* Quick options */}
                    <div className="flex flex-wrap gap-1">
                      {[10, 50, 100].map((count) => (
                        <button
                          key={`min-${count}`}
                          onClick={() => {
                            setMinMessageCount(count);
                            setMaxMessageCount(null);
                          }}
                          className="px-2 py-0.5 rounded text-xs transition-colors"
                          style={{
                            backgroundColor: minMessageCount === count && maxMessageCount === null
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'var(--bg-tertiary)',
                            color: minMessageCount === count && maxMessageCount === null
                              ? 'rgb(16, 185, 129)'
                              : 'var(--text-muted)',
                            border: '1px solid var(--border-primary)',
                          }}
                        >
                          {'>'}{count}
                        </button>
                      ))}
                      {[10, 50].map((count) => (
                        <button
                          key={`max-${count}`}
                          onClick={() => {
                            setMinMessageCount(null);
                            setMaxMessageCount(count);
                          }}
                          className="px-2 py-0.5 rounded text-xs transition-colors"
                          style={{
                            backgroundColor: maxMessageCount === count && minMessageCount === null
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'var(--bg-tertiary)',
                            color: maxMessageCount === count && minMessageCount === null
                              ? 'rgb(16, 185, 129)'
                              : 'var(--text-muted)',
                            border: '1px solid var(--border-primary)',
                          }}
                        >
                          {'<'}{count}
                        </button>
                      ))}
                    </div>

                    {/* Clear button */}
                    {(minMessageCount !== null || maxMessageCount !== null) && (
                      <button
                        onClick={() => {
                          setMinMessageCount(null);
                          setMaxMessageCount(null);
                        }}
                        className="w-full px-2 py-1 rounded text-xs transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-primary)',
                        }}
                      >
                        {t('filter.clear') || 'Clear'}
                      </button>
                    )}
                  </div>
                </div>
              )}
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
              onClick={() => {
                if (batchSelectionCount > 0) {
                  // Clear selection if items are selected
                  effectiveOnSelectionChange(new Set());
                } else {
                  // Select all filtered sessions if nothing is selected
                  handleSelectAll();
                }
              }}
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

              {/* Message count quick filters */}
              {[10, 50, 100].map((count) => (
                <button
                  key={`mobile-min-${count}`}
                  onClick={() => {
                    if (minMessageCount === count && maxMessageCount === null) {
                      setMinMessageCount(null);
                    } else {
                      setMinMessageCount(count);
                      setMaxMessageCount(null);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all min-h-[44px]"
                  style={{
                    backgroundColor: minMessageCount === count && maxMessageCount === null
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'var(--bg-tertiary)',
                    color: minMessageCount === count && maxMessageCount === null
                      ? 'rgb(16, 185, 129)'
                      : 'var(--text-muted)',
                    border: `1px solid ${minMessageCount === count && maxMessageCount === null
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'var(--border-primary)'}`,
                  }}
                >
                  <Hash className="w-3 h-3" />
                  {'>'}{count}
                </button>
              ))}

              {/* Clear all filters */}
              {(showOnlyStarred || selectedTag || minMessageCount !== null || maxMessageCount !== null) && (
                <button
                  onClick={() => {
                    setShowOnlyStarred(false);
                    setSelectedTag(null);
                    setMinMessageCount(null);
                    setMaxMessageCount(null);
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all min-h-[44px]"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <X className="w-3 h-3" />
                  {t('filter.clearFilters')}
                </button>
              )}
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
                  onSelect={handleSessionSelect}
                  onDelete={setDeletingSession}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleSelection={handleToggleSelection}
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
