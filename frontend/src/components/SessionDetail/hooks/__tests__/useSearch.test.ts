import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../useSearch';
import type { ChatMessage } from '../../../../types';

const mockMessages: ChatMessage[] = [
  { uuid: '1', role: 'user', content: 'Hello world', timestamp: 1000 },
  { uuid: '2', role: 'assistant', content: 'Hello there', timestamp: 2000 },
  { uuid: '3', role: 'user', content: 'How are you?', timestamp: 3000 },
];

describe('useSearch', () => {
  it('should initialize with empty search', () => {
    const { result } = renderHook(() => useSearch(mockMessages));
    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchMatches).toEqual([]);
    expect(result.current.isSearchOpen).toBe(false);
  });

  it('should find matches for search query', () => {
    const { result } = renderHook(() => useSearch(mockMessages));

    act(() => {
      result.current.setSearchQuery('hello');
    });

    expect(result.current.searchMatches.length).toBe(2);
    expect(result.current.searchMatches[0].messageIndex).toBe(0);
    expect(result.current.searchMatches[1].messageIndex).toBe(1);
  });

  it('should be case insensitive', () => {
    const { result } = renderHook(() => useSearch(mockMessages));

    act(() => {
      result.current.setSearchQuery('HELLO');
    });

    expect(result.current.searchMatches.length).toBe(2);
  });

  it('should navigate to next match', () => {
    const { result } = renderHook(() => useSearch(mockMessages));

    act(() => {
      result.current.setSearchQuery('hello');
    });

    act(() => {
      result.current.navigateToMatch('next');
    });

    expect(result.current.currentMatchIndex).toBe(1);
  });

  it('should navigate to previous match', () => {
    const { result } = renderHook(() => useSearch(mockMessages));

    act(() => {
      result.current.setSearchQuery('hello');
    });

    act(() => {
      result.current.navigateToMatch('next');
    });

    act(() => {
      result.current.navigateToMatch('prev');
    });

    expect(result.current.currentMatchIndex).toBe(0);
  });

  it('should wrap around when navigating past last match', () => {
    const { result } = renderHook(() => useSearch(mockMessages));

    act(() => {
      result.current.setSearchQuery('hello');
    });

    // Navigate past last match
    act(() => {
      result.current.navigateToMatch('next');
    });
    act(() => {
      result.current.navigateToMatch('next');
    });

    expect(result.current.currentMatchIndex).toBe(0);
  });

  it('should open and close search', () => {
    const { result } = renderHook(() => useSearch(mockMessages));

    act(() => {
      result.current.openSearch();
    });
    expect(result.current.isSearchOpen).toBe(true);

    act(() => {
      result.current.closeSearch();
    });
    expect(result.current.isSearchOpen).toBe(false);
    expect(result.current.searchQuery).toBe('');
  });

  it('should reset match index when search query changes', () => {
    const { result } = renderHook(() => useSearch(mockMessages));

    act(() => {
      result.current.setSearchQuery('hello');
    });

    act(() => {
      result.current.navigateToMatch('next');
    });

    act(() => {
      result.current.setSearchQuery('world');
    });

    expect(result.current.currentMatchIndex).toBe(0);
  });

  it('should work with external search query', () => {
    const { result } = renderHook(() => useSearch(mockMessages, 'hello'));
    expect(result.current.searchMatches.length).toBe(2);
  });
});
