import { useState, useEffect } from 'react';

// Global cache for MediaQueryList instances
const mediaQueries = new Map<string, MediaQueryList>();

// Global cache for callback sets per query
const listeners = new Map<string, Set<(matches: boolean) => void>>();

/**
 * Hook to detect media query matches with global caching
 * Uses a shared MediaQueryList and listener set per query to avoid duplicate listeners
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Get or create the MediaQueryList for this query
    let mql = mediaQueries.get(query);
    if (!mql) {
      mql = window.matchMedia(query);
      mediaQueries.set(query, mql);
      listeners.set(query, new Set());
    }

    // Get the listener set for this query
    const listenerSet = listeners.get(query)!;
    listenerSet.add(setMatches);

    // Update initial value from cached MediaQueryList
    setMatches(mql.matches);

    // Define the change handler that notifies all listeners
    const handleChange = (e: MediaQueryListEvent) => {
      listenerSet.forEach((cb) => cb(e.matches));
    };

    // Add listener only once per query (when first component subscribes)
    if (listenerSet.size === 1) {
      mql.addEventListener('change', handleChange);
    }

    return () => {
      listenerSet.delete(setMatches);

      // Remove listener when last component unsubscribes
      if (listenerSet.size === 0) {
        mql?.removeEventListener('change', handleChange);
        mediaQueries.delete(query);
        listeners.delete(query);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Hook to detect if the viewport is mobile (< 768px)
 * @returns boolean indicating if the viewport is mobile
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Hook to detect if the viewport is tablet (768px - 1024px)
 * @returns boolean indicating if the viewport is tablet
 */
export function useIsTablet(): boolean {
  const isTabletMin = useMediaQuery('(min-width: 768px)');
  const isTabletMax = useMediaQuery('(max-width: 1024px)');
  return isTabletMin && isTabletMax;
}

/**
 * Hook to detect if the viewport is desktop (> 1024px)
 * @returns boolean indicating if the viewport is desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}

/**
 * Hook to get the current breakpoint
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  if (isMobile) {
    return 'mobile';
  }
  if (isTablet) {
    return 'tablet';
  }
  return 'desktop';
}

export default useMediaQuery;
