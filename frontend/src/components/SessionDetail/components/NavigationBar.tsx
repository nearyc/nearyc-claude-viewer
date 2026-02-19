import React from 'react';
import { ChevronUp, ChevronDown, ArrowUp, ArrowDown, Search, Bookmark } from 'lucide-react';
import { NavButton } from './NavButton';
import { useTranslation } from '../../../hooks/useTranslation';

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
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-3 py-2 border-b border-[var(--bg-secondary)]/60 bg-[var(--bg-primary)]/30 flex items-center gap-2 flex-wrap">
      <NavButton
        onClick={onScrollToTop}
        icon={<ChevronUp className="w-3.5 h-3.5" />}
        label={t('navigation.top')}
        title="Scroll to top"
      />
      <NavButton
        onClick={onScrollToBottom}
        icon={<ChevronDown className="w-3.5 h-3.5" />}
        label={t('navigation.bottom')}
        title="Scroll to bottom"
      />
      <div className="w-px h-4 bg-[var(--bg-tertiary)] mx-1" />
      <NavButton
        onClick={onScrollToPrevUserInput}
        icon={<ArrowUp className="w-3.5 h-3.5" />}
        label={t('navigation.prevInput')}
        title="Scroll to previous user input"
      />
      <NavButton
        onClick={onScrollToNextUserOutput}
        icon={<ArrowDown className="w-3.5 h-3.5" />}
        label={t('navigation.nextOutput')}
        title="Scroll to next AI output"
      />
      <div className="w-px h-4 bg-[var(--bg-tertiary)] mx-1" />
      <NavButton
        onClick={onToggleSearch}
        icon={<Search className="w-3.5 h-3.5" />}
        label={t('common.search')}
        title="Search in conversation"
        isActive={isSearchOpen}
      />
      <NavButton
        onClick={onJumpToBookmark}
        icon={<Bookmark className="w-3.5 h-3.5" />}
        label={`${t('tag.title')} (${bookmarksCount})`}
        title="Jump to bookmarks"
      />
      <div className="flex-1" />
      {!isAtBottom && (
        <button
          onClick={onScrollToBottom}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] hover:bg-blue-600/30 rounded-md transition-all"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          {t('navigation.newMessages')}
        </button>
      )}
    </div>
  );
};
