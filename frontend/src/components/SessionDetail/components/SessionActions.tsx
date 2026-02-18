import React, { useState } from 'react';
import { Star, Check, X, Edit3 } from 'lucide-react';
import { TagSelector } from '../../TagSelector';

interface SessionActionsProps {
  sessionId: string;
  customName: string | null;
  hasCustomName: boolean;
  tags: string[];
  availableTags: string[];
  onSetName: (sessionId: string, name: string) => void;
  onAddTag: (sessionId: string, tag: string) => void;
  onRemoveTag: (sessionId: string, tag: string) => void;
}

export const SessionActions: React.FC<SessionActionsProps> = ({
  sessionId,
  customName,
  hasCustomName,
  tags,
  availableTags,
  onSetName,
  onAddTag,
  onRemoveTag,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');

  const handleStartEdit = () => {
    setCustomNameInput(customName || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    onSetName(sessionId, customNameInput);
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="space-y-3">
      {/* Custom Name Display/Edit */}
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={customNameInput}
              onChange={(e) => setCustomNameInput(e.target.value)}
              placeholder="输入自定义名称..."
              className="px-2 py-1 text-sm rounded bg-gray-800 border border-gray-600 text-gray-200 focus:outline-none focus:border-yellow-500 w-40"
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleSaveName}
              className="p-1 text-green-400 hover:text-green-300"
              title="保存"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-gray-400 hover:text-gray-300"
              title="取消"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all ${
              hasCustomName
                ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
            title={hasCustomName ? '编辑自定义名称' : '添加自定义名称'}
          >
            {hasCustomName ? (
              <>
                <Star className="w-3.5 h-3.5" fill="currentColor" />
                <span className="max-w-[120px] truncate">{customName}</span>
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

      {/* Tags */}
      <div className="pt-2 border-t border-gray-800/40">
        <div className="text-xs text-gray-500 mb-2">标签</div>
        <TagSelector
          tags={tags}
          availableTags={availableTags}
          onAddTag={(tag) => onAddTag(sessionId, tag)}
          onRemoveTag={(tag) => onRemoveTag(sessionId, tag)}
          placeholder="添加标签..."
        />
      </div>
    </div>
  );
};
