import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface TeamNameMap {
  [teamId: string]: string;
}

interface TeamNamesContextType {
  teamNames: TeamNameMap;
  getTeamName: (teamId: string) => string | undefined;
  setTeamName: (teamId: string, name: string) => Promise<void>;
  removeTeamName: (teamId: string) => Promise<void>;
  hasCustomName: (teamId: string) => boolean;
  getCustomNamedTeamIds: () => string[];
  isLoading: boolean;
}

// Legacy localStorage key for migration
const LEGACY_STORAGE_KEY = 'claude-viewer-team-names';

const API_BASE_URL = ''; // Use relative URLs for proxy support

// Validator for TeamNameMap object
const isValidTeamNameMap = (data: unknown): data is TeamNameMap => {
  if (typeof data !== 'object' || data === null) return false;
  for (const [key, value] of Object.entries(data)) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      return false;
    }
  }
  return true;
};

// Safe localStorage parser with validation
const safeParseStorage = <T,>(key: string, validator: (data: unknown) => data is T, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    const parsed = JSON.parse(stored);
    return validator(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
};

const TeamNamesContext = createContext<TeamNamesContextType | null>(null);

export function TeamNamesProvider({ children }: { children: React.ReactNode }) {
  const [teamNames, setTeamNames] = useState<TeamNameMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // Load team names from API on mount
  useEffect(() => {
    const loadTeamNames = async () => {
      try {
        // First, try to load from API
        const response = await fetch(`${API_BASE_URL}/api/favorites/team-names`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            let data = result.data;

            // Migration: if API data is empty, check localStorage for legacy data
            if (Object.keys(data).length === 0) {
              const parsed = safeParseStorage(LEGACY_STORAGE_KEY, isValidTeamNameMap, {});
              if (Object.keys(parsed).length > 0) {
                console.log('[TeamNames] Migrating legacy data to API');
                data = parsed;
                // Migrate each team name individually
                for (const [teamId, name] of Object.entries(parsed)) {
                  await fetch(`${API_BASE_URL}/api/favorites/team-names/${teamId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name }),
                  });
                }
                // Clear legacy data
                localStorage.removeItem(LEGACY_STORAGE_KEY);
              }
            }

            setTeamNames(data);
          }
        } else {
          console.error('[TeamNames] Failed to load from API, falling back to localStorage');
          // Fallback to localStorage
          setTeamNames(safeParseStorage(LEGACY_STORAGE_KEY, isValidTeamNameMap, {}));
        }
      } catch (error) {
        console.error('[TeamNames] Error loading team names:', error);
        // Fallback to localStorage on error
        setTeamNames(safeParseStorage(LEGACY_STORAGE_KEY, isValidTeamNameMap, {}));
      } finally {
        setIsLoading(false);
        isInitialized.current = true;
      }
    };

    loadTeamNames();
  }, []);

  const getTeamName = useCallback((teamId: string): string | undefined => {
    return teamNames[teamId];
  }, [teamNames]);

  const setTeamName = useCallback(async (teamId: string, name: string) => {
    const trimmedName = name.trim();

    // Optimistically update local state
    setTeamNames(prev => ({
      ...prev,
      [teamId]: trimmedName,
    }));

    // Sync to API
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/team-names/${teamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        throw new Error('Failed to save team name');
      }
    } catch (error) {
      console.error('[TeamNames] Error saving team name:', error);
      // Revert local state on error
      setTeamNames(prev => {
        const newMap = { ...prev };
        delete newMap[teamId];
        return newMap;
      });
      throw error;
    }
  }, []);

  const removeTeamName = useCallback(async (teamId: string) => {
    // Optimistically update local state
    setTeamNames(prev => {
      const newMap = { ...prev };
      delete newMap[teamId];
      return newMap;
    });

    // Sync to API
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/team-names/${teamId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove team name');
      }
    } catch (error) {
      console.error('[TeamNames] Error removing team name:', error);
      throw error;
    }
  }, []);

  const hasCustomName = useCallback((teamId: string): boolean => {
    const name = teamNames[teamId];
    return !!name && name.trim().length > 0;
  }, [teamNames]);

  const getCustomNamedTeamIds = useCallback((): string[] => {
    return Object.entries(teamNames)
      .filter(([_, name]) => name && name.trim().length > 0)
      .map(([id]) => id);
  }, [teamNames]);

  return (
    <TeamNamesContext.Provider
      value={{
        teamNames,
        getTeamName,
        setTeamName,
        removeTeamName,
        hasCustomName,
        getCustomNamedTeamIds,
        isLoading,
      }}
    >
      {children}
    </TeamNamesContext.Provider>
  );
}

export function useTeamNames() {
  const context = useContext(TeamNamesContext);
  if (!context) {
    throw new Error('useTeamNames must be used within a TeamNamesProvider');
  }
  return context;
}

export default TeamNamesContext;
