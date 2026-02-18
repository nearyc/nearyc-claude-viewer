import React from 'react';
import { Bookmark } from 'lucide-react';
import type { ChatMessage } from '../../../types';

interface BookmarksListProps {
  bookmarks: string[];
  messages: ChatMessage[];
  onJumpToBookmark: (messageId: string) => void;
}

export const BookmarksList: React.FC<BookmarksListProps> = ({
  bookmarks,
  messages,
  onJumpToBookmark,
}) => {
  if (bookmarks.length === 0) return null;

  return (
    <div className="px-4 py-2 border-b border-gray-800/60 bg-yellow-900/10">
      <div className="flex items-center gap-2 mb-2">
        <Bookmark className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-xs text-yellow-500">Bookmarks</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {bookmarks.map((messageId) => {
          const msg = messages.find((m) => m.uuid === messageId);
          if (!msg) return null;
          const preview = msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : '');
          return (
            <button
              key={messageId}
              onClick={() => onJumpToBookmark(messageId)}
              className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded hover:bg-yellow-500/20 transition-colors"
              title={msg.content}
            >
              {msg.role === 'user' ? 'You: ' : 'Claude: '}
              {preview}
            </button>
          );
        })}
      </div>
    </div>
  );
};
