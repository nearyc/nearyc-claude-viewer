import React from 'react';
import { Search, ArrowUp, ArrowDown, X } from 'lucide-react';

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
}) => (
  <div className="px-4 py-2 border-b border-gray-800/60 bg-gray-900/50">
    <div className="flex items-center gap-2">
      <Search className="w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search in conversation..."
        className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
        autoFocus
      />
      {searchQuery && (
        <span className="text-xs text-gray-500">
          {matchCount > 0 ? `${currentMatchIndex + 1} / ${matchCount}` : 'No matches'}
        </span>
      )}
      {matchCount > 0 && (
        <>
          <button
            onClick={onNavigatePrev}
            className="p-1 text-gray-500 hover:text-gray-300"
            title="Previous match"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onNavigateNext}
            className="p-1 text-gray-500 hover:text-gray-300"
            title="Next match"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
