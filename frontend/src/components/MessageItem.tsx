import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  AlertCircle,
  FileText,
  User,
  CheckCircle,
  Activity,
  Power,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getMemberColor } from '../utils/colors';
import { useTranslation } from '../hooks/useTranslation';
import type { Message } from '../types';

interface MessageItemProps {
  message: Message;
  searchQuery?: string;
  memberColor?: string;
  isLatest?: boolean;
  disableAutoScroll?: boolean; // If true, don't scroll into view (used in compact/embedded mode)
}

// Hook to force re-render every interval for updating relative timestamps
const useTimeRefresh = (intervalMs: number = 10000) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);
};

// Text truncation config
const MAX_PREVIEW_LENGTH = 280;
const MAX_PREVIEW_LINES = 6;

type MessageType = 'idle_notification' | 'status_update' | 'task_assignment' | 'shutdown_approved' | 'plain' | 'json';

interface ParsedMessageContent {
  type: MessageType;
  data: any;
  displayText: string;
}

const parseMessageContent = (text: string, messageType?: string): ParsedMessageContent => {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) {
      const effectiveType = parsed.type || messageType;

      if (effectiveType === 'shutdown_approved' || parsed.requestId?.includes('shutdown')) {
        return {
          type: 'shutdown_approved',
          data: parsed,
          displayText: 'Shutdown Approved'
        };
      }

      if (effectiveType === 'idle_notification' || parsed.idleReason) {
        return {
          type: 'idle_notification',
          data: parsed,
          displayText: parsed.idleReason || parsed.status || 'available'
        };
      }

      if (effectiveType === 'status_update' || parsed.status) {
        return {
          type: 'status_update',
          data: parsed,
          displayText: parsed.message || parsed.status || text
        };
      }

      if (effectiveType === 'task_assignment' || parsed.task) {
        return {
          type: 'task_assignment',
          data: parsed,
          displayText: parsed.task || parsed.description || text
        };
      }

      return {
        type: 'json',
        data: parsed,
        displayText: JSON.stringify(parsed, null, 2)
      };
    }
  } catch {
    // Not JSON, treat as plain text
  }

  return {
    type: 'plain',
    data: null,
    displayText: text
  };
};

const getMessageTypeLabel = (type?: string): string => {
  const labels: Record<string, string> = {
    task_assignment: 'Task',
    status_update: 'Status',
    idle_notification: 'Status',
    shutdown_approved: 'System',
    dm: 'DM',
    direct_message: 'DM',
    message: 'Msg',
  };

  if (labels[type || '']) return labels[type || ''];
  if (!type) return 'Msg';

  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).slice(0, 10);
};

const getMessageIcon = (type?: string) => {
  switch (type) {
    case 'status_update':
      return <Activity className="w-3 h-3" />;
    case 'task_assignment':
      return <FileText className="w-3 h-3" />;
    case 'idle_notification':
      return <CheckCircle className="w-3 h-3" />;
    case 'shutdown_approved':
      return <Power className="w-3 h-3" />;
    case 'dm':
    case 'direct_message':
      return <User className="w-3 h-3" />;
    default:
      return <MessageSquare className="w-3 h-3" />;
  }
};

const getMessageTypeBadgeStyle = (type?: string): React.CSSProperties => {
  const styles: Record<string, React.CSSProperties> = {
    status_update: {
      backgroundColor: 'var(--accent-amber-subtle)',
      color: 'var(--accent-amber)',
      borderColor: 'var(--accent-amber-medium)',
    },
    task_assignment: {
      backgroundColor: 'var(--accent-green-subtle)',
      color: 'var(--accent-green)',
      borderColor: 'var(--accent-green-medium)',
    },
    idle_notification: {
      backgroundColor: 'var(--accent-green-subtle)',
      color: 'var(--accent-green)',
      borderColor: 'var(--accent-green-medium)',
    },
    shutdown_approved: {
      backgroundColor: 'var(--accent-red-subtle)',
      color: 'var(--accent-red)',
      borderColor: 'var(--accent-red-medium)',
    },
    dm: {
      backgroundColor: 'var(--accent-purple-subtle)',
      color: 'var(--accent-purple)',
      borderColor: 'var(--accent-purple-medium)',
    },
    direct_message: {
      backgroundColor: 'var(--accent-purple-subtle)',
      color: 'var(--accent-purple)',
      borderColor: 'var(--accent-purple-medium)',
    },
  };

  return styles[type || ''] || {
    backgroundColor: 'var(--bg-hover)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border-primary)',
  };
};

const getStatusColor = (status?: string): string => {
  const statusLower = status?.toLowerCase() || '';

  if (['available', 'idle', 'completed', 'success'].includes(statusLower)) {
    return 'var(--accent-green)';
  }
  if (['busy', 'working', 'in_progress'].includes(statusLower)) {
    return 'var(--accent-amber)';
  }
  if (['error', 'failed'].includes(statusLower)) {
    return 'var(--accent-red)';
  }
  return 'var(--accent-blue)';
};

const formatTimestamp = (timestamp: number, t: (key: string) => string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('message.now');
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatFullTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const shouldCollapse = (text: string | undefined): boolean => {
  if (!text) return false;
  const lines = text.split('\n');
  return lines.length > MAX_PREVIEW_LINES || text.length > MAX_PREVIEW_LENGTH;
};

const getPreviewText = (text: string | undefined): string => {
  if (!text) return '';
  const lines = text.split('\n');

  if (lines.length > MAX_PREVIEW_LINES) {
    return lines.slice(0, MAX_PREVIEW_LINES).join('\n') + '\n...';
  }
  if (text.length > MAX_PREVIEW_LENGTH) {
    return text.slice(0, MAX_PREVIEW_LENGTH) + '...';
  }
  return text;
};

const highlightText = (text: string | undefined, query: string): React.ReactNode => {
  if (!text || !query.trim()) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Remove 'g' flag to avoid lastIndex issues - use 'i' for case-insensitive only
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'i'));

  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded px-0.5" style={{ backgroundColor: 'var(--accent-amber-medium)', color: 'var(--text-primary)' }}>{part}</mark>
    ) : (
      part
    )
  );
};

interface PlainTextContentProps {
  content: string | undefined;
  searchQuery?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

const PlainTextContent: React.FC<PlainTextContentProps> = ({
  content,
  searchQuery,
  isCollapsed,
  onToggle
}) => {
  const { t } = useTranslation();
  const needsCollapse = shouldCollapse(content);
  const displayContent = isCollapsed && needsCollapse ? getPreviewText(content) : content;

  return (
    <div className="relative">
      <div
        className={`text-sm whitespace-pre-wrap ${isCollapsed && needsCollapse ? 'max-h-40 overflow-hidden' : ''}`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {searchQuery ? highlightText(displayContent, searchQuery) : displayContent}
      </div>

      {needsCollapse && (
        <button
          onClick={onToggle}
          className="mt-2 flex items-center gap-1 text-xs transition-colors"
          style={{ color: 'var(--accent-blue)' }}
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="w-3 h-3" />
              {t('message.showMore')}
            </>
          ) : (
            <>
              <ChevronUp className="w-3 h-3" />
              {t('message.showLess')}
            </>
          )}
        </button>
      )}
    </div>
  );
};

interface CompactStatusRowProps {
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  label: string;
  status: string;
  from: string;
  timestamp: number;
}

const CompactStatusRow: React.FC<CompactStatusRowProps> = ({
  icon,
  iconColor,
  bgColor,
  label,
  status,
  from,
  timestamp
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
        style={{
          backgroundColor: bgColor,
          borderColor: `${iconColor}4D`, // 30% opacity
        }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-muted)' }} className="text-xs">{label}</span>
          <span className="text-sm font-semibold capitalize" style={{ color: iconColor }}>{status}</span>
        </div>
        <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{from}</span>
          <span>•</span>
          <span title={formatFullTimestamp(timestamp)}>{formatTimestamp(timestamp, t)}</span>
        </div>
      </div>
    </div>
  );
};

interface SmartMessageContentProps {
  message: Message;
  parsed: ParsedMessageContent;
  searchQuery?: string;
}

const SmartMessageContent: React.FC<SmartMessageContentProps> = ({
  message,
  parsed,
  searchQuery
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { t } = useTranslation();

  if (parsed.type === 'idle_notification') {
    return (
      <CompactStatusRow
        icon={<CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />}
        iconColor="var(--accent-green)"
        bgColor="var(--accent-green-subtle)"
        label={t('message.agentIsNow')}
        status={parsed.data?.idleReason || parsed.data?.status || 'available'}
        from={parsed.data?.from || message.sender}
        timestamp={parsed.data?.timestamp || message.timestamp}
      />
    );
  }

  if (parsed.type === 'shutdown_approved') {
    const from = parsed.data?.from || message.sender;
    const timestamp = parsed.data?.timestamp || message.timestamp;
    const paneId = parsed.data?.paneId || '';

    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: 'var(--accent-red-subtle)',
            borderColor: 'var(--accent-red-medium)',
          }}
        >
          <Power className="w-4 h-4" style={{ color: 'var(--accent-red)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>{t('message.shutdownApproved')}</span>
            {paneId && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({paneId})</span>}
          </div>
          <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{from}</span>
            <span>•</span>
            <span title={formatFullTimestamp(timestamp)}>{formatTimestamp(timestamp, t)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (parsed.type === 'status_update') {
    const status = parsed.data?.status || 'updated';
    const statusMessage = parsed.data?.message || parsed.displayText;

    return (
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
          <span className="text-sm font-semibold capitalize" style={{ color: getStatusColor(status) }}>{status}</span>
        </div>
        {statusMessage && statusMessage !== status && (
          <div className="pl-6">
            <PlainTextContent
              content={statusMessage}
              searchQuery={searchQuery}
              isCollapsed={isCollapsed}
              onToggle={() => setIsCollapsed(!isCollapsed)}
            />
          </div>
        )}
      </div>
    );
  }

  if (parsed.type === 'task_assignment') {
    const task = parsed.data?.task || parsed.displayText;
    const priority = parsed.data?.priority;

    const priorityStyle: React.CSSProperties = priority === 'high'
      ? { backgroundColor: 'var(--accent-red-subtle)', color: 'var(--accent-red)' }
      : priority === 'medium'
        ? { backgroundColor: 'var(--accent-amber-subtle)', color: 'var(--accent-amber)' }
        : { backgroundColor: 'var(--accent-blue-subtle)', color: 'var(--accent-blue)' };

    return (
      <div className="px-4 py-2.5">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent-green)' }} />
          <div className="flex-1">
            <div className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>{t('message.newTask')}</div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task}</div>
            {priority && (
              <span
                className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={priorityStyle}
              >
                {priority}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (parsed.type === 'json') {
    return (
      <div className="px-4 py-2">
        <pre
          className="rounded p-2 overflow-x-auto text-xs font-mono border"
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-muted)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <code>{parsed.displayText}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <PlainTextContent
        content={message.content}
        searchQuery={searchQuery}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
    </div>
  );
};

export const MessageItem: React.FC<MessageItemProps> = ({ message, searchQuery, isLatest, disableAutoScroll }) => {
  const { t } = useTranslation();
  useTimeRefresh(10000);
  const itemRef = useRef<HTMLDivElement>(null);

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
      }, 2000);

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

  // Scroll into view when new message arrives (only if not disabled)
  useEffect(() => {
    if (isLatest && !disableAutoScroll && itemRef.current) {
      // Use 'nearest' to avoid scrolling the entire page
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isLatest, disableAutoScroll]);

  const parsed = parseMessageContent(message.content, message.type);
  const typeLabel = getMessageTypeLabel(message.type);
  const typeBadgeStyle = getMessageTypeBadgeStyle(message.type);
  const isCompactType = ['idle_notification', 'shutdown_approved'].includes(parsed.type);

  // Get color for the message sender
  const senderColor = getMemberColor(message.sender);

  return (
    <div
      ref={itemRef}
      className={`group relative rounded-lg border transition-all duration-200 overflow-hidden ${
        isJustNow ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
        ...(isJustNow && {
          ringColor: 'var(--accent-green)',
          ringOpacity: '0.5',
          ringOffsetColor: 'var(--bg-primary)',
        }),
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
            style={typeBadgeStyle}
          >
            {getMessageIcon(message.type)}
            {typeLabel}
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: senderColor }}
            title={`From: ${message.sender}`}
          >
            {message.sender}
          </span>
        </div>

        <span
          className="text-[10px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
          title={formatFullTimestamp(message.timestamp)}
        >
          {formatTimestamp(message.timestamp, t)}
        </span>
      </div>

      <SmartMessageContent message={message} parsed={parsed} searchQuery={searchQuery} />

      {!isCompactType && message.metadata && (
        <div className="px-4 py-2 space-y-1.5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          {message.metadata.reportPath && (
            <div className="flex items-start gap-2 text-[10px]">
              <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Report:</span>
              <code
                className="px-1.5 py-0.5 rounded font-mono truncate text-[10px]"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-muted)',
                }}
              >
                {message.metadata.reportPath}
              </code>
            </div>
          )}

          {message.metadata.keyFindings && message.metadata.keyFindings.length > 0 && (
            <div className="text-[10px]">
              <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Key Findings:</span>
              <ul className="mt-0.5 space-y-0.5">
                {message.metadata.keyFindings.map((finding: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {message.metadata.severity && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border`}
              style={
                message.metadata.severity === 'high'
                  ? {
                      backgroundColor: 'var(--accent-red-subtle)',
                      color: 'var(--accent-red)',
                      borderColor: 'var(--accent-red-medium)',
                    }
                  : message.metadata.severity === 'medium'
                    ? {
                        backgroundColor: 'var(--accent-amber-subtle)',
                        color: 'var(--accent-amber)',
                        borderColor: 'var(--accent-amber-medium)',
                      }
                    : {
                        backgroundColor: 'var(--accent-blue-subtle)',
                        color: 'var(--accent-blue)',
                        borderColor: 'var(--accent-blue-medium)',
                      }
              }
            >
              {message.metadata.severity === 'high' && <AlertCircle className="w-2.5 h-2.5" />}
              {message.metadata.severity}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
