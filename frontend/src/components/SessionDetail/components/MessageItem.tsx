import React, { useRef, useState, useEffect } from 'react';
import { User, Bot, Sparkles, Bookmark, BookmarkCheck, MoreHorizontal, ChevronUp } from 'lucide-react';
import type { ChatMessage } from '../../../types';
import { escapeRegExp } from '../utils/escapeRegExp';
import { formatRelativeTime } from '../../../utils/time';

const MESSAGE_PREVIEW_LENGTH = 300;
const MESSAGE_MIN_LENGTH_TO_COLLAPSE = 500;

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
  const itemRef = useRef<HTMLDivElement>(null);
  const shouldCollapse = message.content.length > MESSAGE_MIN_LENGTH_TO_COLLAPSE;
  const [internalCollapsed, setInternalCollapsed] = useState(shouldCollapse);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

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
        <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      ref={itemRef}
      data-message-index={index}
      data-role={message.role}
      data-message-id={message.uuid}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 transition-all duration-500 ${
        isLatest ? 'animate-pulse' : ''
      }`}
    >
      <div
        className={`flex gap-3 max-w-[85%] ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
              : 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 relative group ${
            isUser
              ? 'bg-blue-600/20 border border-blue-600/30 rounded-tr-sm'
              : 'bg-gray-800/80 border border-gray-700 rounded-tl-sm'
          } ${isStreaming ? 'ring-2 ring-purple-500/50 ring-offset-2 ring-offset-gray-950' : ''} ${
            searchQuery && message.content.toLowerCase().includes(searchQuery.toLowerCase())
              ? 'ring-2 ring-yellow-500/30'
              : ''
          } ${isJustNow ? 'ring-2 ring-green-500/50 ring-offset-2 ring-offset-gray-950' : ''}`}
        >
          {/* Role Label & Actions */}
          <div
            className={`flex items-center gap-1.5 mb-1.5 ${
              isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <span
              className={`text-xs font-medium ${
                isUser ? 'text-blue-400' : 'text-purple-400'
              }`}
            >
              {isUser ? 'You' : 'Claude'}
            </span>
            {isStreaming && (
              <span className="flex items-center gap-1 text-xs text-purple-400">
                <Sparkles className="w-3 h-3 animate-pulse" />
                typing...
              </span>
            )}
            <span className="text-xs text-gray-600">•</span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(message.timestamp)}
            </span>

            {/* Bookmark Button */}
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(message.uuid)}
                className={`ml-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                  isBookmarked ? 'opacity-100 text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-3.5 h-3.5" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Content */}
          <div
            className={`text-sm whitespace-pre-wrap break-words ${
              isUser ? 'text-gray-200' : 'text-gray-300'
            }`}
          >
            {renderContent()}
          </div>

          {/* Expand/Collapse Button */}
          {shouldCollapse && (
            <button
              onClick={handleToggleCollapse}
              className="mt-2 text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
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
