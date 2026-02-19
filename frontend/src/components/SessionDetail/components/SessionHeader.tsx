import React from 'react';
import { MessageSquare, Sparkles, Star } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { TagSelector } from '../../TagSelector';

interface SessionHeaderProps {
  isUpdating?: boolean;
  isStarred?: boolean;
  customName?: string | null;
  tags?: string[];
  availableTags?: string[];
  onToggleStar?: () => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  isUpdating,
  isStarred = false,
  customName,
  tags = [],
  availableTags = [],
  onToggleStar,
  onAddTag,
  onRemoveTag,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {/* Title row */}
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <MessageSquare className="w-5 h-5 text-[var(--text-secondary)]" />
        <span className="font-semibold text-[var(--text-primary)]">{t('session.sessionDetails')}</span>
        {isUpdating && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-600/30">
            <Sparkles className="w-3 h-3 animate-pulse" />
            {t('session.updating')}
          </span>
        )}
      </div>

      {/* Favorite and Tags row - side by side */}
      <div className="flex items-start gap-3">
        {/* Favorite button */}
        <button
          onClick={onToggleStar}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
            isStarred
              ? 'text-[var(--accent-amber)] bg-amber-500/10 border border-amber-500/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/60 border border-transparent'
          }`}
          title={isStarred ? t('session.customName.edit') : t('session.customName.star')}
        >
          <Star className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} />
          <span className="max-w-[120px] truncate">{isStarred ? customName || t('session.customName.star') : t('session.customName.star')}</span>
        </button>

        {/* Tags selector */}
        <div className="flex-1 min-w-0">
          <TagSelector
            tags={tags}
            availableTags={availableTags}
            onAddTag={(tag) => onAddTag?.(tag)}
            onRemoveTag={(tag) => onRemoveTag?.(tag)}
            placeholder={t('tag.add')}
            compact
          />
        </div>
      </div>
    </div>
  );
};
