import React from 'react';
import { Trash2, Download, X, CheckSquare, Square } from 'lucide-react';
import type { Session } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface BatchActionBarProps {
  selectedSessions: Session[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  isDeleting?: boolean;
  isExporting?: boolean;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedSessions,
  onClearSelection,
  onSelectAll,
  onDeleteSelected,
  onExportSelected,
  isDeleting = false,
  isExporting = false,
}) => {
  const { t } = useTranslation();
  const selectedCount = selectedSessions.length;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-4"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {t('status.selected', { count: selectedCount })}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--border-primary)' }} />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSelectAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
          }}
        >
          <Square className="w-3.5 h-3.5" />
          <span>{t('common.selectAll')}</span>
        </button>

        <button
          onClick={onExportSelected}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!isExporting) {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
          }}
        >
          <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-pulse' : ''}`} />
          <span>{isExporting ? t('common.exporting') : t('common.export')}</span>
        </button>

        <button
          onClick={onDeleteSelected}
          disabled={isDeleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--accent-red)',
          }}
          onMouseEnter={(e) => {
            if (!isDeleting) {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-pulse' : ''}`} />
          <span>{isDeleting ? t('common.deleting') : t('common.delete')}</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--border-primary)' }} />

      {/* Clear button */}
      <button
        onClick={onClearSelection}
        className="p-1.5 rounded-md transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
        title={t('common.clearSelection')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default BatchActionBar;
