import React, { useState, useMemo } from 'react';
import { Users, Hash, Search, Star, Edit3, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { formatRelativeTime } from '../utils/time';
import type { Team } from '../types';
import { useTeamNames } from '../hooks/useTeamNames';
import { ConfirmDialog } from './ConfirmDialog';
import { deleteTeam } from '../api/delete';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyStarred, setShowOnlyStarred] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [customNameInput, setCustomNameInput] = useState('');
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
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
      alert('删除团队失败，请重试');
    } finally {
      setDeletingTeam(null);
    }
  };

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
          <Users className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Teams
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
            title={showOnlyStarred ? '显示所有团队' : '只显示已收藏团队'}
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
            placeholder="Search teams..."
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
              {searchQuery ? 'No teams match your search' : 'No teams available'}
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
                <button
                  key={team.id}
                  onClick={() => onSelect(team)}
                  className="w-full px-3 py-3 text-left rounded-lg transition-all duration-150 border group"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(59, 130, 246, 0.1)'
                      : hasCustom
                        ? 'rgba(234, 179, 8, 0.05)'
                        : 'transparent',
                    borderColor: isSelected
                      ? 'rgba(59, 130, 246, 0.3)'
                      : hasCustom
                        ? 'rgba(234, 179, 8, 0.2)'
                        : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = hasCustom
                        ? 'rgba(234, 179, 8, 0.1)'
                        : 'var(--bg-hover)';
                      e.currentTarget.style.borderColor = hasCustom
                        ? 'rgba(234, 179, 8, 0.3)'
                        : 'var(--border-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = hasCustom
                        ? 'rgba(234, 179, 8, 0.05)'
                        : 'transparent';
                      e.currentTarget.style.borderColor = hasCustom
                        ? 'rgba(234, 179, 8, 0.2)'
                        : 'transparent';
                    }
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                      }}
                    >
                      <Hash
                        className="w-3 h-3"
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
                            placeholder="输入自定义名称..."
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
                            className="p-1 rounded"
                            style={{ color: 'var(--success-green)' }}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleCancel(e)}
                            className="p-1 rounded"
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
                            {displayName}
                          </div>
                          {/* Edit button - show on hover or when selected */}
                          <button
                            onClick={(e) => handleStartEditing(team, e)}
                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded transition-opacity"
                            style={{
                              color: 'var(--text-muted)',
                              opacity: isSelected ? 1 : undefined,
                            }}
                            title={hasCustom ? '编辑名称' : '收藏团队'}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {team.description && !hasCustom && !isEditing && (
                        <div
                          className="text-xs truncate mt-0.5"
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
                          {team.memberCount} members • {team.messageCount} messages
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {formatRelativeTime(team.updatedAt)}
                          </span>
                          {/* Delete button */}
                          <button
                            onClick={(e) => handleDeleteClick(e, team)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                            title="删除团队"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTeam}
        title="删除团队"
        message={
          deletingTeam
            ? `确定要删除团队 "${getTeamName(deletingTeam.id) || deletingTeam.name}" 吗？此操作将删除该团队的所有成员和消息，不可恢复。`
            : ''
        }
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTeam(null)}
        isDestructive={true}
      />
    </div>
  );
};

export default TeamList;
