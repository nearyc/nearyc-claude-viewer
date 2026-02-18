import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ChatMessage } from '../../../types';
import { MessageItem } from './MessageItem';

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
  if (message.role !== 'system') return false;
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
  // Filter out system messages
  const filteredMessages = messages.filter(msg => !isSystemMessage(msg));

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-800/60 bg-gray-900/30 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">
          Conversation ({filteredMessages.length} messages)
        </span>
      {isUpdating && (
        <span className="flex items-center gap-1 text-xs text-purple-400">
          <Sparkles className="w-3 h-3 animate-pulse" />
          Receiving updates...
        </span>
      )}
    </div>
    <div className="p-4">
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
