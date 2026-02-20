import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ChatMessage } from '../../../types';
import { MessageItem } from './MessageItem';
import { useTranslation } from '../../../hooks/useTranslation';

interface ConversationViewProps {
  messages: ChatMessage[];
  bookmarks: string[];
  collapsedMessages: Set<string>;
  searchQuery: string;
  isUpdating?: boolean;
  onToggleBookmark: (messageId: string) => void;
  onToggleCollapse: (messageId: string) => void;
}

// Filter out system messages that contain IDE metadata
const SYSTEM_MESSAGE_PATTERNS = [
  /<ide_opened_file>/i,
  /<system-reminder>/i,
  /<tool>/i,
  /<\/tool>/i,
];

function isSystemMessage(message: ChatMessage): boolean {
  // Check if content contains system message patterns
  return SYSTEM_MESSAGE_PATTERNS.some(pattern => pattern.test(message.content));
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  bookmarks,
  collapsedMessages,
  searchQuery,
  isUpdating,
  onToggleBookmark,
  onToggleCollapse,
}) => {
  const { t } = useTranslation();

  // Filter out system messages
  const filteredMessages = messages.filter(msg => !isSystemMessage(msg));

  return (
    <>
      <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-[var(--bg-secondary)]/60 bg-[var(--bg-primary)]/30 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {t('session.conversation')} ({filteredMessages.length} {t('session.messages').toLowerCase()})
        </span>
      {isUpdating && (
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-purple)' }}>
          <Sparkles className="w-3 h-3 animate-pulse" />
          {t('session.receivingUpdates')}
        </span>
      )}
    </div>
    <div className="p-2 md:p-4">
      {filteredMessages.map((message, index) => (
        <MessageItem
          key={message.uuid}
          message={message}
          index={index}
          isLatest={index === filteredMessages.length - 1 && isUpdating}
          isStreaming={index === filteredMessages.length - 1 && isUpdating && message.role === 'assistant'}
          searchQuery={searchQuery}
          isBookmarked={bookmarks.includes(message.uuid)}
          onToggleBookmark={onToggleBookmark}
          isCollapsed={collapsedMessages.has(message.uuid)}
          onToggleCollapse={onToggleCollapse}
        />
      ))}
    </div>
  </>
  );
};
