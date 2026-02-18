import { useState, useEffect, useCallback } from 'react';

export function useBookmarks(sessionId: string | undefined) {
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = sessionId ? localStorage.getItem(`bookmarks-${sessionId}`) : null;
    return saved ? JSON.parse(saved) : [];
  });

  // Save bookmarks to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(`bookmarks-${sessionId}`, JSON.stringify(bookmarks));
    }
  }, [bookmarks, sessionId]);

  const toggleBookmark = useCallback((messageId: string) => {
    setBookmarks((prev) => {
      if (prev.includes(messageId)) {
        return prev.filter((id) => id !== messageId);
      }
      return [...prev, messageId];
    });
  }, []);

  const isBookmarked = useCallback(
    (messageId: string) => bookmarks.includes(messageId),
    [bookmarks]
  );

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
  }, []);

  return {
    bookmarks,
    toggleBookmark,
    isBookmarked,
    clearBookmarks,
  };
}
