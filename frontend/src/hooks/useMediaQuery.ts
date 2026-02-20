import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect media query matches
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

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mediaQuery.matches);

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
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
