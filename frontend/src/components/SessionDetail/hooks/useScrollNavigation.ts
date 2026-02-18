import { useRef, useState, useCallback, useEffect } from 'react';
import type { ChatMessage } from '../../../types';

export function useScrollNavigation(messages: ChatMessage[]) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [messageCount, setMessageCount] = useState(0);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(isBottom);
  }, []);

  // Auto-scroll to bottom when new messages arrive (if user is already at bottom)
  useEffect(() => {
    if (messages.length > 0 && messages.length !== messageCount) {
      const newMessageCount = messages.length;
      setMessageCount(newMessageCount);

      if (isAtBottom && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [messages.length, messageCount, isAtBottom]);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  const scrollToPrevUserInput = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const messageElements = container.querySelectorAll('[data-role="user"]');
    const containerRect = container.getBoundingClientRect();
    let target: Element | null = null;

    for (let i = messageElements.length - 1; i >= 0; i--) {
      const msg = messageElements[i];
      const msgRect = msg.getBoundingClientRect();
      if (msgRect.top < containerRect.top + 100) {
        target = msg;
        break;
      }
    }

    if (target) {
      (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (messageElements.length > 0) {
      messageElements[messageElements.length - 1].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  const scrollToNextUserOutput = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const messageElements = container.querySelectorAll('[data-role="assistant"]');
    const containerRect = container.getBoundingClientRect();
    let target: Element | null = null;

    for (const msg of messageElements) {
      const msgRect = msg.getBoundingClientRect();
      if (msgRect.top > containerRect.bottom - 100) {
        target = msg;
        break;
      }
    }

    if (target) {
      (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (messageElements.length > 0) {
      messageElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const jumpToMessage = useCallback((messageIndex: number) => {
    const messageElement = scrollContainerRef.current?.querySelector(
      `[data-message-index="${messageIndex}"]`
    );
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const jumpToTime = useCallback(
    (timestamp: number) => {
      const targetIndex = messages.findIndex((m) => m.timestamp >= timestamp);
      if (targetIndex !== -1) {
        jumpToMessage(targetIndex);
      }
    },
    [messages, jumpToMessage]
  );

  return {
    scrollContainerRef,
    isAtBottom,
    handleScroll,
    scrollToTop,
    scrollToBottom,
    scrollToPrevUserInput,
    scrollToNextUserOutput,
    jumpToMessage,
    jumpToTime,
  };
}
