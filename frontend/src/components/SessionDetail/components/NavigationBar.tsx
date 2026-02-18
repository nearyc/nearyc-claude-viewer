import React from 'react';
import { ChevronUp, ChevronDown, ArrowUp, ArrowDown, Search, Bookmark } from 'lucide-react';
import { NavButton } from './NavButton';

interface NavigationBarProps {
  bookmarksCount: number;
  isSearchOpen: boolean;
  isAtBottom: boolean;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
  onScrollToPrevUserInput: () => void;
  onScrollToNextUserOutput: () => void;
  onToggleSearch: () => void;
  onJumpToBookmark: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  bookmarksCount,
  isSearchOpen,
  isAtBottom,
  onScrollToTop,
  onScrollToBottom,
  onScrollToPrevUserInput,
  onScrollToNextUserOutput,
  onToggleSearch,
  onJumpToBookmark,
}) => (
  <div className="px-3 py-2 border-b border-gray-800/60 bg-gray-900/30 flex items-center gap-2 flex-wrap">
    <NavButton
      onClick={onScrollToTop}
      icon={<ChevronUp className="w-3.5 h-3.5" />}
      label="Top"
      title="Scroll to top"
    />
    <NavButton
      onClick={onScrollToBottom}
      icon={<ChevronDown className="w-3.5 h-3.5" />}
      label="Bottom"
      title="Scroll to bottom"
    />
    <div className="w-px h-4 bg-gray-700 mx-1" />
    <NavButton
      onClick={onScrollToPrevUserInput}
      icon={<ArrowUp className="w-3.5 h-3.5" />}
      label="Prev Input"
      title="Scroll to previous user input"
    />
    <NavButton
      onClick={onScrollToNextUserOutput}
      icon={<ArrowDown className="w-3.5 h-3.5" />}
      label="Next Output"
      title="Scroll to next AI output"
    />
    <div className="w-px h-4 bg-gray-700 mx-1" />
    <NavButton
      onClick={onToggleSearch}
      icon={<Search className="w-3.5 h-3.5" />}
      label="Search"
      title="Search in conversation"
      isActive={isSearchOpen}
    />
    <NavButton
      onClick={onJumpToBookmark}
      icon={<Bookmark className="w-3.5 h-3.5" />}
      label={`Bookmarks (${bookmarksCount})`}
      title="Jump to bookmarks"
    />
    <div className="flex-1" />
    {!isAtBottom && (
      <button
        onClick={onScrollToBottom}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md transition-all"
      >
        <ArrowDown className="w-3.5 h-3.5" />
        New messages
      </button>
    )}
  </div>
);
