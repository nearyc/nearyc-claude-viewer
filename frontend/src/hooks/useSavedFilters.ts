import { useState, useEffect, useCallback, useRef } from 'react';

const LEGACY_STORAGE_KEY = 'claude-viewer-saved-filters';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

// API SavedFilter structure
interface ApiSavedFilter {
  id: string;
  name: string;
  filter: {
    projectFilter?: string | null;
    tagFilter?: string | null;
    searchQuery?: string;
    showOnlyStarred?: boolean;
  };
  createdAt: string;
}

/**
 * Hook for managing saved filter conditions with API persistence
 */
export const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState<SavedFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // Load saved filters from API on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/saved-filters`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const apiFilters: ApiSavedFilter[] = result.data;
            let filters: SavedFilters = {};

            // Convert API format to local format
            for (const apiFilter of apiFilters) {
              filters[apiFilter.id] = {
                id: apiFilter.id,
                name: apiFilter.name,
                projectFilter: apiFilter.filter.projectFilter,
                tagFilter: apiFilter.filter.tagFilter,
                searchQuery: apiFilter.filter.searchQuery,
                showOnlyStarred: apiFilter.filter.showOnlyStarred,
                createdAt: new Date(apiFilter.createdAt).getTime(),
              };
            }

            // Migration: if API data is empty, check localStorage for legacy data
            if (Object.keys(filters).length === 0) {
              const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
              if (legacyData) {
                try {
                  const parsed = JSON.parse(legacyData) as SavedFilters;
                  if (Object.keys(parsed).length > 0) {
                    console.log('[SavedFilters] Migrating legacy data to API');
                    filters = parsed;
                    // Migrate each filter to API
                    for (const filter of Object.values(parsed)) {
                      await fetch(`${API_BASE_URL}/api/favorites/saved-filters`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: filter.name,
                          filter: {
                            projectFilter: filter.projectFilter,
                            tagFilter: filter.tagFilter,
                            searchQuery: filter.searchQuery,
                            showOnlyStarred: filter.showOnlyStarred,
                          },
                        }),
                      });
                    }
                    // Clear legacy data
                    localStorage.removeItem(LEGACY_STORAGE_KEY);
                    // Reload from API to get proper IDs
                    const reloadResponse = await fetch(`${API_BASE_URL}/api/favorites/saved-filters`);
                    if (reloadResponse.ok) {
                      const reloadResult = await reloadResponse.json();
                      if (reloadResult.success) {
                        filters = {};
                        for (const apiFilter of reloadResult.data as ApiSavedFilter[]) {
                          filters[apiFilter.id] = {
                            id: apiFilter.id,
                            name: apiFilter.name,
                            projectFilter: apiFilter.filter.projectFilter,
                            tagFilter: apiFilter.filter.tagFilter,
                            searchQuery: apiFilter.filter.searchQuery,
                            showOnlyStarred: apiFilter.filter.showOnlyStarred,
                            createdAt: new Date(apiFilter.createdAt).getTime(),
                          };
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.error('[SavedFilters] Failed to parse legacy data:', e);
                }
              }
            }

            setSavedFilters(filters);
          }
        } else {
          console.error('[SavedFilters] Failed to load from API, falling back to localStorage');
          const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacyData) {
            setSavedFilters(JSON.parse(legacyData) || {});
          }
        }
      } catch (error) {
        console.error('[SavedFilters] Error loading filters:', error);
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyData) {
          setSavedFilters(JSON.parse(legacyData) || {});
        }
      } finally {
        setIsLoading(false);
        isInitialized.current = true;
      }
    };

    loadFilters();
  }, []);

  /**
   * Save a new filter condition
   */
  const saveFilter = useCallback(
    async (name: string, conditions: Omit<FilterCondition, 'id' | 'name' | 'createdAt'>): Promise<string> => {
      // Optimistically create local filter (will be replaced with API response)
      const tempId = `temp-${Date.now()}`;
      const tempFilter: FilterCondition = {
        id: tempId,
        name,
        ...conditions,
        createdAt: Date.now(),
      };

      setSavedFilters((prev) => ({
        ...prev,
        [tempId]: tempFilter,
      }));

      // Sync to API
      try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/saved-filters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            filter: {
              projectFilter: conditions.projectFilter,
              tagFilter: conditions.tagFilter,
              searchQuery: conditions.searchQuery,
              showOnlyStarred: conditions.showOnlyStarred,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save filter');
        }

        const result = await response.json();
        if (result.success) {
          const apiFilter: ApiSavedFilter = result.data;
          const newFilter: FilterCondition = {
            id: apiFilter.id,
            name: apiFilter.name,
            projectFilter: apiFilter.filter.projectFilter,
            tagFilter: apiFilter.filter.tagFilter,
            searchQuery: apiFilter.filter.searchQuery,
            showOnlyStarred: apiFilter.filter.showOnlyStarred,
            createdAt: new Date(apiFilter.createdAt).getTime(),
          };

          // Replace temp filter with real one
          setSavedFilters((prev) => {
            const { [tempId]: _, ...rest } = prev;
            return {
              ...rest,
              [newFilter.id]: newFilter,
            };
          });

          return newFilter.id;
        }
        throw new Error('Invalid response from API');
      } catch (error) {
        console.error('[SavedFilters] Error saving filter:', error);
        // Remove temp filter on error
        setSavedFilters((prev) => {
          const { [tempId]: _, ...rest } = prev;
          return rest;
        });
        throw error;
      }
    },
    []
  );

  /**
   * Delete a saved filter
   */
  const deleteFilter = useCallback(async (id: string): Promise<void> => {
    // Optimistically update local state
    setSavedFilters((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });

    // Sync to API
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/saved-filters/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete filter');
      }
    } catch (error) {
      console.error('[SavedFilters] Error deleting filter:', error);
      // State already updated, no need to revert
    }
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
    async (id: string, updates: Partial<Omit<FilterCondition, 'id' | 'createdAt'>>): Promise<boolean> => {
      if (!savedFilters[id]) return false;

      const currentFilter = savedFilters[id];
      const updatedFilter: FilterCondition = {
        ...currentFilter,
        ...updates,
      };

      // Optimistically update local state
      setSavedFilters((prev) => ({
        ...prev,
        [id]: updatedFilter,
      }));

      // Sync to API
      try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/saved-filters/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updatedFilter.name,
            filter: {
              projectFilter: updatedFilter.projectFilter,
              tagFilter: updatedFilter.tagFilter,
              searchQuery: updatedFilter.searchQuery,
              showOnlyStarred: updatedFilter.showOnlyStarred,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update filter');
        }
        return true;
      } catch (error) {
        console.error('[SavedFilters] Error updating filter:', error);
        // Revert on error
        setSavedFilters((prev) => ({
          ...prev,
          [id]: currentFilter,
        }));
        return false;
      }
    },
    [savedFilters]
  );

  /**
   * Clear all saved filters
   */
  const clearAllFilters = useCallback(async (): Promise<void> => {
    const currentFilters = { ...savedFilters };
    setSavedFilters({});

    // Delete all filters from API
    try {
      await Promise.all(
        Object.keys(currentFilters).map((id) =>
          fetch(`${API_BASE_URL}/api/favorites/saved-filters/${id}`, {
            method: 'DELETE',
          })
        )
      );
    } catch (error) {
      console.error('[SavedFilters] Error clearing filters:', error);
      // Restore on error
      setSavedFilters(currentFilters);
    }
  }, [savedFilters]);

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
    isLoading,
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
