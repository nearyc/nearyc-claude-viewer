import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import type { Session } from '../types';
import { useSessionNames } from '../hooks/useSessionNames';
import { useSessionTags } from '../hooks/useSessionTags';
import { useTranslation } from '../hooks/useTranslation';
import { ExportDialog } from './ExportDialog';
import {
  useBookmarks,
  useSearch,
  useScrollNavigation,
} from './SessionDetail/hooks';
import {
  EmptyState,
  SessionHeader,
  SessionMeta,
  SessionActions,
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
}

// Constants for message folding
const MESSAGE_MIN_LENGTH_TO_COLLAPSE = 500;

export const SessionDetail: React.FC<SessionDetailProps> = ({ session, isUpdating }) => {
  // Hooks
  const { t } = useTranslation();
  const { getSessionName, setSessionName, hasCustomName } = useSessionNames();
  const { getSessionTags, addTag, removeTag, getAllTags } = useSessionTags();
  const { bookmarks, toggleBookmark } = useBookmarks(session?.sessionId);

  // Derived state for header
  const sessionTags = session ? getSessionTags(session.sessionId) : [];
  const allTags = getAllTags();
  const sessionCustomName = session ? getSessionName(session.sessionId) : null;
  const isSessionStarred = session ? hasCustomName(session.sessionId) : false;

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
    [session]
  );

  const sortedMessages = useMemo(
    () => (session?.messages ? [...session.messages].sort((a, b) => a.timestamp - b.timestamp) : []),
    [session?.messages]
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

  // Early return for empty state
  if (!session) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <SessionHeader
              isUpdating={isUpdating}
              isStarred={isSessionStarred}
              customName={sessionCustomName ?? undefined}
              tags={sessionTags}
              availableTags={allTags}
              onToggleStar={() => {
                // Toggle star by setting/removing custom name
                if (isSessionStarred) {
                  setSessionName(session.sessionId, '');
                } else {
                  setSessionName(session.sessionId, t('session.customName.star'));
                }
              }}
              onAddTag={(tag) => addTag(session.sessionId, tag)}
              onRemoveTag={(tag) => removeTag(session.sessionId, tag)}
            />
          </div>
          <SessionActions
            sessionId={session.sessionId}
            customName={sessionCustomName ?? null}
            hasCustomName={isSessionStarred}
            onSetName={setSessionName}
          />
        </div>

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
