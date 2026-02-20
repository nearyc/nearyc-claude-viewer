import React from 'react';
import { Trash2, Download, X, CheckSquare, Square } from 'lucide-react';
import type { Session } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useMobile } from '../contexts/MobileContext';

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
  const { isMobile } = useMobile();
  const selectedCount = selectedSessions.length;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-40 flex items-center gap-4 ${
        isMobile
          ? 'bottom-0 left-0 right-0 px-4 py-4 safe-area-bottom rounded-t-lg border-t'
          : 'bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg border shadow-lg'
      }`}
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
          className={`flex items-center justify-center rounded-md transition-colors ${
            isMobile ? 'w-10 h-10 p-0' : 'gap-1.5 px-3 py-1.5 text-sm'
          }`}
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
          title={t('common.selectAll')}
        >
          <Square className={isMobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
          {!isMobile && <span>{t('common.selectAll')}</span>}
        </button>

        <button
          onClick={onExportSelected}
          disabled={isExporting}
          className={`flex items-center justify-center rounded-md transition-colors disabled:opacity-50 ${
            isMobile ? 'w-10 h-10 p-0' : 'gap-1.5 px-3 py-1.5 text-sm'
          }`}
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
          title={isExporting ? t('common.exporting') : t('common.export')}
        >
          <Download className={`${isMobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${isExporting ? 'animate-pulse' : ''}`} />
          {!isMobile && <span>{isExporting ? t('common.exporting') : t('common.export')}</span>}
        </button>

        <button
          onClick={onDeleteSelected}
          disabled={isDeleting}
          className={`flex items-center justify-center rounded-md transition-colors disabled:opacity-50 ${
            isMobile ? 'w-10 h-10 p-0' : 'gap-1.5 px-3 py-1.5 text-sm'
          }`}
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
          title={isDeleting ? t('common.deleting') : t('common.delete')}
        >
          <Trash2 className={`${isMobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${isDeleting ? 'animate-pulse' : ''}`} />
          {!isMobile && <span>{isDeleting ? t('common.deleting') : t('common.delete')}</span>}
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--border-primary)' }} />

      {/* Clear button */}
      <button
        onClick={onClearSelection}
        className={`rounded-md transition-colors ${
          isMobile ? 'p-2.5' : 'p-1.5'
        }`}
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
        <X className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
      </button>
    </div>
  );
};

export default BatchActionBar;
