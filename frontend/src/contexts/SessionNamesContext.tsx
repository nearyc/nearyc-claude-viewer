import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SessionNameMap {
  [sessionId: string]: string;
}

interface SessionNamesContextType {
  sessionNames: SessionNameMap;
  getSessionName: (sessionId: string) => string | undefined;
  setSessionName: (sessionId: string, name: string) => void;
  removeSessionName: (sessionId: string) => void;
  hasCustomName: (sessionId: string) => boolean;
  getCustomNamedSessionIds: () => string[];
}

const STORAGE_KEY = 'claude-viewer-session-names';

const SessionNamesContext = createContext<SessionNamesContextType | null>(null);

export function SessionNamesProvider({ children }: { children: React.ReactNode }) {
  const [sessionNames, setSessionNames] = useState<SessionNameMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage whenever sessionNames changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionNames));
    } catch (error) {
      console.error('Failed to save session names:', error);
    }
  }, [sessionNames]);

  const getSessionName = useCallback((sessionId: string): string | undefined => {
    return sessionNames[sessionId];
  }, [sessionNames]);

  const setSessionName = useCallback((sessionId: string, name: string) => {
    setSessionNames(prev => ({
      ...prev,
      [sessionId]: name.trim(),
    }));
  }, []);

  const removeSessionName = useCallback((sessionId: string) => {
    setSessionNames(prev => {
      const newMap = { ...prev };
      delete newMap[sessionId];
      return newMap;
    });
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
