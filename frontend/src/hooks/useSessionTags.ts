import { useState, useEffect, useCallback, useRef } from 'react';

const LEGACY_STORAGE_KEY = 'claude-viewer-session-tags';
const API_BASE_URL = ''; // Use relative URL to leverage Vite proxy

export interface SessionTags {
  [sessionId: string]: string[];
}

/**
 * Hook for managing session tags with API persistence
 */
export const useSessionTags = () => {
  const [tags, setTags] = useState<SessionTags>({});
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // Load tags from API on mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/session-tags`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            let data = result.data;

            // Migration: if API data is empty, check localStorage for legacy data
            if (Object.keys(data).length === 0) {
              const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
              if (legacyData) {
                try {
                  const parsed = JSON.parse(legacyData);
                  if (Object.keys(parsed).length > 0) {
                    console.log('[SessionTags] Migrating legacy data to API');
                    data = parsed;
                    // Migrate each session's tags
                    for (const [sessionId, sessionTags] of Object.entries(parsed)) {
                      if (Array.isArray(sessionTags) && sessionTags.length > 0) {
                        await fetch(`${API_BASE_URL}/api/favorites/session-tags/${sessionId}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tags: sessionTags }),
                        });
                      }
                    }
                    // Clear legacy data
                    localStorage.removeItem(LEGACY_STORAGE_KEY);
                  }
                } catch (e) {
                  console.error('[SessionTags] Failed to parse legacy data:', e);
                }
              }
            }

            setTags(data);
          }
        } else {
          console.error('[SessionTags] Failed to load from API, falling back to localStorage');
          const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacyData) {
            setTags(JSON.parse(legacyData) || {});
          }
        }
      } catch (error) {
        console.error('[SessionTags] Error loading tags:', error);
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyData) {
          setTags(JSON.parse(legacyData) || {});
        }
      } finally {
        setIsLoading(false);
        isInitialized.current = true;
      }
    };

    loadTags();
  }, []);

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
    async (sessionId: string, sessionTags: string[]): Promise<void> => {
      const normalizedTags = sessionTags.map(t => t.trim().toLowerCase()).filter(Boolean);

      // Optimistically update local state
      setTags((prev) => {
        if (normalizedTags.length === 0) {
          const { [sessionId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [sessionId]: normalizedTags };
      });

      // Sync to API
      try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/session-tags/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: normalizedTags }),
        });

        if (!response.ok) {
          throw new Error('Failed to save session tags');
        }
      } catch (error) {
        console.error('[SessionTags] Error saving tags:', error);
        // Revert on error
        setTags((prev) => {
          const { [sessionId]: _, ...rest } = prev;
          return rest;
        });
        throw error;
      }
    },
    []
  );

  /**
   * Add a tag to a session
   */
  const addTag = useCallback(
    async (sessionId: string, tag: string): Promise<boolean> => {
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) return false;

      // Check if already exists
      const currentTags = tags[sessionId] || [];
      if (currentTags.includes(normalizedTag)) return false;

      // Optimistically update local state
      setTags((prev) => ({
        ...prev,
        [sessionId]: [...(prev[sessionId] || []), normalizedTag],
      }));

      // Sync to API
      try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/session-tags/${sessionId}/add`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: normalizedTag }),
        });

        if (!response.ok) {
          throw new Error('Failed to add tag');
        }
        return true;
      } catch (error) {
        console.error('[SessionTags] Error adding tag:', error);
        // Revert on error
        setTags((prev) => ({
          ...prev,
          [sessionId]: currentTags,
        }));
        return false;
      }
    },
    [tags]
  );

  /**
   * Remove a tag from a session
   */
  const removeTag = useCallback(
    async (sessionId: string, tag: string): Promise<void> => {
      const normalizedTag = tag.trim().toLowerCase();
      const currentTags = tags[sessionId] || [];

      // Optimistically update local state
      setTags((prev) => {
        const newTags = currentTags.filter((t) => t !== normalizedTag);
        if (newTags.length === 0) {
          const { [sessionId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [sessionId]: newTags };
      });

      // Sync to API
      try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/session-tags/${sessionId}/remove`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: normalizedTag }),
        });

        if (!response.ok) {
          throw new Error('Failed to remove tag');
        }
      } catch (error) {
        console.error('[SessionTags] Error removing tag:', error);
        // Revert on error
        setTags((prev) => ({
          ...prev,
          [sessionId]: currentTags,
        }));
      }
    },
    [tags]
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
  const clearSessionTags = useCallback(async (sessionId: string): Promise<void> => {
    // Optimistically update local state
    setTags((prev) => {
      const { [sessionId]: _, ...rest } = prev;
      return rest;
    });

    // Sync to API
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/session-tags/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [] }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear session tags');
      }
    } catch (error) {
      console.error('[SessionTags] Error clearing tags:', error);
      // State already updated, no need to revert since clearing is less critical
    }
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
    isLoading,
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
