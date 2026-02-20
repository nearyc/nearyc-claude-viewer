import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

interface SessionHeaderProps {
  isUpdating?: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({ isUpdating }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-[var(--text-primary)] mb-0 md:mb-4 min-h-[44px] md:min-h-0">
      <MessageSquare className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
      <span className="font-semibold text-[var(--text-primary)] truncate">{t('session.sessionDetails')}</span>
      {isUpdating && (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border flex-shrink-0" style={{
          backgroundColor: 'var(--accent-purple-subtle)',
          color: 'var(--accent-purple)',
          borderColor: 'var(--accent-purple-medium)',
        }}>
          <Sparkles className="w-3 h-3 animate-pulse" />
          <span className="hidden sm:inline">{t('session.updating')}</span>
        </span>
      )}
    </div>
  );
};
