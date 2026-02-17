import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'claude-viewer-saved-filters';

export interface FilterCondition {
  id: string;
  name: string;
  projectFilter?: string | null;
  tagFilter?: string | null;
  searchQuery?: string;
  showOnlyStarred?: boolean;
  createdAt: number;
}

export interface SavedFilters {
  [filterId: string]: FilterCondition;
}

/**
 * Hook for managing saved filter conditions with localStorage persistence
 */
export const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState<SavedFilters>(() => {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters));
    }
  }, [savedFilters]);

  /**
   * Save a new filter condition
   */
  const saveFilter = useCallback(
    (name: string, conditions: Omit<FilterCondition, 'id' | 'name' | 'createdAt'>): string => {
      const id = `filter-${Date.now()}`;
      const newFilter: FilterCondition = {
        id,
        name,
        ...conditions,
        createdAt: Date.now(),
      };

      setSavedFilters((prev) => ({
        ...prev,
        [id]: newFilter,
      }));

      return id;
    },
    []
  );

  /**
   * Delete a saved filter
   */
  const deleteFilter = useCallback((id: string): void => {
    setSavedFilters((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Get a specific filter by ID
   */
  const getFilter = useCallback(
    (id: string): FilterCondition | null => {
      return savedFilters[id] || null;
    },
    [savedFilters]
  );

  /**
   * Get all saved filters as array
   */
  const getAllFilters = useCallback((): FilterCondition[] => {
    return Object.values(savedFilters).sort((a, b) => b.createdAt - a.createdAt);
  }, [savedFilters]);

  /**
   * Update an existing filter
   */
  const updateFilter = useCallback(
    (id: string, updates: Partial<Omit<FilterCondition, 'id' | 'createdAt'>>): boolean => {
      if (!savedFilters[id]) return false;

      setSavedFilters((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...updates },
      }));
      return true;
    },
    [savedFilters]
  );

  /**
   * Clear all saved filters
   */
  const clearAllFilters = useCallback((): void => {
    setSavedFilters({});
  }, []);

  /**
   * Check if a filter with the same conditions already exists
   */
  const hasSimilarFilter = useCallback(
    (conditions: Omit<FilterCondition, 'id' | 'name' | 'createdAt'>): boolean => {
      return Object.values(savedFilters).some((filter) => {
        return (
          filter.projectFilter === conditions.projectFilter &&
          filter.tagFilter === conditions.tagFilter &&
          filter.searchQuery === conditions.searchQuery &&
          filter.showOnlyStarred === conditions.showOnlyStarred
        );
      });
    },
    [savedFilters]
  );

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    getFilter,
    getAllFilters,
    updateFilter,
    clearAllFilters,
    hasSimilarFilter,
  };
};

export default useSavedFilters;
