import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  FolderOpen,
  Clock,
  Hash,
  ChevronDown,
  ChevronRight,
  FileText,
  User,
  Bot,
  ChevronUp,
  ArrowDown,
  ArrowUp,
  Sparkles,
  Search,
  Bookmark,
  BookmarkCheck,
  X,
  MoreHorizontal,
  BarChart3,
  Terminal,
  Copy,
  Check,
  Star,
  Edit3,
  Download,
} from 'lucide-react';
import type { Session, ChatMessage } from '../types';
import { useSessionNames } from '../hooks/useSessionNames';
import { useSessionTags } from '../hooks/useSessionTags';
import { ExportDialog } from './ExportDialog';
import { TagSelector } from './TagSelector';

interface SessionDetailProps {
  session: Session | null;
  isUpdating?: boolean;
}

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

interface SearchMatch {
  messageIndex: number;
  start: number;
  end: number;
}

// Constants for message folding
const MESSAGE_PREVIEW_LENGTH = 300;
const MESSAGE_MIN_LENGTH_TO_COLLAPSE = 500;

// Chat message component with user/assistant styling
const MessageItem: React.FC<MessageItemProps> = ({
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

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Navigation Button Component
interface NavButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  title: string;
  isActive?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ onClick, icon, label, title, isActive }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all ${
      isActive
        ? 'bg-blue-600/20 text-blue-400'
        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// Time Density Chart Component
interface TimeDensityChartProps {
  messages: ChatMessage[];
  onSelectTime: (timestamp: number) => void;
}

const TimeDensityChart: React.FC<TimeDensityChartProps> = ({ messages, onSelectTime }) => {
  const densityData = useMemo(() => {
    if (messages.length === 0) return [];

    const minTime = Math.min(...messages.map(m => m.timestamp));
    const maxTime = Math.max(...messages.map(m => m.timestamp));
    const timeRange = maxTime - minTime;

    if (timeRange === 0) return [{ time: minTime, count: messages.length, intensity: 1 }];

    // Create 20 time buckets
    const bucketCount = 20;
    const bucketSize = timeRange / bucketCount;
    const buckets: { time: number; count: number; intensity: number }[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = minTime + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      const count = messages.filter(
        m => m.timestamp >= bucketStart && m.timestamp < bucketEnd
      ).length;
      buckets.push({ time: bucketStart, count, intensity: 0 });
    }

    // Normalize intensity
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    buckets.forEach(b => {
      b.intensity = b.count / maxCount;
    });

    return buckets;
  }, [messages]);

  return (
    <div className="px-4 py-2 border-b border-gray-800/60 bg-gray-900/30">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500">Activity</span>
      </div>
      <div className="flex items-end gap-0.5 h-8">
        {densityData.map((bucket, i) => (
          <button
            key={i}
            onClick={() => onSelectTime(bucket.time)}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80"
            style={{
              height: `${Math.max(20, bucket.intensity * 100)}%`,
              backgroundColor: `rgba(99, 102, 241, ${0.2 + bucket.intensity * 0.8})`,
            }}
            title={`${bucket.count} messages`}
          />
        ))}
      </div>
    </div>
  );
};

export const SessionDetail: React.FC<SessionDetailProps> = ({ session, isUpdating }) => {
  const [showInputs, setShowInputs] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [messageCount, setMessageCount] = useState(0);

  // Copy state for session ID
  const [copied, setCopied] = useState(false);

  // Custom session name
  const { getSessionName, setSessionName, hasCustomName } = useSessionNames();
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');

  // Tags
  const { getSessionTags, addTag, removeTag, getAllTags } = useSessionTags();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = session?.sessionId ? localStorage.getItem(`bookmarks-${session.sessionId}`) : null;
    return saved ? JSON.parse(saved) : [];
  });

  // Export dialog state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Collapsed messages state
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(() => {
    // Default collapse all long messages
    if (session?.messages) {
      const longMessages = session.messages
        .filter(m => m.content.length > MESSAGE_MIN_LENGTH_TO_COLLAPSE)
        .map(m => m.uuid);
      return new Set(longMessages);
    }
    return new Set();
  });

  // Save bookmarks to localStorage
  useEffect(() => {
    if (session?.sessionId) {
      localStorage.setItem(`bookmarks-${session.sessionId}`, JSON.stringify(bookmarks));
    }
  }, [bookmarks, session?.sessionId]);

  // All hooks must be called before any conditional returns
  // Sort inputs by timestamp desc (newest first)
  const sortedInputs = session ? [...session.inputs].sort((a, b) => b.timestamp - a.timestamp) : [];

  // Sort messages by timestamp asc (oldest first for conversation flow)
  const sortedMessages = session?.messages
    ? [...session.messages].sort((a, b) => a.timestamp - b.timestamp)
    : [];

  const hasFullConversation = sortedMessages.length > 0;

  // Calculate search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const matches: SearchMatch[] = [];

    sortedMessages.forEach((message, idx) => {
      const content = message.content.toLowerCase();
      let pos = content.indexOf(query);
      while (pos !== -1) {
        matches.push({ messageIndex: idx, start: pos, end: pos + query.length });
        pos = content.indexOf(query, pos + 1);
      }
    });

    return matches;
  }, [searchQuery, sortedMessages]);

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
    if (hasFullConversation && sortedMessages.length !== messageCount) {
      const newMessageCount = sortedMessages.length;
      setMessageCount(newMessageCount);

      if (isAtBottom && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [sortedMessages.length, messageCount, isAtBottom, hasFullConversation]);

  // Navigation functions
  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const scrollToPrevUserInput = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const messages = container.querySelectorAll('[data-role="user"]');
    const containerRect = container.getBoundingClientRect();
    let target: Element | null = null;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgRect = msg.getBoundingClientRect();
      if (msgRect.top < containerRect.top + 100) {
        target = msg;
        break;
      }
    }

    if (target) {
      (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (messages.length > 0) {
      messages[messages.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToNextUserOutput = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const messages = container.querySelectorAll('[data-role="assistant"]');
    const containerRect = container.getBoundingClientRect();
    let target: Element | null = null;

    for (const msg of messages) {
      const msgRect = msg.getBoundingClientRect();
      if (msgRect.top > containerRect.bottom - 100) {
        target = msg;
        break;
      }
    }

    if (target) {
      (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (messages.length > 0) {
      messages[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Search navigation
  const navigateToMatch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % searchMatches.length;
    } else {
      newIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    }
    setCurrentMatchIndex(newIndex);

    const match = searchMatches[newIndex];
    const messageElement = scrollContainerRef.current?.querySelector(
      `[data-message-index="${match.messageIndex}"]`
    );
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Jump to time from density chart
  const jumpToTime = (timestamp: number) => {
    const targetIndex = sortedMessages.findIndex(m => m.timestamp >= timestamp);
    if (targetIndex !== -1) {
      const messageElement = scrollContainerRef.current?.querySelector(
        `[data-message-index="${targetIndex}"]`
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Toggle bookmark
  const toggleBookmark = (messageId: string) => {
    setBookmarks(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      }
      return [...prev, messageId];
    });
  };

  // Toggle message collapse
  const toggleMessageCollapse = (messageId: string) => {
    setCollapsedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Jump to bookmark
  const jumpToBookmark = (messageId: string) => {
    const messageIndex = sortedMessages.findIndex(m => m.uuid === messageId);
    if (messageIndex !== -1) {
      const messageElement = scrollContainerRef.current?.querySelector(
        `[data-message-index="${messageIndex}"]`
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Conditional return after all hooks
  if (!session) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <MessageSquare className="w-7 h-7 opacity-40" />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a session to view details</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
        }}
      >
        <div className="flex items-center gap-2 text-gray-100 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <span className="font-semibold text-gray-200">Session Details</span>
          {isUpdating && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-600/30">
              <Sparkles className="w-3 h-3 animate-pulse" />
              Updating...
            </span>
          )}

          {/* Custom Name Display/Edit */}
          <div className="ml-auto flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  placeholder="输入自定义名称..."
                  className="px-2 py-1 text-sm rounded bg-gray-800 border border-gray-600 text-gray-200 focus:outline-none focus:border-yellow-500 w-40"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSessionName(session.sessionId, customNameInput);
                      setIsEditingName(false);
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    setSessionName(session.sessionId, customNameInput);
                    setIsEditingName(false);
                  }}
                  className="p-1 text-green-400 hover:text-green-300"
                  title="保存"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-1 text-gray-400 hover:text-gray-300"
                  title="取消"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCustomNameInput(getSessionName(session.sessionId) || '');
                  setIsEditingName(true);
                }}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all ${
                  hasCustomName(session.sessionId)
                    ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
                title={hasCustomName(session.sessionId) ? '编辑自定义名称' : '添加自定义名称'}
              >
                {hasCustomName(session.sessionId) ? (
                  <>
                    <Star className="w-3.5 h-3.5" fill="currentColor" />
                    <span className="max-w-[120px] truncate">
                      {getSessionName(session.sessionId)}
                    </span>
                    <Edit3 className="w-3 h-3 ml-1" />
                  </>
                ) : (
                  <>
                    <Star className="w-3.5 h-3.5" />
                    <span>收藏</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Session Info */}
        <div className="space-y-3">
          {/* Project Path */}
          <div className="flex items-start gap-2">
            <FolderOpen className="w-4 h-4 text-gray-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-0.5">Project</div>
              <div className="text-sm text-gray-300 truncate">{session.project}</div>
            </div>
            <button
              onClick={() => {
                const command = `start powershell -Command "cd '${session.project}'; claude --dangerously-skip-permissions --resume '${session.sessionId}'"`;
                fetch('/api/execute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ command }),
                }).catch(console.error);
              }}
              title="在 Claude Code 中打开"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>在 Claude Code 中打开</span>
            </button>
            <button
              onClick={() => {
                // 使用 VS Code URI handler 打开
                const encodedPath = encodeURIComponent(session.project);
                const encodedSession = encodeURIComponent(session.sessionId);
                const vscodeUri = `vscode://your-name.claude-code-launcher/open?path=${encodedPath}&session=${encodedSession}`;
                window.open(vscodeUri, '_self');
              }}
              title="在 VS Code 中打开"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all text-blue-400 hover:text-blue-300 hover:bg-blue-600/20 border border-blue-600/30 hover:border-blue-500/50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.583.063a1.5 1.5 0 0 1 1.342.894l.062.158 3.5 11.5a1.5 1.5 0 0 1-.947 1.89l-.159.048-8.527 1.707a.5.5 0 0 0-.369.369l-1.707 8.527a1.5 1.5 0 0 1-2.89.051l-.048-.159-3.5-11.5a1.5 1.5 0 0 1 .947-1.89l.159-.048 8.527-1.707a.5.5 0 0 0 .369-.369l1.707-8.527A1.5 1.5 0 0 1 17.583.063zM6.354 6.354l-3.182 3.182 2.828 2.828 3.182-3.182-2.828-2.828zm9.9 9.9l-3.182 3.182 2.828 2.828 3.182-3.182-2.828-2.828z"/>
              </svg>
              <span>在 VS Code 中打开</span>
            </button>

            {/* Export Button */}
            <button
              onClick={() => setIsExportOpen(true)}
              title="导出会话"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all text-green-400 hover:text-green-300 hover:bg-green-600/20 border border-green-600/30 hover:border-green-500/50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出</span>
            </button>
          </div>

          {/* Session ID */}
          <div className="flex items-start gap-2">
            <Hash className="w-4 h-4 text-gray-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-0.5">Session ID</div>
              <div className="text-sm text-gray-400 font-mono truncate">{session.sessionId}</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(session.sessionId);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all ${
                copied
                  ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
              title={copied ? '已复制!' : '复制 Session ID'}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>

          {/* Tags */}
          <div className="pt-2 border-t border-gray-800/40">
            <div className="text-xs text-gray-500 mb-2">标签</div>
            <TagSelector
              tags={getSessionTags(session.sessionId)}
              availableTags={getAllTags()}
              onAddTag={(tag) => {
                addTag(session.sessionId, tag);
                return true;
              }}
              onRemoveTag={(tag) => removeTag(session.sessionId, tag)}
              placeholder="添加标签..."
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 pt-2 border-t border-gray-800/40">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Messages</div>
              <div className="text-lg font-semibold text-gray-200">
                {hasFullConversation ? sortedMessages.length : session.inputCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Last Active</div>
              <span className="text-sm text-gray-300">{formatRelativeTime(session.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      {hasFullConversation && (
        <div className="px-3 py-2 border-b border-gray-800/60 bg-gray-900/30 flex items-center gap-2 flex-wrap">
          <NavButton
            onClick={scrollToTop}
            icon={<ChevronUp className="w-3.5 h-3.5" />}
            label="Top"
            title="Scroll to top"
          />
          <NavButton
            onClick={scrollToBottom}
            icon={<ChevronDown className="w-3.5 h-3.5" />}
            label="Bottom"
            title="Scroll to bottom"
          />
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <NavButton
            onClick={scrollToPrevUserInput}
            icon={<ArrowUp className="w-3.5 h-3.5" />}
            label="Prev Input"
            title="Scroll to previous user input"
          />
          <NavButton
            onClick={scrollToNextUserOutput}
            icon={<ArrowDown className="w-3.5 h-3.5" />}
            label="Next Output"
            title="Scroll to next AI output"
          />
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <NavButton
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            icon={<Search className="w-3.5 h-3.5" />}
            label="Search"
            title="Search in conversation"
            isActive={isSearchOpen}
          />
          <NavButton
            onClick={() => {
              if (bookmarks.length > 0) {
                jumpToBookmark(bookmarks[0]);
              }
            }}
            icon={<Bookmark className="w-3.5 h-3.5" />}
            label={`Bookmarks (${bookmarks.length})`}
            title="Jump to bookmarks"
          />
          <div className="flex-1" />
          {!isAtBottom && (
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md transition-all"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              New messages
            </button>
          )}
        </div>
      )}

      {/* Search Bar */}
      {isSearchOpen && hasFullConversation && (
        <div className="px-4 py-2 border-b border-gray-800/60 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Search in conversation..."
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
              autoFocus
            />
            {searchQuery && (
              <span className="text-xs text-gray-500">
                {searchMatches.length > 0
                  ? `${currentMatchIndex + 1} / ${searchMatches.length}`
                  : 'No matches'}
              </span>
            )}
            {searchMatches.length > 0 && (
              <>
                <button
                  onClick={() => navigateToMatch('prev')}
                  className="p-1 text-gray-500 hover:text-gray-300"
                  title="Previous match"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => navigateToMatch('next')}
                  className="p-1 text-gray-500 hover:text-gray-300"
                  title="Next match"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Time Density Chart */}
      {hasFullConversation && sortedMessages.length > 5 && (
        <TimeDensityChart messages={sortedMessages} onSelectTime={jumpToTime} />
      )}

      {/* Bookmarks List */}
      {bookmarks.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800/60 bg-yellow-900/10">
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs text-yellow-500">Bookmarks</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bookmarks.map((messageId) => {
              const msg = sortedMessages.find(m => m.uuid === messageId);
              if (!msg) return null;
              const preview = msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : '');
              return (
                <button
                  key={messageId}
                  onClick={() => jumpToBookmark(messageId)}
                  className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded hover:bg-yellow-500/20 transition-colors"
                  title={msg.content}
                >
                  {msg.role === 'user' ? 'You: ' : 'Claude: '}{preview}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {hasFullConversation ? (
          // Full conversation view
          <>
            <div className="px-4 py-3 border-b border-gray-800/60 bg-gray-900/30 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">
                Conversation ({sortedMessages.length} messages)
              </span>
              {isUpdating && (
                <span className="flex items-center gap-1 text-xs text-purple-400">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  Receiving updates...
                </span>
              )}
            </div>
            <div className="p-4">
              {sortedMessages.map((message, index) => (
                <MessageItem
                  key={message.uuid}
                  message={message}
                  index={index}
                  isLatest={index === sortedMessages.length - 1 && isUpdating}
                  isStreaming={index === sortedMessages.length - 1 && isUpdating && message.role === 'assistant'}
                  searchQuery={searchQuery}
                  isBookmarked={bookmarks.includes(message.uuid)}
                  onToggleBookmark={toggleBookmark}
                  isCollapsed={collapsedMessages.has(message.uuid)}
                  onToggleCollapse={toggleMessageCollapse}
                />
              ))}
            </div>

            {/* Toggle to show raw inputs */}
            <div className="px-4 py-3 border-t border-gray-800/60 bg-gray-900/30">
              <button
                onClick={() => setShowInputs(!showInputs)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                {showInputs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span>{showInputs ? 'Hide' : 'Show'} raw inputs ({session.inputCount})</span>
              </button>
            </div>

            {/* Raw Inputs (hidden by default when we have conversation) */}
            {showInputs && (
              <div className="border-t border-gray-800/60">
                {sortedInputs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-sm">No inputs in this session</p>
                  </div>
                ) : (
                  sortedInputs.map((input, index) => (
                    <div key={index} className="border-b border-gray-800/60 last:border-b-0">
                      <div className="flex items-start gap-3 p-4">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-500">#{sortedInputs.length - index}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-3 h-3 text-gray-600" />
                            <span className="text-xs text-gray-500">{formatRelativeTime(input.timestamp)}</span>
                          </div>
                          <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                            {input.display || '(empty)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          // Raw inputs view (no full conversation available)
          <>
            <div className="px-4 py-3 border-b border-gray-800/60 bg-gray-900/30">
              <span className="text-sm font-medium text-gray-400">
                Inputs ({session.inputCount})
              </span>
              <p className="text-xs text-gray-600 mt-1">
                Full conversation not available. Only user inputs shown.
              </p>
            </div>
            <div>
              {sortedInputs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-sm">No inputs in this session</p>
                </div>
              ) : (
                sortedInputs.map((input, index) => (
                  <div key={index} className="border-b border-gray-800/60 last:border-b-0">
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-500">#{sortedInputs.length - index}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-3 h-3 text-gray-600" />
                          <span className="text-xs text-gray-500">{formatRelativeTime(input.timestamp)}</span>
                        </div>
                        <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                          {input.display || '(empty)'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        session={session}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};

export default SessionDetail;
