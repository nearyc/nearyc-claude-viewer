import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'claude-viewer-session-tags';

export interface SessionTags {
  [sessionId: string]: string[];
}

/**
 * Hook for managing session tags with localStorage persistence
 */
export const useSessionTags = () => {
  const [tags, setTags] = useState<SessionTags>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
    }
  }, [tags]);

  /**
   * Get tags for a specific session
   */
  const getSessionTags = useCallback(
    (sessionId: string): string[] => {
      return tags[sessionId] || [];
    },
    [tags]
  );

  /**
   * Set tags for a specific session
   */
  const setSessionTags = useCallback(
    (sessionId: string, sessionTags: string[]): void => {
      setTags((prev) => {
        if (sessionTags.length === 0) {
          // Remove empty tag arrays
          const { [sessionId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [sessionId]: sessionTags };
      });
    },
    []
  );

  /**
   * Add a tag to a session
   */
  const addTag = useCallback(
    (sessionId: string, tag: string): boolean => {
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) return false;

      setTags((prev) => {
        const currentTags = prev[sessionId] || [];
        if (currentTags.includes(normalizedTag)) return prev;
        return {
          ...prev,
          [sessionId]: [...currentTags, normalizedTag],
        };
      });
      return true;
    },
    []
  );

  /**
   * Remove a tag from a session
   */
  const removeTag = useCallback(
    (sessionId: string, tag: string): void => {
      const normalizedTag = tag.trim().toLowerCase();
      setTags((prev) => {
        const currentTags = prev[sessionId] || [];
        const newTags = currentTags.filter((t) => t !== normalizedTag);
        if (newTags.length === 0) {
          const { [sessionId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [sessionId]: newTags };
      });
    },
    []
  );

  /**
   * Check if a session has a specific tag
   */
  const hasTag = useCallback(
    (sessionId: string, tag: string): boolean => {
      const normalizedTag = tag.trim().toLowerCase();
      const sessionTags = tags[sessionId] || [];
      return sessionTags.includes(normalizedTag);
    },
    [tags]
  );

  /**
   * Get all unique tags across all sessions
   */
  const getAllTags = useCallback((): string[] => {
    const allTags = new Set<string>();
    Object.values(tags).forEach((sessionTags) => {
      sessionTags.forEach((tag) => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }, [tags]);

  /**
   * Get sessions that have a specific tag
   */
  const getSessionsByTag = useCallback(
    (tag: string): string[] => {
      const normalizedTag = tag.trim().toLowerCase();
      return Object.entries(tags)
        .filter(([_, sessionTags]) => sessionTags.includes(normalizedTag))
        .map(([sessionId]) => sessionId);
    },
    [tags]
  );

  /**
   * Clear all tags for a session
   */
  const clearSessionTags = useCallback((sessionId: string): void => {
    setTags((prev) => {
      const { [sessionId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Get tag counts across all sessions
   */
  const getTagCounts = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {};
    Object.values(tags).forEach((sessionTags) => {
      sessionTags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [tags]);

  return {
    tags,
    getSessionTags,
    setSessionTags,
    addTag,
    removeTag,
    hasTag,
    getAllTags,
    getSessionsByTag,
    clearSessionTags,
    getTagCounts,
  };
};

export default useSessionTags;
