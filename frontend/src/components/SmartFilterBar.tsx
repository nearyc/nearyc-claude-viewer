import React, { useState, useMemo } from 'react';
import {
  Filter,
  Bookmark,
  BookmarkPlus,
  X,
  ChevronDown,
  Search,
  Star,
  Tag,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { useSavedFilters, type FilterCondition } from '../hooks/useSavedFilters';

interface SmartFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  projectFilter: string | null;
  onProjectChange: (project: string | null) => void;
  showOnlyStarred: boolean;
  onStarredChange: (show: boolean) => void;
  availableTags: string[];
  tagCounts: Record<string, number>;
  availableProjects: string[];
}

export const SmartFilterBar: React.FC<SmartFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagChange,
  projectFilter,
  onProjectChange,
  showOnlyStarred,
  onStarredChange,
  availableTags,
  tagCounts,
  availableProjects,
}) => {
  const {
    saveFilter,
    deleteFilter,
    getAllFilters,
    hasSimilarFilter,
  } = useSavedFilters();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  const savedFilters = useMemo(() => getAllFilters(), [getAllFilters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedTag) count++;
    if (projectFilter) count++;
    if (showOnlyStarred) count++;
    return count;
  }, [searchQuery, selectedTag, projectFilter, showOnlyStarred]);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;

    saveFilter(filterName.trim(), {
      searchQuery,
      tagFilter: selectedTag,
      projectFilter,
      showOnlyStarred,
    });

    setFilterName('');
    setShowSaveDialog(false);
  };

  const handleApplyFilter = (filter: FilterCondition) => {
    onSearchChange(filter.searchQuery || '');
    onTagChange(filter.tagFilter || null);
    onProjectChange(filter.projectFilter || null);
    onStarredChange(filter.showOnlyStarred || false);
    setShowFiltersDropdown(false);
  };

  const handleClearFilters = () => {
    onSearchChange('');
    onTagChange(null);
    onProjectChange(null);
    onStarredChange(false);
  };

  const canSaveCurrent = hasActiveFilters && !hasSimilarFilter({
    searchQuery,
    tagFilter: selectedTag,
    projectFilter,
    showOnlyStarred,
  });

  return (
    <div className="space-y-3">
      {/* Main Filter Bar */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          >
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索会话、标签..."
            className="w-full pl-9 pr-8 py-2 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--text-secondary)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = 'var(--text-muted)')
              }
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Saved Filters Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)';
            }}
          >
            <Bookmark className="w-4 h-4" />
            <span>已保存</span>
            {savedFilters.length > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'white',
                }}
              >
                {savedFilters.length}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showFiltersDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showFiltersDropdown && (
            <div
              className="absolute right-0 top-full mt-1 w-64 py-2 rounded-lg border shadow-lg z-50"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              {savedFilters.length === 0 ? (
                <div
                  className="px-4 py-3 text-sm text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  暂无保存的筛选条件
                </div>
              ) : (
                <>
                  <div
                    className="px-3 py-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    点击应用筛选条件
                  </div>
                  {savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer group"
                      onClick={() => handleApplyFilter(filter)}
                    >
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-3.5 h-3.5" style={{ color: 'var(--accent-blue)' }} />
                        <span
                          className="text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {filter.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFilter(filter.id);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = 'var(--accent-red)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = 'var(--text-muted)')
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Save Filter Button */}
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={!canSaveCurrent}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: canSaveCurrent
              ? 'rgba(16, 185, 129, 0.15)'
              : 'var(--bg-secondary)',
            border: `1px solid ${
              canSaveCurrent
                ? 'rgba(16, 185, 129, 0.3)'
                : 'var(--border-primary)'
            }`,
            color: canSaveCurrent ? 'rgb(52, 211, 153)' : 'var(--text-muted)',
          }}
          title={
            !hasActiveFilters
              ? '先设置筛选条件'
              : !canSaveCurrent
              ? '已存在相同的筛选条件'
              : '保存当前筛选条件'
          }
        >
          <BookmarkPlus className="w-4 h-4" />
          <span>保存</span>
        </button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--accent-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
            }}
          >
            <X className="w-4 h-4" />
            <span>清除 ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--accent-blue)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <Filter className="w-3 h-3" />
            <span>已筛选</span>
          </div>
        )}

        {/* Starred Filter */}
        <button
          onClick={() => onStarredChange(!showOnlyStarred)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
          style={{
            backgroundColor: showOnlyStarred
              ? 'rgba(234, 179, 8, 0.2)'
              : 'var(--bg-tertiary)',
            color: showOnlyStarred ? 'rgb(234, 179, 8)' : 'var(--text-muted)',
            border: `1px solid ${
              showOnlyStarred
                ? 'rgba(234, 179, 8, 0.3)'
                : 'var(--border-primary)'
            }`,
          }}
        >
          <Star className="w-3 h-3" fill={showOnlyStarred ? 'currentColor' : 'none'} />
          已收藏
        </button>

        {/* Project Filter */}
        {availableProjects.length > 0 && (
          <select
            value={projectFilter || ''}
            onChange={(e) => onProjectChange(e.target.value || null)}
            className="px-2.5 py-1 rounded-full text-xs border bg-transparent cursor-pointer"
            style={{
              backgroundColor: projectFilter
                ? 'rgba(139, 92, 246, 0.15)'
                : 'var(--bg-tertiary)',
              color: projectFilter ? 'rgb(167, 139, 250)' : 'var(--text-muted)',
              borderColor: projectFilter
                ? 'rgba(139, 92, 246, 0.3)'
                : 'var(--border-primary)',
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              所有项目
            </option>
            {availableProjects.map((project) => (
              <option
                key={project}
                value={project}
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                {project}
              </option>
            ))}
          </select>
        )}

        {/* Tag Filters */}
        {availableTags.slice(0, 6).map((tag) => {
          const isSelected = selectedTag === tag;
          const count = tagCounts[tag] || 0;
          return (
            <button
              key={tag}
              onClick={() => onTagChange(isSelected ? null : tag)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all"
              style={{
                backgroundColor: isSelected
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'var(--bg-tertiary)',
                color: isSelected ? 'rgb(96, 165, 250)' : 'var(--text-muted)',
                border: `1px solid ${
                  isSelected
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'var(--border-primary)'
                }`,
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

        {availableTags.length > 6 && !selectedTag && (
          <span
            className="text-xs px-2"
            style={{ color: 'var(--text-muted)' }}
          >
            +{availableTags.length - 6} 更多
          </span>
        )}
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSaveDialog(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg shadow-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
            }}
          >
            <div
              className="px-5 py-4 border-b"
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <h3
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                保存筛选条件
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  名称
                </label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="输入筛选条件名称..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveFilter();
                    if (e.key === 'Escape') setShowSaveDialog(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div
                  className="text-xs mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  将保存以下筛选条件:
                </div>
                <div className="space-y-1">
                  {searchQuery && (
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Search className="w-3.5 h-3.5" />
                      搜索: {searchQuery}
                    </div>
                  )}
                  {selectedTag && (
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      标签: {selectedTag}
                    </div>
                  )}
                  {projectFilter && (
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      项目: {projectFilter}
                    </div>
                  )}
                  {showOnlyStarred && (
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Star className="w-3.5 h-3.5" />
                      仅显示已收藏
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-end gap-3 px-5 py-4 border-t"
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.3)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'white',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartFilterBar;
