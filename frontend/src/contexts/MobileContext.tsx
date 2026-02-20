import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface MobileContextType {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  isMobile: boolean;
  setIsMobile: (value: boolean) => void;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

const MOBILE_BREAKPOINT = 1024;

interface MobileProviderProps {
  children: React.ReactNode;
}

export function MobileProvider({ children }: MobileProviderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const handleSetIsMobile = useCallback((value: boolean) => {
    setIsMobile(value);
    if (!value) {
      setIsDrawerOpen(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      isMobile,
      setIsMobile: handleSetIsMobile,
    }),
    [isDrawerOpen, openDrawer, closeDrawer, toggleDrawer, isMobile, handleSetIsMobile]
  );

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
}

export function useMobile() {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
}

export default MobileContext;
