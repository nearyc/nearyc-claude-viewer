import React, { useState, useMemo, useCallback } from 'react';
import { MessageSquare, FolderOpen, Search, Star, Trash2, RefreshCw, Tag, CheckSquare, Square } from 'lucide-react';
import { formatRelativeTime } from '../utils/time';
import type { Session } from '../types';
import { isSystemContent } from '../types';
import { useSessionNames } from '../hooks/useSessionNames';
import { useSessionTags } from '../hooks/useSessionTags';
import { ConfirmDialog } from './ConfirmDialog';
import { deleteSession } from '../api/delete';

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

const getSessionTitle = (session: Session): string => {
  if (session.inputs.length === 0) {
    return 'Empty Session';
  }

  // Find the first non-system input
  const validInput = session.inputs.find(input => !isSystemContent(input.display));

  if (!validInput) {
    return 'Empty Session';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyStarred, setShowOnlyStarred] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
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
        const title = customName || getSessionTitle(session);
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
      alert('删除会话失败，请重试');
    } finally {
      setDeletingSession(null);
    }
  };

  // Expose selection methods via ref-like pattern through props
  const batchSelectionCount = effectiveSelectedIds.size;

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
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
        }}
      >
        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
          <MessageSquare className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {projectFilter ? `Project: ${projectFilter}` : 'All Sessions'}
          </span>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="刷新列表"
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Star toggle button */}
          <button
            onClick={() => setShowOnlyStarred(!showOnlyStarred)}
            title={showOnlyStarred ? '显示所有会话' : '只显示已收藏会话'}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all"
            style={{
              backgroundColor: showOnlyStarred ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-tertiary)',
              color: showOnlyStarred ? 'rgb(234, 179, 8)' : 'var(--text-muted)',
              border: `1px solid ${showOnlyStarred ? 'rgba(234, 179, 8, 0.3)' : 'var(--border-primary)'}`,
            }}
          >
            <Star className="w-3 h-3" fill={showOnlyStarred ? 'currentColor' : 'none'} />
            <span>{showOnlyStarred ? '已收藏' : '全部'}</span>
          </button>

          {/* Tag filter button */}
          {allTags.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setSelectedTag(selectedTag ? null : allTags[0])}
                title={selectedTag ? '清除标签筛选' : '按标签筛选'}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all"
                style={{
                  backgroundColor: selectedTag ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                  color: selectedTag ? 'rgb(96, 165, 250)' : 'var(--text-muted)',
                  border: `1px solid ${selectedTag ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
                }}
              >
                <Tag className="w-3 h-3" />
                <span>{selectedTag || '标签'}</span>
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
            className="text-sm px-2 py-0.5 rounded-full"
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
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all"
              style={{
                backgroundColor: batchSelectionCount > 0 ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                color: batchSelectionCount > 0 ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: `1px solid ${batchSelectionCount > 0 ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
              }}
              title={batchSelectionCount > 0 ? `${batchSelectionCount} selected` : 'Enable batch selection'}
            >
              <CheckSquare className="w-3 h-3" />
              <span>{batchSelectionCount > 0 ? batchSelectionCount : 'Select'}</span>
            </button>
          )}
        </div>

        {/* Tag Filter Bar */}
        {allTags.length > 0 && (
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
                清除筛选
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
            placeholder="Search sessions..."
            className="w-full pl-9 pr-8 py-2 rounded-lg text-sm transition-colors focus:outline-none"
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
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <Search className="w-5 h-5 opacity-40" />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? 'No sessions match your search' : 'No sessions available'}
            </p>
          </div>
        ) : (
          <div className="py-2 px-2">
            {filteredSessions.map((session) => {
              const isSelected = selectedId === session.sessionId;
              const isBatchSelected = effectiveSelectedIds.has(session.sessionId);
              const customName = getSessionName(session.sessionId);
              const hasCustom = !!customName;
              const title = customName || getSessionTitle(session);

              return (
                <div
                  key={session.sessionId}
                  onClick={() => onSelect(session)}
                  className="w-full px-3 py-3 text-left rounded-lg transition-all duration-150 border group relative cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(59, 130, 246, 0.1)'
                      : isBatchSelected
                        ? 'rgba(59, 130, 246, 0.05)'
                        : hasCustom
                          ? 'rgba(234, 179, 8, 0.05)'
                          : 'transparent',
                    borderColor: isSelected
                      ? 'rgba(59, 130, 246, 0.3)'
                      : isBatchSelected
                        ? 'rgba(59, 130, 246, 0.2)'
                        : hasCustom
                          ? 'rgba(234, 179, 8, 0.2)'
                          : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = isBatchSelected
                        ? 'rgba(59, 130, 246, 0.1)'
                        : hasCustom
                          ? 'rgba(234, 179, 8, 0.1)'
                          : 'var(--bg-hover)';
                      e.currentTarget.style.borderColor = isBatchSelected
                        ? 'rgba(59, 130, 246, 0.3)'
                        : hasCustom
                          ? 'rgba(234, 179, 8, 0.3)'
                          : 'var(--border-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = isBatchSelected
                        ? 'rgba(59, 130, 246, 0.05)'
                        : hasCustom
                          ? 'rgba(234, 179, 8, 0.05)'
                          : 'transparent';
                      e.currentTarget.style.borderColor = isBatchSelected
                        ? 'rgba(59, 130, 246, 0.2)'
                        : hasCustom
                          ? 'rgba(234, 179, 8, 0.2)'
                          : 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {/* Batch selection checkbox */}
                    {(enableBatchSelection || batchSelectionCount > 0) && (
                      <span
                        onClick={(e) => handleToggleSelection(e, session.sessionId)}
                        className="flex-shrink-0 p-0.5 rounded transition-colors cursor-pointer"
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
                          <CheckSquare className="w-4 h-4" fill="currentColor" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </span>
                    )}
                    {hasCustom && (
                      <Star
                        className="w-3.5 h-3.5 flex-shrink-0"
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
                    className="flex items-center gap-1.5 text-xs mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span className="truncate">{session.project}</span>
                  </div>

                  {/* Session Tags */}
                  {(() => {
                    const sessionTags = getSessionTags(session.sessionId);
                    if (sessionTags.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1 mb-2">
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
                    );
                  })()}

                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>
                      {session.inputCount} input{session.inputCount !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {formatRelativeTime(session.updatedAt)}
                      </span>
                      {/* Delete button */}
                      <span
                        onClick={(e) => handleDeleteClick(e, session)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                        title="删除会话"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingSession}
        title="删除会话"
        message={
          deletingSession
            ? `确定要删除会话 "${getSessionName(deletingSession.sessionId) || getSessionTitle(deletingSession)}" 吗？此操作不可恢复。`
            : ''
        }
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingSession(null)}
        isDestructive={true}
      />
    </div>
  );
};

export default SessionList;
