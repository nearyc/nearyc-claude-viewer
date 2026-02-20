import React, { useState, useMemo } from 'react';
import { Users, Hash, Search, Star, Edit3, Check, X, Trash2, RefreshCw, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '../utils/time';
import type { Team } from '../types';
import { useTeamNames } from '../hooks/useTeamNames';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';
import { deleteTeam } from '../api/delete';
import { useTranslation } from '../hooks/useTranslation';
import { useIsMobile } from '../hooks/useMediaQuery';

interface TeamListProps {
  teams: Team[];
  selectedId: string | null;
  onSelect: (team: Team) => void;
  onTeamDeleted?: (teamId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const TeamList: React.FC<TeamListProps> = ({
  teams,
  selectedId,
  onSelect,
  onTeamDeleted,
  onRefresh,
  isRefreshing,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyStarred, setShowOnlyStarred] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [customNameInput, setCustomNameInput] = useState('');
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const { getTeamName, setTeamName, hasCustomName } = useTeamNames();

  const filteredTeams = useMemo(() => {
    let filtered = teams;

    // Filter by custom name (starred) toggle
    if (showOnlyStarred) {
      filtered = filtered.filter((t) => hasCustomName(t.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((team) => {
        const customName = getTeamName(team.id);
        const name = customName || team.name;
        return name.toLowerCase().includes(query);
      });
    }

    // Sort: by updatedAt only (no special treatment for starred teams)
    return [...filtered].sort((a, b) => {
      return b.updatedAt - a.updatedAt;
    });
  }, [teams, searchQuery, showOnlyStarred]);

  const handleStartEditing = (team: Team, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTeamId(team.id);
    setCustomNameInput(getTeamName(team.id) || '');
  };

  const handleSave = (teamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTeamName(teamId, customNameInput);
    setEditingTeamId(null);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTeamId(null);
    setCustomNameInput('');
  };

  const handleKeyDown = (teamId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave(teamId);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, team: Team) => {
    e.stopPropagation();
    setDeletingTeam(team);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTeam) return;

    const teamId = deletingTeam.id;
    try {
      await deleteTeam(teamId);
      onTeamDeleted?.(teamId);
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert(t('team.deleteError'));
    } finally {
      setDeletingTeam(null);
    }
  };

  // Show toast message
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  // Handle refresh with toast
  const handleRefresh = () => {
    onRefresh?.();
    showToastMessage(t('common.refresh'));
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="px-3 md:px-4 py-3 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
          <Users className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {t('team.title')}
          </span>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={t('common.refresh')}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all disabled:opacity-50 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 justify-center"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <RefreshCw className={`w-4 h-4 md:w-3 md:h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Star toggle button */}
          <button
            onClick={() => setShowOnlyStarred(!showOnlyStarred)}
            title={showOnlyStarred ? t('filter.showAll') : t('filter.showOnlyStarred')}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all min-h-[44px] md:min-h-0"
            style={{
              backgroundColor: showOnlyStarred ? 'var(--accent-amber-subtle)' : 'var(--bg-tertiary)',
              color: showOnlyStarred ? 'var(--accent-amber)' : 'var(--text-muted)',
              border: `1px solid ${showOnlyStarred ? 'var(--accent-amber-medium)' : 'var(--border-primary)'}`,
            }}
          >
            <Star className="w-4 h-4 md:w-3 md:h-3" fill={showOnlyStarred ? 'currentColor' : 'none'} />
            <span className="hidden md:inline">{showOnlyStarred ? t('common.saved') : t('common.all')}</span>
          </button>

          <span
            className="text-sm px-2 py-0.5 rounded-full"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            {filteredTeams.length}
          </span>
        </div>

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
            placeholder={t('common.search')}
            className="w-full pl-9 pr-8 py-2.5 md:py-2 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <span className="text-lg md:text-base leading-none">×</span>
            </button>
          )}
        </div>
      </div>

      {/* Team List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTeams.length === 0 ? (
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
              <Users className="w-5 h-5 opacity-40" />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? t('empty.noSearchResults') : t('empty.noTeams')}
            </p>
          </div>
        ) : (
          <div className="py-2 px-2">
            {filteredTeams.map((team) => {
              const isSelected = selectedId === team.id;
              const isEditing = editingTeamId === team.id;
              const customName = getTeamName(team.id);
              const hasCustom = !!customName;
              const displayName = customName || team.name;

              return (
                <div
                  key={team.id}
                  onClick={() => onSelect(team)}
                  className={`w-full px-3 py-3 md:py-3 text-left rounded-lg transition-all duration-150 border group cursor-pointer ${
                    isMobile ? 'min-h-[64px] flex items-center' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--accent-blue-subtle)'
                      : hasCustom
                        ? 'var(--accent-amber-subtle)'
                        : 'transparent',
                    borderColor: isSelected
                      ? 'var(--accent-blue-medium)'
                      : hasCustom
                        ? 'var(--accent-amber-medium)'
                        : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = hasCustom
                        ? 'var(--accent-amber-subtle)'
                        : 'var(--bg-hover)';
                      e.currentTarget.style.borderColor = hasCustom
                        ? 'var(--accent-amber-strong)'
                        : 'var(--border-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = hasCustom
                        ? 'var(--accent-amber-subtle)'
                        : 'transparent';
                      e.currentTarget.style.borderColor = hasCustom
                        ? 'var(--accent-amber-medium)'
                        : 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <div
                      className={`flex-shrink-0 rounded flex items-center justify-center ${
                        isMobile ? 'w-8 h-8' : 'mt-0.5 w-5 h-5'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-blue-subtle)' : 'var(--bg-tertiary)',
                      }}
                    >
                      <Hash
                        className={isMobile ? 'w-4 h-4' : 'w-3 h-3'}
                        style={{
                          color: isSelected ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1 mb-1">
                          <input
                            type="text"
                            value={customNameInput}
                            onChange={(e) => setCustomNameInput(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(team.id, e)}
                            placeholder={t('team.customNamePlaceholder')}
                            className="flex-1 px-2 py-1 text-sm rounded border focus:outline-none"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              borderColor: 'var(--border-primary)',
                              color: 'var(--text-primary)',
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => handleSave(team.id, e)}
                            className="p-1 rounded min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                            style={{ color: 'var(--success-green)' }}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleCancel(e)}
                            className="p-1 rounded min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {hasCustom && (
                            <Star
                              className="w-3 h-3 flex-shrink-0"
                              style={{ color: 'var(--accent-amber)' }}
                              fill="currentColor"
                            />
                          )}
                          <div
                            className="font-medium text-sm truncate"
                            style={{
                              color: isSelected
                                ? 'var(--accent-blue-light)'
                                : hasCustom
                                  ? 'var(--accent-amber)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {displayName}
                          </div>
                          {/* Edit button - show on hover or when selected */}
                          <button
                            onClick={(e) => handleStartEditing(team, e)}
                            className={`p-1 rounded transition-opacity ${
                              isMobile ? 'opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            style={{
                              color: 'var(--text-muted)',
                              opacity: isSelected ? 1 : undefined,
                            }}
                            title={hasCustom ? t('team.editName') : t('team.starTeam')}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {team.description && !hasCustom && !isEditing && (
                        <div
                          className="text-xs truncate mt-0.5 hidden md:block"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {team.description}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className="text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {isMobile
                            ? `${team.memberCount} ${t('team.members')}`
                            : `${team.memberCount} ${t('team.members')} • ${team.messageCount} ${t('team.messages')}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs hidden md:inline"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {formatRelativeTime(team.updatedAt)}
                          </span>
                          {/* Mobile: Chevron indicator */}
                          {isMobile && (
                            <ChevronRight
                              className="w-4 h-4"
                              style={{ color: 'var(--text-muted)' }}
                            />
                          )}
                          {/* Delete button - always visible on mobile */}
                          <button
                            onClick={(e) => handleDeleteClick(e, team)}
                            className={`p-1 rounded transition-opacity ${
                              isMobile
                                ? 'opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center'
                                : 'opacity-0 group-hover:opacity-100'
                            }`}
                            style={{
                              color: 'var(--text-muted)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--accent-red)';
                              e.currentTarget.style.backgroundColor = 'var(--accent-red-subtle)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-muted)';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title={t('team.deleteTeam')}
                          >
                            <Trash2 className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                          </button>
                        </div>
                      </div>
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
        isOpen={!!deletingTeam}
        title={t('team.deleteTitle')}
        message={
          deletingTeam
            ? t('team.deleteConfirmMessage', { name: getTeamName(deletingTeam.id) || deletingTeam.name })
            : ''
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTeam(null)}
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

export default TeamList;
