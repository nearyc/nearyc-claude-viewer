import React from 'react';
import { Search, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

interface SearchBarProps {
  searchQuery: string;
  matchCount: number;
  currentMatchIndex: number;
  onSearchChange: (query: string) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onClose: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  matchCount,
  currentMatchIndex,
  onSearchChange,
  onNavigatePrev,
  onNavigateNext,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-2 border-b border-[var(--bg-secondary)]/60 bg-[var(--bg-primary)]/50">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('common.search')}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--bg-tertiary)] outline-none"
          autoFocus
        />
        {searchQuery && (
          <span className="text-xs text-[var(--text-muted)]">
            {matchCount > 0 ? `${currentMatchIndex + 1} / ${matchCount}` : 'No matches'}
          </span>
        )}
        {matchCount > 0 && (
          <>
            <button
              onClick={onNavigatePrev}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Previous match"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateNext}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Next match"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
