import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface TeamNameMap {
  [teamId: string]: string;
}

interface TeamNamesContextType {
  teamNames: TeamNameMap;
  getTeamName: (teamId: string) => string | undefined;
  setTeamName: (teamId: string, name: string) => void;
  removeTeamName: (teamId: string) => void;
  hasCustomName: (teamId: string) => boolean;
  getCustomNamedTeamIds: () => string[];
}

const STORAGE_KEY = 'claude-viewer-team-names';

const TeamNamesContext = createContext<TeamNamesContextType | null>(null);

export function TeamNamesProvider({ children }: { children: React.ReactNode }) {
  const [teamNames, setTeamNames] = useState<TeamNameMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage whenever teamNames changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teamNames));
    } catch (error) {
      console.error('Failed to save team names:', error);
    }
  }, [teamNames]);

  const getTeamName = useCallback((teamId: string): string | undefined => {
    return teamNames[teamId];
  }, [teamNames]);

  const setTeamName = useCallback((teamId: string, name: string) => {
    setTeamNames(prev => ({
      ...prev,
      [teamId]: name.trim(),
    }));
  }, []);

  const removeTeamName = useCallback((teamId: string) => {
    setTeamNames(prev => {
      const newMap = { ...prev };
      delete newMap[teamId];
      return newMap;
    });
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
