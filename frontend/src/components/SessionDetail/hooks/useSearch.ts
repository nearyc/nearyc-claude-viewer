import { useState, useMemo, useCallback } from 'react';
import type { ChatMessage } from '../../../types';

export interface SearchMatch {
  messageIndex: number;
  start: number;
  end: number;
}

export function useSearch(messages: ChatMessage[], externalSearchQuery?: string) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Use external query if provided, otherwise use internal
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = externalSearchQuery !== undefined
    ? () => {} // No-op if external
    : setInternalSearchQuery;

  // Calculate search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const matches: SearchMatch[] = [];

    messages.forEach((message, idx) => {
      const content = message.content.toLowerCase();
      let pos = content.indexOf(query);
      while (pos !== -1) {
        matches.push({ messageIndex: idx, start: pos, end: pos + query.length });
        pos = content.indexOf(query, pos + 1);
      }
    });

    return matches;
  }, [searchQuery, messages]);

  const navigateToMatch = useCallback(
    (direction: 'next' | 'prev') => {
      if (searchMatches.length === 0) return undefined;

      let newIndex;
      if (direction === 'next') {
        newIndex = (currentMatchIndex + 1) % searchMatches.length;
      } else {
        newIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
      }
      setCurrentMatchIndex(newIndex);

      return searchMatches[newIndex];
    },
    [searchMatches, currentMatchIndex]
  );

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setInternalSearchQuery('');
    setCurrentMatchIndex(0);
  }, []);

  const updateSearchQuery = useCallback((query: string) => {
    setInternalSearchQuery(query);
    setCurrentMatchIndex(0);
  }, []);

  return {
    searchQuery,
    isSearchOpen,
    currentMatchIndex,
    searchMatches,
    setSearchQuery: externalSearchQuery !== undefined ? setInternalSearchQuery : updateSearchQuery,
    setIsSearchOpen,
    navigateToMatch,
    openSearch,
    closeSearch,
  };
}
