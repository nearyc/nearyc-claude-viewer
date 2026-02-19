import React, { useState } from 'react';
import { Check, X, Edit3 } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

interface SessionActionsProps {
  sessionId: string;
  customName: string | null;
  hasCustomName: boolean;
  onSetName: (sessionId: string, name: string) => void;
}

export const SessionActions: React.FC<SessionActionsProps> = ({
  sessionId,
  customName,
  hasCustomName,
  onSetName,
}) => {
  const { t } = useTranslation();
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
    <div className="flex items-center">
      {isEditingName ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={customNameInput}
            onChange={(e) => setCustomNameInput(e.target.value)}
            placeholder={t('session.customName.placeholder')}
            className="px-3 py-1.5 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-amber)] w-48"
            autoFocus
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSaveName}
            className="p-1.5 text-[var(--accent-green)] hover:text-green-300"
            title={t('common.save')}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title={t('common.cancel')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleStartEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/60 border border-transparent"
          title={hasCustomName ? t('session.customName.edit') : t('session.customName.add')}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{hasCustomName ? t('session.customName.edit') : t('session.customName.add')}</span>
        </button>
      )}
    </div>
  );
};
