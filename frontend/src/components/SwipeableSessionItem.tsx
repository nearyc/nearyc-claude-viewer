import React, { useMemo } from 'react';
import { FolderOpen, Star, Trash2, Tag, CheckSquare, Square } from 'lucide-react';
import { useMobile } from '../contexts/MobileContext';
import { formatRelativeTime } from '../utils/time';
import type { Session } from '../types';
import { useTimeRefresh, isSessionActive } from '../hooks/useTimeRefresh';

interface SessionItemProps {
  session: Session;
  isSelected: boolean;
  isBatchSelected: boolean;
  hasCustom: boolean;
  title: string;
  customName: string | undefined;
  onSelect: (session: Session) => void;
  onDelete: (session: Session) => void;
  onToggleFavorite: (sessionId: string) => void;
  onToggleSelection: (sessionId: string) => void;
  getSessionTags: (sessionId: string) => string[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const SwipeableSessionItem: React.FC<SessionItemProps> = React.memo(({
  session,
  isSelected,
  isBatchSelected,
  hasCustom,
  title,
  customName,
  onSelect,
  onDelete,
  onToggleFavorite,
  onToggleSelection,
  getSessionTags,
  t,
}) => {
  const { isMobile } = useMobile();

  // Time refresh to update relative time display
  useTimeRefresh(10000);

  // Check if session is actively running
  const isActive = useMemo(() => isSessionActive(session), [session.updatedAt]);

  const sessionTags = getSessionTags(session.sessionId);

  return (
    <div
      className={`w-full px-2 py-2 md:py-1.5 text-left rounded-lg transition-all duration-150 border-2 group relative cursor-pointer min-h-[56px] flex items-center gap-2 ${
        isActive ? 'animate-pulse-subtle' : ''
      }`}
      style={{
        backgroundColor: isSelected
          ? 'rgba(59, 130, 246, 0.1)'
          : isBatchSelected
            ? 'rgba(59, 130, 246, 0.05)'
            : hasCustom
              ? 'rgba(234, 179, 8, 0.05)'
              : 'var(--bg-primary)',
        borderColor: isSelected
          ? 'rgba(59, 130, 246, 0.3)'
          : isBatchSelected
            ? 'rgba(59, 130, 246, 0.2)'
            : isActive
              ? 'rgba(34, 197, 94, 0.6)'
              : hasCustom
                ? 'rgba(234, 179, 8, 0.2)'
                : 'var(--border-primary)',
        boxShadow: isActive ? '0 0 8px rgba(34, 197, 94, 0.2)' : 'none',
      }}
    >
      {/* Left: Batch selection checkbox - Always visible */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelection(session.sessionId);
        }}
        className="flex-shrink-0 p-1.5 rounded transition-colors bg-transparent border-0 flex items-center justify-center"
        style={{
          color: isBatchSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label={isBatchSelected ? '取消选择' : '选择'}
        type="button"
      >
        {isBatchSelected ? (
          <CheckSquare className="w-5 h-5 pointer-events-none" fill="currentColor" />
        ) : (
          <Square className="w-5 h-5 pointer-events-none" />
        )}
      </button>

      {/* Center: Content - Click to select session */}
      <div
        className="flex-1 min-w-0"
        onClick={() => onSelect(session)}
      >
        <div className="flex items-center gap-2 mb-0.5">
          {hasCustom && (
            <Star
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: 'rgb(234, 179, 8)' }}
              fill="currentColor"
            />
          )}
          <div
            className="font-medium text-sm truncate"
            style={{
              color: isSelected
                ? 'var(--accent-blue-light)'
                : hasCustom
                  ? 'rgb(234, 179, 8)'
                  : 'var(--text-secondary)',
            }}
          >
            {title}
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 text-xs mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <FolderOpen className="w-3 h-3" />
          <span className="truncate">{session.project}</span>
        </div>

        {/* Session Tags - Hidden on mobile */}
        {!isMobile && sessionTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {sessionTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: 'rgb(96, 165, 250)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <Tag className="w-2.5 h-2.5 mr-0.5" />
                {tag}
              </span>
            ))}
            {sessionTags.length > 3 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                }}
              >
                +{sessionTags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-muted)' }}>
            {session.inputCount} {t('session.inputs')}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>
            {formatRelativeTime(session.updatedAt)}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(session.sessionId);
          }}
          className="p-1.5 rounded transition-colors bg-transparent border-0 flex items-center justify-center"
          style={{
            color: hasCustom ? 'rgb(234, 179, 8)' : 'var(--text-muted)',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={hasCustom ? t('session.unfavorite') : t('session.favorite')}
          type="button"
        >
          <Star className="w-4 h-4 pointer-events-none" fill={hasCustom ? 'currentColor' : 'none'} />
        </button>

        {/* Delete button - Always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session);
          }}
          className="p-1.5 rounded transition-colors bg-transparent border-0 flex items-center justify-center"
          style={{
            color: 'var(--text-muted)',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent-red)';
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={t('common.delete')}
          type="button"
        >
          <Trash2 className="w-4 h-4 pointer-events-none" />
        </button>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.session.sessionId === next.session.sessionId &&
    prev.session.updatedAt === next.session.updatedAt &&
    prev.isSelected === next.isSelected &&
    prev.isBatchSelected === next.isBatchSelected &&
    prev.hasCustom === next.hasCustom &&
    prev.title === next.title
  );
});

export default SwipeableSessionItem;
