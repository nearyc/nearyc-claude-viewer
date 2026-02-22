import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Lightbulb, Bookmark, BookmarkCheck } from 'lucide-react';
import type { ChatMessage } from '../../../types';
import { escapeRegExp } from '../utils/escapeRegExp';
import { formatRelativeTime } from '../../../utils/time';

const THINKING_PREVIEW_LENGTH = 200;
const THINKING_MIN_LENGTH_TO_COLLAPSE = 400;

interface ThinkingMessageProps {
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

export const ThinkingMessage: React.FC<ThinkingMessageProps> = ({
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
  const shouldCollapse = message.content.length > THINKING_MIN_LENGTH_TO_COLLAPSE;
  const [internalCollapsed, setInternalCollapsed] = useState(shouldCollapse);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

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
        ? message.content.slice(0, THINKING_PREVIEW_LENGTH) + '...'
        : message.content;
    }

    const content = isCollapsed
      ? message.content.slice(0, THINKING_PREVIEW_LENGTH) + '...'
      : message.content;

    if (!searchQuery.trim()) return content;

    const escapedQuery = escapeRegExp(searchQuery);
    const parts = content.split(new RegExp(`(${escapedQuery})`, 'i'));

    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark
          key={i}
          className="px-0.5 rounded"
          style={{
            backgroundColor: 'var(--accent-amber-medium)',
            color: 'var(--text-primary)',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      data-message-index={index}
      data-role={message.role}
      data-message-id={message.uuid}
      data-message-type="thinking"
      className={`flex justify-start mb-3 md:mb-4 transition-all duration-500 ${
        isLatest ? 'animate-pulse' : ''
      }`}
    >
      <div className="flex gap-2 md:gap-3 max-w-[92%] md:max-w-[85%] flex-row">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border"
          style={{
            backgroundColor: 'var(--thinking-bg)',
            color: 'var(--thinking-icon)',
            borderColor: 'var(--thinking-border)',
          }}
        >
          <Brain className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </div>

        {/* Thinking Message Container */}
        <div
          className="rounded-2xl px-3 py-2.5 md:px-4 md:py-3 relative group"
          style={{
            backgroundColor: 'var(--thinking-bg)',
            borderColor: 'var(--thinking-border)',
            borderWidth: '1px',
            borderStyle: 'dashed',
            borderRadius: '1rem 1rem 1rem 0.25rem',
            ...(isStreaming
              ? {
                  boxShadow: '0 0 0 2px var(--thinking-glow)',
                }
              : {}),
            ...(searchQuery &&
            message.content.toLowerCase().includes(searchQuery.toLowerCase())
              ? {
                  boxShadow: '0 0 0 2px var(--accent-amber-medium)',
                }
              : {}),
          }}
        >
          {/* Header with Label & Actions */}
          <div className="flex items-center gap-1.5 mb-1.5 md:mb-2 justify-start">
            {/* Thinking Label */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'var(--thinking-label-bg)',
                color: 'var(--thinking-label-text)',
              }}
            >
              <Lightbulb className="w-3 h-3" />
              <span>Thinking</span>
            </div>

            {isStreaming && (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--thinking-text)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                reasoning...
              </span>
            )}

            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              •
            </span>
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
                  color: isBookmarked
                    ? 'var(--accent-amber)'
                    : 'var(--text-muted)',
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
            className="text-sm whitespace-pre-wrap break-words overflow-x-auto italic"
            style={{
              color: 'var(--thinking-text)',
              fontSize: '0.8125rem',
              lineHeight: '1.6',
            }}
          >
            {renderContent()}
          </div>

          {/* Expand/Collapse Button */}
          {shouldCollapse && (
            <button
              onClick={handleToggleCollapse}
              className="mt-2 text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--thinking-text-muted)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--thinking-text)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = 'var(--thinking-text-muted)')
              }
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show more ({message.content.length - THINKING_PREVIEW_LENGTH}{' '}
                  chars)
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
