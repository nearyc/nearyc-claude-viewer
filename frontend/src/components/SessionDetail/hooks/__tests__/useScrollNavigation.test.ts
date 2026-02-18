import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollNavigation } from '../useScrollNavigation';
import type { ChatMessage } from '../../../../types';

const mockMessages: ChatMessage[] = [
  { uuid: '1', role: 'user', content: 'Hello', timestamp: 1000 },
  { uuid: '2', role: 'assistant', content: 'Hi there', timestamp: 2000 },
  { uuid: '3', role: 'user', content: 'How are you?', timestamp: 3000 },
];

// Mock scrollIntoView
const scrollIntoViewMock = vi.fn();
Element.prototype.scrollIntoView = scrollIntoViewMock;

describe('useScrollNavigation', () => {
  beforeEach(() => {
    scrollIntoViewMock.mockClear();
  });

  it('should initialize with correct defaults', () => {
    const { result } = renderHook(() => useScrollNavigation(mockMessages));
    expect(result.current.isAtBottom).toBe(true);
    expect(result.current.scrollContainerRef.current).toBeNull();
  });

  it('should provide scrollToTop function', () => {
    const { result } = renderHook(() => useScrollNavigation(mockMessages));

    const scrollToMock = vi.fn();
    const mockContainer = { scrollTo: scrollToMock } as unknown as HTMLDivElement;

    // Manually set the ref
    Object.defineProperty(result.current.scrollContainerRef, 'current', {
      value: mockContainer,
      writable: true,
    });

    result.current.scrollToTop();
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('should provide scrollToBottom function', () => {
    const { result } = renderHook(() => useScrollNavigation(mockMessages));

    const scrollToMock = vi.fn();
    const mockContainer = {
      scrollTo: scrollToMock,
      scrollHeight: 1000,
    } as unknown as HTMLDivElement;

    Object.defineProperty(result.current.scrollContainerRef, 'current', {
      value: mockContainer,
      writable: true,
    });

    result.current.scrollToBottom();
    expect(scrollToMock).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
  });

  it('should provide jumpToMessage function', () => {
    const { result } = renderHook(() => useScrollNavigation(mockMessages));

    // Create a mock container with querySelector
    const mockElement = { scrollIntoView: scrollIntoViewMock };
    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(mockElement),
    } as unknown as HTMLDivElement;

    Object.defineProperty(result.current.scrollContainerRef, 'current', {
      value: mockContainer,
      writable: true,
    });

    result.current.jumpToMessage(1);
    expect(mockContainer.querySelector).toHaveBeenCalledWith('[data-message-index="1"]');
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('should provide jumpToTime function', () => {
    const { result } = renderHook(() => useScrollNavigation(mockMessages));

    const mockElement = { scrollIntoView: scrollIntoViewMock };
    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(mockElement),
    } as unknown as HTMLDivElement;

    Object.defineProperty(result.current.scrollContainerRef, 'current', {
      value: mockContainer,
      writable: true,
    });

    result.current.jumpToTime(2000);
    expect(mockContainer.querySelector).toHaveBeenCalledWith('[data-message-index="1"]');
  });

  it('should not jump if timestamp is beyond all messages', () => {
    const { result } = renderHook(() => useScrollNavigation(mockMessages));

    const querySelectorMock = vi.fn();
    const mockContainer = {
      querySelector: querySelectorMock,
    } as unknown as HTMLDivElement;

    Object.defineProperty(result.current.scrollContainerRef, 'current', {
      value: mockContainer,
      writable: true,
    });

    result.current.jumpToTime(9999);
    expect(querySelectorMock).not.toHaveBeenCalled();
  });
});
