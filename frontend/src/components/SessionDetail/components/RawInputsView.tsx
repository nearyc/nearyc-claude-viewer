import React from 'react';
import { Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '../../../utils/time';
import type { SessionInput } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';

interface RawInputsViewProps {
  inputs: SessionInput[];
  showInputs: boolean;
  onToggleShowInputs: () => void;
  title?: string;
  description?: string;
}

export const RawInputsView: React.FC<RawInputsViewProps> = ({
  inputs,
  showInputs,
  onToggleShowInputs,
  title = 'Inputs',
  description,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Toggle to show raw inputs */}
      <div className="px-4 py-3 border-t border-[var(--bg-secondary)]/60 bg-[var(--bg-primary)]/30">
        <button
          onClick={onToggleShowInputs}
          className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {showInputs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>
            {showInputs ? t('common.hide') : t('common.show')} {title.toLowerCase()} ({inputs.length})
          </span>
        </button>
      </div>

      {/* Raw Inputs */}
      {showInputs && (
        <div className="border-t border-[var(--bg-secondary)]/60">
          {inputs.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <p className="text-sm">{t('session.noInputs')}</p>
            </div>
          ) : (
            inputs.map((input, index) => (
              <div key={index} className="border-b border-[var(--bg-secondary)]/60 last:border-b-0">
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                    <span className="text-xs font-medium text-[var(--text-muted)]">#{inputs.length - index}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)]">{formatRelativeTime(input.timestamp)}</span>
                    </div>
                    <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">
                      {input.display || t('session.empty')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
};
