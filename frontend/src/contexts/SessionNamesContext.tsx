import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface SessionNameMap {
  [sessionId: string]: string;
}

interface SessionNamesContextType {
  sessionNames: SessionNameMap;
  getSessionName: (sessionId: string) => string | undefined;
  setSessionName: (sessionId: string, name: string) => Promise<void>;
  removeSessionName: (sessionId: string) => Promise<void>;
  hasCustomName: (sessionId: string) => boolean;
  getCustomNamedSessionIds: () => string[];
  isLoading: boolean;
}

// Legacy localStorage key for migration
const LEGACY_STORAGE_KEY = 'claude-viewer-session-names';

const API_BASE_URL = ''; // Use relative URLs for proxy support

// Validator for SessionNameMap object
const isValidSessionNameMap = (data: unknown): data is SessionNameMap => {
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

const SessionNamesContext = createContext<SessionNamesContextType | null>(null);

export function SessionNamesProvider({ children }: { children: React.ReactNode }) {
  const [sessionNames, setSessionNames] = useState<SessionNameMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // Load session names from API on mount
  useEffect(() => {
    const loadSessionNames = async () => {
      try {
        // First, try to load from API
        const response = await fetch(`${API_BASE_URL}/api/favorites/session-names`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            let data = result.data;

            // Migration: if API data is empty, check localStorage for legacy data
            if (Object.keys(data).length === 0) {
              const parsed = safeParseStorage(LEGACY_STORAGE_KEY, isValidSessionNameMap, {});
              if (Object.keys(parsed).length > 0) {
                console.log('[SessionNames] Migrating legacy data to API');
                data = parsed;
                // Save legacy data to API
                await fetch(`${API_BASE_URL}/api/favorites/session-names`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ names: parsed }),
                });
                // Clear legacy data
                localStorage.removeItem(LEGACY_STORAGE_KEY);
              }
            }

            setSessionNames(data);
          }
        } else {
          console.error('[SessionNames] Failed to load from API, falling back to localStorage');
          // Fallback to localStorage
          setSessionNames(safeParseStorage(LEGACY_STORAGE_KEY, isValidSessionNameMap, {}));
        }
      } catch (error) {
        console.error('[SessionNames] Error loading session names:', error);
        // Fallback to localStorage on error
        setSessionNames(safeParseStorage(LEGACY_STORAGE_KEY, isValidSessionNameMap, {}));
      } finally {
        setIsLoading(false);
        isInitialized.current = true;
      }
    };

    loadSessionNames();
  }, []);

  const getSessionName = useCallback((sessionId: string): string | undefined => {
    return sessionNames[sessionId];
  }, [sessionNames]);

  const setSessionName = useCallback(async (sessionId: string, name: string) => {
    const trimmedName = name.trim();

    // Optimistically update local state
    setSessionNames(prev => ({
      ...prev,
      [sessionId]: trimmedName,
    }));

    // Sync to API
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/session-names/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        throw new Error('Failed to save session name');
      }
    } catch (error) {
      console.error('[SessionNames] Error saving session name:', error);
      // Revert local state on error
      setSessionNames(prev => {
        const newMap = { ...prev };
        delete newMap[sessionId];
        return newMap;
      });
      throw error;
    }
  }, []);

  const removeSessionName = useCallback(async (sessionId: string) => {
    // Optimistically update local state
    setSessionNames(prev => {
      const newMap = { ...prev };
      delete newMap[sessionId];
      return newMap;
    });

    // Sync to API
    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/session-names/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove session name');
      }
    } catch (error) {
      console.error('[SessionNames] Error removing session name:', error);
      throw error;
    }
  }, []);

  const hasCustomName = useCallback((sessionId: string): boolean => {
    const name = sessionNames[sessionId];
    return !!name && name.trim().length > 0;
  }, [sessionNames]);

  const getCustomNamedSessionIds = useCallback((): string[] => {
    return Object.entries(sessionNames)
      .filter(([_, name]) => name && name.trim().length > 0)
      .map(([id]) => id);
  }, [sessionNames]);

  return (
    <SessionNamesContext.Provider
      value={{
        sessionNames,
        getSessionName,
        setSessionName,
        removeSessionName,
        hasCustomName,
        getCustomNamedSessionIds,
        isLoading,
      }}
    >
      {children}
    </SessionNamesContext.Provider>
  );
}

export function useSessionNames() {
  const context = useContext(SessionNamesContext);
  if (!context) {
    throw new Error('useSessionNames must be used within a SessionNamesProvider');
  }
  return context;
}

export default SessionNamesContext;
