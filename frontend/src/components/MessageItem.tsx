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
import type { Message } from '../types';

interface MessageItemProps {
  message: Message;
  searchQuery?: string;
  memberColor?: string;
  isLatest?: boolean;
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

const getMessageTypeBadgeStyle = (type?: string): string => {
  const styles: Record<string, string> = {
    status_update: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    task_assignment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    idle_notification: 'bg-green-500/10 text-green-400 border-green-500/20',
    shutdown_approved: 'bg-red-500/10 text-red-400 border-red-500/20',
    dm: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    direct_message: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return styles[type || ''] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const getStatusColor = (status?: string): string => {
  const statusLower = status?.toLowerCase() || '';

  if (['available', 'idle', 'completed', 'success'].includes(statusLower)) {
    return 'text-green-400';
  }
  if (['busy', 'working', 'in_progress'].includes(statusLower)) {
    return 'text-amber-400';
  }
  if (['error', 'failed'].includes(statusLower)) {
    return 'text-red-400';
  }
  return 'text-blue-400';
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
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
      <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{part}</mark>
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
  const needsCollapse = shouldCollapse(content);
  const displayContent = isCollapsed && needsCollapse ? getPreviewText(content) : content;

  return (
    <div className="relative">
      <div className={`text-sm text-gray-300 whitespace-pre-wrap ${isCollapsed && needsCollapse ? 'max-h-40 overflow-hidden' : ''}`}>
        {searchQuery ? highlightText(displayContent, searchQuery) : displayContent}
      </div>

      {needsCollapse && (
        <button
          onClick={onToggle}
          className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="w-3 h-3" />
              Show more
            </>
          ) : (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
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
}) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgColor} border ${iconColor.replace('text-', 'border-')}/30`}>
      {icon}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-sm font-semibold ${iconColor} capitalize`}>{status}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
        <span className="font-medium text-gray-400">{from}</span>
        <span>•</span>
        <span title={formatFullTimestamp(timestamp)}>{formatTimestamp(timestamp)}</span>
      </div>
    </div>
  </div>
);

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

  if (parsed.type === 'idle_notification') {
    return (
      <CompactStatusRow
        icon={<CheckCircle className="w-4 h-4 text-green-500" />}
        iconColor="text-green-400"
        bgColor="bg-green-500/10"
        label="Agent is now"
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
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-red-500/10 border border-red-500/30">
          <Power className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-red-400">Shutdown Approved</span>
            {paneId && <span className="text-xs text-gray-500">({paneId})</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
            <span className="font-medium text-gray-400">{from}</span>
            <span>•</span>
            <span title={formatFullTimestamp(timestamp)}>{formatTimestamp(timestamp)}</span>
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
          <Activity className="w-4 h-4 text-amber-500" />
          <span className={`text-sm font-semibold ${getStatusColor(status)} capitalize`}>{status}</span>
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

    const priorityClass = priority === 'high'
      ? 'bg-red-500/10 text-red-400'
      : priority === 'medium'
        ? 'bg-yellow-500/10 text-yellow-400'
        : 'bg-blue-500/10 text-blue-400';

    return (
      <div className="px-4 py-2.5">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-gray-400 mb-0.5">New Task</div>
            <div className="text-sm font-medium text-gray-200">{task}</div>
            {priority && (
              <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityClass}`}>
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
        <pre className="bg-gray-950/50 rounded p-2 overflow-x-auto text-xs font-mono text-gray-400 border border-gray-800/60">
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

export const MessageItem: React.FC<MessageItemProps> = ({ message, searchQuery, isLatest }) => {
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

  // Scroll into view when new message arrives
  useEffect(() => {
    if (isLatest && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isLatest]);

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
        isJustNow ? 'ring-2 ring-green-500/50 ring-offset-2 ring-offset-gray-950' : ''
      }`}
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'rgba(30, 41, 59, 0.3)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeBadgeStyle}`}>
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
          className="text-[10px] text-gray-500 whitespace-nowrap"
          title={formatFullTimestamp(message.timestamp)}
        >
          {formatTimestamp(message.timestamp)}
        </span>
      </div>

      <SmartMessageContent message={message} parsed={parsed} searchQuery={searchQuery} />

      {!isCompactType && message.metadata && (
        <div className="px-4 py-2 space-y-1.5 border-t border-gray-800/30">
          {message.metadata.reportPath && (
            <div className="flex items-start gap-2 text-[10px]">
              <span className="text-gray-500 font-medium shrink-0">Report:</span>
              <code className="bg-gray-950 px-1.5 py-0.5 rounded text-gray-400 font-mono truncate text-[10px]">
                {message.metadata.reportPath}
              </code>
            </div>
          )}

          {message.metadata.keyFindings && message.metadata.keyFindings.length > 0 && (
            <div className="text-[10px]">
              <span className="text-gray-500 font-medium">Key Findings:</span>
              <ul className="mt-0.5 space-y-0.5">
                {message.metadata.keyFindings.map((finding: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5 text-gray-400">
                    <span className="text-gray-600">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {message.metadata.severity && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                message.metadata.severity === 'high'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : message.metadata.severity === 'medium'
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
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
