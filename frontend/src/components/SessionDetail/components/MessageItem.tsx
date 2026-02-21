import React, { useRef, useState, useEffect } from 'react';
import { User, Bot, Sparkles, Bookmark, BookmarkCheck, MoreHorizontal, ChevronUp, ChevronDown, Brain } from 'lucide-react';
import type { ChatMessage } from '../../../types';
import { escapeRegExp } from '../utils/escapeRegExp';
import { formatRelativeTime } from '../../../utils/time';

const MESSAGE_PREVIEW_LENGTH = 300;
const MESSAGE_MIN_LENGTH_TO_COLLAPSE = 500;
const THINKING_MAX_LINES = 6;
const THINKING_LINE_HEIGHT = 20; // Approximate line height in pixels

interface MessageItemProps {
  message: ChatMessage;
  index: number;
  isLatest?: boolean;
  isStreaming?: boolean;
  searchQuery?: string;
  isBookmarked?: boolean;
  onToggleBookmark?: (messageId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (messageId: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  index,
  isLatest,
  isStreaming,
  searchQuery,
  isBookmarked,
  onToggleBookmark,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const isUser = message.role === 'user';
  const isThinking = message.type === 'thinking';
  const itemRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Regular message collapse logic
  const shouldCollapse = !isThinking && message.content.length > MESSAGE_MIN_LENGTH_TO_COLLAPSE;
  const [internalCollapsed, setInternalCollapsed] = useState(shouldCollapse);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  // Thinking collapse logic - auto-collapse if more than 6 lines
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const [shouldThinkingCollapse, setShouldThinkingCollapse] = useState(false);

  // Check if thinking content exceeds 6 lines
  useEffect(() => {
    if (isThinking && contentRef.current) {
      const element = contentRef.current;
      const lineHeight = parseInt(getComputedStyle(element).lineHeight) || THINKING_LINE_HEIGHT;
      const height = element.scrollHeight;
      const lines = Math.round(height / lineHeight);
      setShouldThinkingCollapse(lines > THINKING_MAX_LINES);
    }
  }, [isThinking, message.content]);

  // Check if message is "just now" (within 20 seconds) and auto-update
  const [isJustNow, setIsJustNow] = useState(() => {
    const now = Date.now();
    const diff = now - message.timestamp;
    return diff < 20000;
  });

  useEffect(() => {
    const checkJustNow = () => {
      const now = Date.now();
      const diff = now - message.timestamp;
      const justNow = diff < 20000;
      setIsJustNow(justNow);
      return justNow;
    };

    // Initial check
    const currentlyJustNow = checkJustNow();

    // If currently "just now", schedule checks to remove highlight after 20s
    if (currentlyJustNow) {
      const intervalId = setInterval(() => {
        const stillJustNow = checkJustNow();
        if (!stillJustNow) {
          clearInterval(intervalId);
        }
      }, 2000); // Check every 2 seconds

      // Also set a timeout for exactly 20s to ensure highlight is removed
      const remainingTime = 20000 - (Date.now() - message.timestamp);
      const timeoutId = setTimeout(() => {
        checkJustNow();
      }, Math.max(remainingTime, 0));

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [message.timestamp]);

  // Highlight effect when new message arrives
  useEffect(() => {
    if (isLatest && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isLatest]);

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(message.uuid);
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // Highlight search matches in content
  const renderContent = () => {
    if (!searchQuery) {
      return isCollapsed
        ? message.content.slice(0, MESSAGE_PREVIEW_LENGTH) + '...'
        : message.content;
    }

    const content = isCollapsed
      ? message.content.slice(0, MESSAGE_PREVIEW_LENGTH) + '...'
      : message.content;

    if (!searchQuery.trim()) return content;

    const escapedQuery = escapeRegExp(searchQuery);
    // Remove 'g' flag to avoid lastIndex issues - use 'i' for case-insensitive only
    const parts = content.split(new RegExp(`(${escapedQuery})`, 'i'));

    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="px-0.5 rounded" style={{ backgroundColor: 'var(--accent-amber-medium)', color: 'var(--text-primary)' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Calculate thinking content height for smooth animation
  const getThinkingContentStyle = (): React.CSSProperties => {
    if (!isThinking || !shouldThinkingCollapse) {
      return {};
    }
    if (thinkingExpanded) {
      return {
        maxHeight: '2000px', // Large enough to fit expanded content
        overflow: 'hidden',
        transition: 'max-height 0.3s ease-out',
      };
    }
    return {
      maxHeight: `${THINKING_MAX_LINES * THINKING_LINE_HEIGHT}px`,
      overflow: 'hidden',
      transition: 'max-height 0.3s ease-in',
      maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
    };
  };

  return (
    <div
      ref={itemRef}
      data-message-index={index}
      data-role={message.role}
      data-message-id={message.uuid}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 md:mb-4 transition-all duration-500 ${
        isLatest ? 'animate-pulse' : ''
      } ${isThinking ? 'thinking-message' : ''}`}
    >
      <div
        className={`flex gap-2 md:gap-3 max-w-[92%] md:max-w-[85%] ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border"
          style={{
            backgroundColor: isUser
              ? 'var(--accent-blue-subtle)'
              : isThinking
                ? 'var(--accent-amber-subtle)'
                : 'var(--accent-purple-subtle)',
            color: isUser ? 'var(--accent-blue)' : isThinking ? 'var(--accent-amber)' : 'var(--accent-purple)',
            borderColor: isUser
              ? 'var(--accent-blue-medium)'
              : isThinking
                ? 'var(--accent-amber-medium)'
                : 'var(--accent-purple-medium)',
          }}
        >
          {isUser ? (
            <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
          ) : isThinking ? (
            <Brain className="w-3.5 h-3.5 md:w-4 md:h-4" />
          ) : (
            <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
          )}
        </div>

        {/* Message Bubble */}
        <div
          className="rounded-2xl px-3 py-2.5 md:px-4 md:py-3 relative group"
          style={{
            backgroundColor: isUser
              ? 'var(--accent-blue-subtle)'
              : isThinking
                ? 'var(--accent-amber-subtle)'
                : 'var(--bg-card)',
            borderColor: isUser
              ? 'var(--accent-blue-medium)'
              : isThinking
                ? 'var(--accent-amber-medium)'
                : 'var(--border-primary)',
            borderWidth: '1px',
            borderRadius: isUser ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
            ...(isStreaming ? {
              boxShadow: '0 0 0 2px var(--accent-purple-medium)',
            } : {}),
            ...(searchQuery && message.content.toLowerCase().includes(searchQuery.toLowerCase()) ? {
              boxShadow: '0 0 0 2px var(--accent-amber-medium)',
            } : {}),
            ...(isJustNow ? {
              boxShadow: '0 0 0 2px var(--accent-green)',
            } : {}),
            ...(isThinking ? {
              fontStyle: 'italic',
            } : {}),
          }}
        >
          {/* Role Label & Actions */}
          <div
            className={`flex items-center gap-1.5 mb-1 md:mb-1.5 ${
              isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <span
              className="text-xs font-medium"
              style={{
                color: isUser
                  ? 'var(--accent-blue-light)'
                  : isThinking
                    ? 'var(--accent-amber)'
                    : 'var(--accent-purple)',
              }}
            >
              {isUser ? 'You' : isThinking ? 'Thinking' : 'Claude'}
            </span>
            {isStreaming && !isThinking && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-purple)' }}>
                <Sparkles className="w-3 h-3 animate-pulse" />
                typing...
              </span>
            )}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>•</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatRelativeTime(message.timestamp)}
            </span>

            {/* Bookmark Button */}
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(message.uuid)}
                className={`ml-1 p-1 rounded transition-opacity min-h-[32px] min-w-[32px] flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 ${
                  isBookmarked ? 'opacity-100' : 'opacity-100 md:opacity-0'
                }`}
                style={{
                  color: isBookmarked ? 'var(--accent-amber)' : 'var(--text-muted)',
                }}
                onMouseEnter={(e) => {
                  if (!isBookmarked) {
                    e.currentTarget.style.color = 'var(--accent-amber)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isBookmarked) {
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 md:w-3.5 md:h-3.5" />
                ) : (
                  <Bookmark className="w-4 h-4 md:w-3.5 md:h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className={`text-sm whitespace-pre-wrap break-words overflow-x-auto ${isThinking ? 'thinking-content' : ''}`}
            style={{
              color: isThinking ? 'var(--text-muted)' : 'var(--text-secondary)',
              opacity: isThinking ? 0.8 : 1,
              ...getThinkingContentStyle(),
            }}
          >
            {renderContent()}
          </div>

          {/* Thinking Expand/Collapse Button */}
          {isThinking && shouldThinkingCollapse && (
            <button
              onClick={() => setThinkingExpanded(!thinkingExpanded)}
              className="mt-2 text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--accent-amber)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-amber-light)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-amber)'}
            >
              {thinkingExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show more thinking
                </>
              )}
            </button>
          )}

          {/* Expand/Collapse Button */}
          {shouldCollapse && (
            <button
              onClick={handleToggleCollapse}
              className="mt-2 text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              {isCollapsed ? (
                <>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  Show more ({message.content.length - MESSAGE_PREVIEW_LENGTH} chars)
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show less
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
