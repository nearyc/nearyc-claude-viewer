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
import { useTranslation } from '../hooks/useTranslation';

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
  const { t } = useTranslation();
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
            placeholder={t('filter.searchPlaceholder')}
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
            <span>{t('filter.saved')}</span>
            {savedFilters.length > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'var(--text-on-accent)',
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
                  {t('filter.noSavedFilters')}
                </div>
              ) : (
                <>
                  <div
                    className="px-3 py-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('filter.clickToApply')}
                  </div>
                  {savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center justify-between px-3 py-2 cursor-pointer group"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
              ? 'var(--accent-green-subtle)'
              : 'var(--bg-secondary)',
            border: `1px solid ${
              canSaveCurrent
                ? 'var(--accent-green-light)'
                : 'var(--border-primary)'
            }`,
            color: canSaveCurrent ? 'var(--accent-green)' : 'var(--text-muted)',
          }}
          title={
            !hasActiveFilters
              ? t('filter.setFiltersFirst')
              : !canSaveCurrent
              ? t('filter.alreadyExists')
              : t('filter.saveFilter')
          }
        >
          <BookmarkPlus className="w-4 h-4" />
          <span>{t('common.save')}</span>
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
            <span>{t('filter.clearFilters')} ({activeFiltersCount})</span>
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
              backgroundColor: 'var(--accent-blue-subtle)',
              color: 'var(--accent-blue)',
              border: '1px solid var(--accent-blue-light)',
            }}
          >
            <Filter className="w-3 h-3" />
            <span>{t('filter.filtered')}</span>
          </div>
        )}

        {/* Starred Filter */}
        <button
          onClick={() => onStarredChange(!showOnlyStarred)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
          style={{
            backgroundColor: showOnlyStarred
              ? 'var(--accent-amber-subtle)'
              : 'var(--bg-tertiary)',
            color: showOnlyStarred ? 'var(--accent-amber)' : 'var(--text-muted)',
            border: `1px solid ${
              showOnlyStarred
                ? 'var(--accent-amber-light)'
                : 'var(--border-primary)'
            }`,
          }}
        >
          <Star className="w-3 h-3" fill={showOnlyStarred ? 'currentColor' : 'none'} />
          {t('filter.showOnlyStarred')}
        </button>

        {/* Project Filter */}
        {availableProjects.length > 0 && (
          <select
            value={projectFilter || ''}
            onChange={(e) => onProjectChange(e.target.value || null)}
            className="px-2.5 py-1 rounded-full text-xs border bg-transparent cursor-pointer"
            style={{
              backgroundColor: projectFilter
                ? 'var(--accent-purple-subtle)'
                : 'var(--bg-tertiary)',
              color: projectFilter ? 'var(--accent-purple)' : 'var(--text-muted)',
              borderColor: projectFilter
                ? 'var(--accent-purple-light)'
                : 'var(--border-primary)',
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {t('filter.allProjects')}
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
                  ? 'var(--accent-blue-subtle)'
                  : 'var(--bg-tertiary)',
                color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: `1px solid ${
                  isSelected
                    ? 'var(--accent-blue-light)'
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
                    ? 'var(--accent-blue-light)'
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
            +{availableTags.length - 6} {t('common.more')}
          </span>
        )}
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'var(--overlay-backdrop)' }}
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
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <h3
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('filter.saveFilterTitle')}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('common.name')}
                </label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder={t('filter.filterNamePlaceholder')}
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
                  {t('filter.willSaveFilters')}:
                </div>
                <div className="space-y-1">
                  {searchQuery && (
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Search className="w-3.5 h-3.5" />
                      {t('filter.search')}: {searchQuery}
                    </div>
                  )}
                  {selectedTag && (
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {t('filter.tag')}: {selectedTag}
                    </div>
                  )}
                  {projectFilter && (
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      {t('filter.project')}: {projectFilter}
                    </div>
                  )}
                  {showOnlyStarred && (
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Star className="w-3.5 h-3.5" />
                      {t('filter.showOnlyStarred')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-end gap-3 px-5 py-4 border-t"
              style={{
                backgroundColor: 'var(--bg-secondary)',
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'var(--text-on-accent)',
                }}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartFilterBar;
