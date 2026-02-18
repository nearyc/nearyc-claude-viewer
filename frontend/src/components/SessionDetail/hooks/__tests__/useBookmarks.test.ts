import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookmarks } from '../useBookmarks';

describe('useBookmarks', () => {
  const sessionId = 'test-session-123';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty bookmarks', () => {
    const { result } = renderHook(() => useBookmarks(sessionId));
    expect(result.current.bookmarks).toEqual([]);
  });

  it('should load bookmarks from localStorage', () => {
    const savedBookmarks = ['msg-1', 'msg-2'];
    localStorage.setItem(`bookmarks-${sessionId}`, JSON.stringify(savedBookmarks));

    const { result } = renderHook(() => useBookmarks(sessionId));
    expect(result.current.bookmarks).toEqual(savedBookmarks);
  });

  it('should toggle bookmark on', () => {
    const { result } = renderHook(() => useBookmarks(sessionId));

    act(() => {
      result.current.toggleBookmark('msg-1');
    });

    expect(result.current.bookmarks).toContain('msg-1');
    expect(result.current.isBookmarked('msg-1')).toBe(true);
  });

  it('should toggle bookmark off', () => {
    const { result } = renderHook(() => useBookmarks(sessionId));

    act(() => {
      result.current.toggleBookmark('msg-1');
    });

    act(() => {
      result.current.toggleBookmark('msg-1');
    });

    expect(result.current.bookmarks).not.toContain('msg-1');
    expect(result.current.isBookmarked('msg-1')).toBe(false);
  });

  it('should save bookmarks to localStorage', () => {
    const { result } = renderHook(() => useBookmarks(sessionId));

    act(() => {
      result.current.toggleBookmark('msg-1');
    });

    const saved = localStorage.getItem(`bookmarks-${sessionId}`);
    expect(JSON.parse(saved!)).toContain('msg-1');
  });

  it('should clear all bookmarks', () => {
    const { result } = renderHook(() => useBookmarks(sessionId));

    act(() => {
      result.current.toggleBookmark('msg-1');
      result.current.toggleBookmark('msg-2');
    });

    act(() => {
      result.current.clearBookmarks();
    });

    expect(result.current.bookmarks).toEqual([]);
  });

  it('should handle undefined sessionId', () => {
    const { result } = renderHook(() => useBookmarks(undefined));
    expect(result.current.bookmarks).toEqual([]);
  });
});
