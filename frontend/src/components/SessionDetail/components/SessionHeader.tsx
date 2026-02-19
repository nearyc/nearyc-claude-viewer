import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

interface SessionHeaderProps {
  isUpdating?: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({ isUpdating }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-[var(--text-primary)] mb-4">
      <MessageSquare className="w-5 h-5 text-[var(--text-secondary)]" />
      <span className="font-semibold text-[var(--text-primary)]">{t('session.sessionDetails')}</span>
      {isUpdating && (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border" style={{
          backgroundColor: 'var(--accent-purple-subtle)',
          color: 'var(--accent-purple)',
          borderColor: 'var(--accent-purple-medium)',
        }}>
          <Sparkles className="w-3 h-3 animate-pulse" />
          {t('session.updating')}
        </span>
      )}
    </div>
  );
};
