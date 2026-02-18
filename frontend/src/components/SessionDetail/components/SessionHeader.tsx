import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

interface SessionHeaderProps {
  isUpdating?: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({ isUpdating }) => (
  <div className="flex items-center gap-2 text-gray-100 mb-4">
    <MessageSquare className="w-5 h-5 text-gray-400" />
    <span className="font-semibold text-gray-200">Session Details</span>
    {isUpdating && (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-600/30">
        <Sparkles className="w-3 h-3 animate-pulse" />
        Updating...
      </span>
    )}
  </div>
);
