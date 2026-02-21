import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { Star, Edit3, Check, X, ArrowLeft, MessageSquare } from 'lucide-react';
import { useMobile } from '../contexts/MobileContext';
import type { Session } from '../types';
import { useSessionNames } from '../hooks/useSessionNames';
import { useSessionTags } from '../hooks/useSessionTags';
import { useTranslation } from '../hooks/useTranslation';
import { ExportDialog } from './ExportDialog';
import { TagSelector } from './TagSelector';
import {
  useBookmarks,
  useSearch,
  useScrollNavigation,
} from './SessionDetail/hooks';
import {
  EmptyState,
  SessionHeader,
  SessionMeta,
  NavigationBar,
  SearchBar,
  BookmarksList,
  ConversationView,
  RawInputsView,
  TimeDensityChart,
} from './SessionDetail/components';

interface SessionDetailProps {
  session: Session | null;
  isUpdating?: boolean;
  hasMoreMessages?: boolean;
  onLoadFullConversation?: () => void;
  error?: string | null;
}

// Constants for message folding
const MESSAGE_MIN_LENGTH_TO_COLLAPSE = 500;

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  isUpdating,
  hasMoreMessages,
  onLoadFullConversation,
  error,
}) => {
  // Hooks
  const { t } = useTranslation();
  const { getSessionName, setSessionName, hasCustomName } = useSessionNames();
  const { isMobile, openDrawer } = useMobile();
  const { getSessionTags, addTag, removeTag, getAllTags } = useSessionTags();
  const { bookmarks, toggleBookmark } = useBookmarks(session?.sessionId);

  // Derived state for header
  const sessionTags = session ? getSessionTags(session.sessionId) : [];
  const allTags = getAllTags();
  const sessionCustomName = session ? getSessionName(session.sessionId) : null;
  const isSessionStarred = session ? hasCustomName(session.sessionId) : false;

  // Local state for editing custom name
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');

  // Use deferred search query to avoid input lag
  const [searchQueryInput, setSearchQueryInput] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQueryInput);

  const {
    isSearchOpen,
    currentMatchIndex,
    searchMatches,
    setIsSearchOpen,
    navigateToMatch,
    closeSearch,
  } = useSearch(session?.messages ?? [], deferredSearchQuery);

  const {
    scrollContainerRef,
    isAtBottom,
    handleScroll,
    scrollToTop,
    scrollToBottom,
    scrollToPrevUserInput,
    scrollToNextUserOutput,
    jumpToMessage,
    jumpToTime,
  } = useScrollNavigation(session?.messages ?? []);

  // Local state
  const [showInputs, setShowInputs] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(() => {
    if (session?.messages) {
      const longMessages = session.messages
        .filter((m) => m.content.length > MESSAGE_MIN_LENGTH_TO_COLLAPSE)
        .map((m) => m.uuid);
      return new Set(longMessages);
    }
    return new Set();
  });

  // Derived data
  const sortedInputs = useMemo(
    () => (session ? [...session.inputs].sort((a, b) => b.timestamp - a.timestamp) : []),
    [session?.sessionId, session?.inputs?.length]
  );

  const sortedMessages = useMemo(
    () => (session?.messages ? [...session.messages].sort((a, b) => a.timestamp - b.timestamp) : []),
    [session?.sessionId, session?.messages?.length]
  );

  const hasFullConversation = sortedMessages.length > 0;

  // Handlers
  const toggleMessageCollapse = useCallback((messageId: string) => {
    setCollapsedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  const jumpToBookmark = useCallback(
    (messageId: string) => {
      const messageIndex = sortedMessages.findIndex((m) => m.uuid === messageId);
      if (messageIndex !== -1) {
        jumpToMessage(messageIndex);
      }
    },
    [sortedMessages, jumpToMessage]
  );

  const handleJumpToFirstBookmark = useCallback(() => {
    if (bookmarks.length > 0) {
      jumpToBookmark(bookmarks[0]);
    }
  }, [bookmarks, jumpToBookmark]);

  const handleNavigateMatch = useCallback(
    (direction: 'next' | 'prev') => {
      const match = navigateToMatch(direction);
      if (match) {
        jumpToMessage(match.messageIndex);
      }
    },
    [navigateToMatch, jumpToMessage]
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQueryInput(query);
  }, []);

  const handleCloseSearch = useCallback(() => {
    closeSearch();
    setSearchQueryInput('');
  }, [closeSearch]);

  // Early return for empty state or error state
  if (!session) {
    if (error === 'SESSION_NOT_FOUND') {
      return (
        <div
          className="flex flex-col h-full items-center justify-center px-4"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <MessageSquare className="w-7 h-7 opacity-40" />
          </div>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {t('session.notFound')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('session.mayBeDeleted')}
          </p>
        </div>
      );
    }
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="px-3 md:px-5 py-3 md:py-4 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        {/* Title row with Favorite and Tags */}
        <div className="flex items-start justify-between gap-2 md:gap-4 mb-3 md:mb-4">
          {/* Back button - Mobile only */}
          {isMobile && (
            <button
              onClick={openDrawer}
              className="flex-shrink-0 p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
              title={t('navigation.backToList')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <SessionHeader isUpdating={isUpdating} />

          {/* Favorite and Tags - Right side */}
          <div className="hidden md:flex items-center gap-3 max-w-[400px]">
            {/* Favorite / Custom Name button */}
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  placeholder={t('session.customName.placeholder')}
                  className="px-2 py-1 text-sm rounded border focus:outline-none w-32"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSessionName(session.sessionId, customNameInput);
                      setIsEditingName(false);
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    setSessionName(session.sessionId, customNameInput);
                    setIsEditingName(false);
                  }}
                  className="p-1"
                  style={{ color: 'var(--accent-green)' }}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (isSessionStarred) {
                    setCustomNameInput(sessionCustomName || '');
                    setIsEditingName(true);
                  } else {
                    setSessionName(session.sessionId, t('session.customName.star'));
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCustomNameInput(sessionCustomName || '');
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all whitespace-nowrap border"
                style={{
                  color: isSessionStarred ? 'var(--accent-amber)' : 'var(--text-secondary)',
                  backgroundColor: isSessionStarred ? 'var(--accent-amber-subtle)' : 'transparent',
                  borderColor: isSessionStarred ? 'var(--accent-amber-medium)' : 'var(--border-primary)',
                }}
                title={isSessionStarred ? sessionCustomName || t('session.customName.star') : t('session.customName.star')}
              >
                <Star className="w-4 h-4" fill={isSessionStarred ? 'currentColor' : 'none'} />
                <span className="max-w-[100px] truncate">
                  {isSessionStarred ? (sessionCustomName || t('session.customName.star')) : t('session.customName.star')}
                </span>
                {isSessionStarred && <Edit3 className="w-3 h-3 opacity-60" />}
              </button>
            )}

            {/* Tags selector */}
            <div className="w-[200px] min-w-0">
              <TagSelector
                tags={sessionTags}
                availableTags={allTags}
                onAddTag={(tag) => addTag(session.sessionId, tag)}
                onRemoveTag={(tag) => removeTag(session.sessionId, tag)}
                placeholder={t('tag.add')}
                compact
              />
            </div>
          </div>
        </div>

        {/* Meta info */}
        <SessionMeta
          sessionId={session.sessionId}
          project={session.project}
          updatedAt={session.updatedAt}
          inputCount={session.inputCount}
          messageCount={sortedMessages.length}
          hasFullConversation={hasFullConversation}
          onExport={() => setIsExportOpen(true)}
        />
      </div>

      {/* Navigation Bar */}
      {hasFullConversation && (
        <NavigationBar
          bookmarksCount={bookmarks.length}
          isSearchOpen={isSearchOpen}
          isAtBottom={isAtBottom}
          onScrollToTop={scrollToTop}
          onScrollToBottom={scrollToBottom}
          onScrollToPrevUserInput={scrollToPrevUserInput}
          onScrollToNextUserOutput={scrollToNextUserOutput}
          onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
          onJumpToBookmark={handleJumpToFirstBookmark}
        />
      )}

      {/* Search Bar */}
      {isSearchOpen && hasFullConversation && (
        <SearchBar
          searchQuery={searchQueryInput}
          matchCount={searchMatches.length}
          currentMatchIndex={currentMatchIndex}
          onSearchChange={handleSearchChange}
          onNavigatePrev={() => handleNavigateMatch('prev')}
          onNavigateNext={() => handleNavigateMatch('next')}
          onClose={handleCloseSearch}
        />
      )}

      {/* Time Density Chart */}
      {hasFullConversation && sortedMessages.length > 5 && (
        <TimeDensityChart messages={sortedMessages} onSelectTime={jumpToTime} />
      )}

      {/* Bookmarks List */}
      <BookmarksList
        bookmarks={bookmarks}
        messages={sortedMessages}
        onJumpToBookmark={jumpToBookmark}
      />

      {/* Conversation */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {/* Load more messages button */}
        {hasMoreMessages && onLoadFullConversation && (
          <div
            className="sticky top-0 z-10 px-4 py-3 border-b text-center"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <button
              onClick={onLoadFullConversation}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
              disabled={isUpdating}
            >
              {isUpdating ? t('common.loading') : t('session.loadFullConversation')}
            </button>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('session.showingRecentMessages')}
            </p>
          </div>
        )}
        {hasFullConversation ? (
          <>
            <ConversationView
              messages={sortedMessages}
              bookmarks={bookmarks}
              collapsedMessages={collapsedMessages}
              searchQuery={deferredSearchQuery}
              isUpdating={isUpdating}
              onToggleBookmark={toggleBookmark}
              onToggleCollapse={toggleMessageCollapse}
            />
            <RawInputsView
              inputs={sortedInputs}
              showInputs={showInputs}
              onToggleShowInputs={() => setShowInputs(!showInputs)}
              title="raw inputs"
            />
          </>
        ) : (
          <>
            <div
              className="px-4 py-3 border-b"
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('session.inputsWithCount', { count: session.inputCount })}
              </span>
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('session.partialDataNotice')}
              </p>
            </div>
            <RawInputsView
              inputs={sortedInputs}
              showInputs={true}
              onToggleShowInputs={() => {}}
              title="inputs"
            />
          </>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog session={session} isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};

export default SessionDetail;
