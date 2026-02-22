import { useState, useCallback, useRef } from 'react';

// Cache entry type with timestamp for expiration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry?: number; // Optional expiry time in milliseconds
}

// Main cache store type
type CacheStore = Record<string, CacheEntry<any>>;

/**
 * useCache Hook
 * Provides caching functionality for API requests and other expensive operations
 */
export const useCache = () => {
  // Using useRef to maintain cache across renders without causing re-renders
  const cacheRef = useRef<CacheStore>({});

  // State to trigger re-renders when cache updates are made
  const [, forceUpdate] = useState({});

  /**
   * Get cached data for a key
   * @param key Cache key
   * @returns Cached data or undefined if not found or expired
   */
  const get = useCallback(<T>(key: string): T | undefined => {
    const entry = cacheRef.current[key];

    if (!entry) {
      return undefined;
    }

    // Check if cache entry has expired
    if (entry.expiry && Date.now() - entry.timestamp > entry.expiry) {
      // Remove expired entry
      delete cacheRef.current[key];
      return undefined;
    }

    return entry.data;
  }, []);

  /**
   * Set data in cache
   * @param key Cache key
   * @param data Data to cache
   * @param expiry Expiry time in milliseconds (optional)
   */
  const set = useCallback(<T>(key: string, data: T, expiry?: number): void => {
    cacheRef.current[key] = {
      data,
      timestamp: Date.now(),
      expiry,
    };
    // Force re-render to trigger any dependent useEffects that might be watching this cache
    forceUpdate({});
  }, []);

  /**
   * Delete specific cache entry
   * @param key Cache key to remove
   */
  const remove = useCallback((key: string): void => {
    delete cacheRef.current[key];
    forceUpdate({});
  }, []);

  /**
   * Clear entire cache
   */
  const clear = useCallback((): void => {
    cacheRef.current = {};
    forceUpdate({});
  }, []);

  /**
   * Get cache size
   */
  const size = useCallback((): number => {
    return Object.keys(cacheRef.current).length;
  }, []);

  /**
   * Check if key exists in cache (and not expired)
   * @param key Cache key
   */
  const has = useCallback((key: string): boolean => {
    const entry = cacheRef.current[key];

    if (!entry) {
      return false;
    }

    // Check if cache entry has expired
    if (entry.expiry && Date.now() - entry.timestamp > entry.expiry) {
      // Remove expired entry
      delete cacheRef.current[key];
      return false;
    }

    return true;
  }, []);

  /**
   * Get all cache keys
   */
  const keys = useCallback((): string[] => {
    return Object.keys(cacheRef.current);
  }, []);

  return {
    get,
    set,
    remove,
    clear,
    size,
    has,
    keys,
  };
};

export default useCache;