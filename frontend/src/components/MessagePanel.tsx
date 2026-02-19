import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Inbox, Bell, MessageCircle, Search, Filter, X } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { getMemberColor } from '../utils/colors';
import { useTranslation } from '../hooks/useTranslation';
import type { TeamWithInboxes, Message } from '../types';

interface MessagePanelProps {
  team: TeamWithInboxes | null;
  selectedMember: string | null;
  onViewSession?: (sessionId: string) => void;
}

const getActualMessageType = (message: Message): string => {
  if (message.type && message.type !== 'message') return message.type;

  try {
    const parsed = JSON.parse(message.content);
    if (parsed.type) return parsed.type;
    if (parsed.idleReason) return 'idle_notification';
    if (parsed.requestId?.includes('shutdown')) return 'shutdown_approved';
  } catch {
    // Not JSON
  }

  return message.type || 'message';
};

const filterMessages = (
  messages: Message[],
  searchQuery: string,
  typeFilter: string
): Message[] => {
  return messages.filter((message) => {
    if (typeFilter !== 'all' && getActualMessageType(message) !== typeFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchText = `${message.content} ${message.sender} ${message.recipient}`.toLowerCase();
      return searchText.includes(query);
    }

    return true;
  });
};

// Empty state component
const EmptyState: React.FC<{
  icon: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}> = ({ icon, message, action }) => (
  <div
    className="h-full flex flex-col items-center justify-center"
    style={{ color: 'var(--text-muted)' }}
  >
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {icon}
    </div>
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    {action}
  </div>
);

export const MessagePanel: React.FC<MessagePanelProps> = ({
  team,
  selectedMember,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [messageCount, setMessageCount] = useState(0);

  const selectedInbox = team?.inboxes?.find((inbox) => inbox.memberName === selectedMember);

  // Get filter options with translations
  const messageTypeFilters = useMemo(() => [
    { value: 'all', label: t('message.allTypes') },
    { value: 'idle_notification', label: t('message.typeStatus') },
    { value: 'status_update', label: t('message.typeUpdates') },
    { value: 'task_assignment', label: t('message.typeTasks') },
    { value: 'shutdown_approved', label: t('message.typeSystem') },
    { value: 'message', label: t('message.typeMessages') },
  ], [t]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messageLength = selectedInbox?.messages?.length || 0;

    if (messageLength > 0 && messageLength !== messageCount) {
      setMessageCount(messageLength);
      // Small delay to ensure DOM has rendered
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [selectedInbox?.messages?.length, messageCount]);

  // Reset message count when switching members
  useEffect(() => {
    setMessageCount(0);
  }, [selectedMember]);

  const filteredMessages = useMemo(() => {
    if (!selectedInbox?.messages) return [];
    return filterMessages(selectedInbox.messages, searchQuery, typeFilter);
  }, [selectedInbox, searchQuery, typeFilter]);

  const totalUnread = team?.inboxes?.reduce(
    (sum, inbox) => sum + (inbox.messages?.length || 0),
    0
  ) || 0;

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
  };

  const renderContent = () => {
    if (!team) {
      return (
        <EmptyState
          icon={<Inbox className="w-7 h-7 opacity-40" />}
          message={t('message.selectTeam')}
        />
      );
    }

    if (!selectedMember) {
      return (
        <EmptyState
          icon={<Inbox className="w-7 h-7 opacity-40" />}
          message={t('message.selectMember')}
        />
      );
    }

    if (!selectedInbox || selectedInbox.messages.length === 0) {
      return (
        <EmptyState
          icon={<Bell className="w-7 h-7 opacity-40" />}
          message={t('message.noMessages')}
        />
      );
    }

    if (filteredMessages.length === 0) {
      return (
        <EmptyState
          icon={<Search className="w-7 h-7 opacity-40" />}
          message={t('message.noMatchFilters')}
          action={
            <button
              onClick={clearFilters}
              className="mt-2 text-xs"
              style={{ color: 'var(--accent-blue)' }}
            >
              {t('message.clearFilters')}
            </button>
          }
        />
      );
    }

    const memberColor = getMemberColor(selectedInbox.memberName);

    return (
      <div className="p-3 flex flex-col h-full">
        <div
          className="flex items-center justify-between pb-3 border-b mb-3"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border"
              style={{
                backgroundColor: `${memberColor}30`,
                borderColor: 'var(--border-primary)',
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: memberColor }}
              >
                {selectedInbox.memberName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-secondary)' }}>
                {selectedInbox.memberName}
              </h3>
              <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <span>{t('message.messagesCount', { count: filteredMessages.length })}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto" ref={scrollContainerRef}>
          {filteredMessages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              searchQuery={searchQuery}
              memberColor={memberColor}
              isLatest={index === filteredMessages.length - 1}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('message.title')}</span>
            {totalUnread > 0 && (
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-full border"
                style={{
                  backgroundColor: 'var(--accent-blue-subtle)',
                  color: 'var(--accent-blue)',
                  borderColor: 'var(--accent-blue-medium)',
                }}
              >
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* Search bar + filter button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 border"
            style={{
              backgroundColor: showFilters || typeFilter !== 'all' ? 'var(--accent-blue-subtle)' : 'transparent',
              color: showFilters || typeFilter !== 'all' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderColor: showFilters || typeFilter !== 'all' ? 'var(--accent-blue-medium)' : 'var(--border-primary)',
            }}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{t('message.filter')}</span>
            {typeFilter !== 'all' && (
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]"
                style={{ backgroundColor: 'var(--accent-blue-medium)' }}
              >
                1
              </span>
            )}
          </button>

          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg border shrink-0"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('message.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 pr-8 py-2 rounded-lg text-sm transition-colors focus:outline-none border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs transition-colors border shrink-0"
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border-primary)',
              }}
              title={t('message.clearFilters')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {hasActiveFilters && selectedInbox && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('message.showingCount', { filtered: filteredMessages.length, total: selectedInbox.messages.length })}
          </div>
        )}

        {showFilters && (
          <div
            className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            {messageTypeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTypeFilter(filter.value)}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all border"
                style={{
                  backgroundColor: typeFilter === filter.value ? 'var(--accent-blue-subtle)' : 'transparent',
                  color: typeFilter === filter.value ? 'var(--accent-blue)' : 'var(--text-muted)',
                  borderColor: typeFilter === filter.value ? 'var(--accent-blue-strong)' : 'transparent',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default MessagePanel;
