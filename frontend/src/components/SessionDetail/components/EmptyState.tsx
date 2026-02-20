import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

export const EmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col h-full items-center justify-center"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <MessageSquare className="w-7 h-7 opacity-40" />
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {t('session.selectSession')}
      </p>
    </div>
  );
};
