import React from 'react';
import { Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '../../../utils/time';
import type { SessionInput } from '../../../types';

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
}) => (
  <>
    {/* Toggle to show raw inputs */}
    <div className="px-4 py-3 border-t border-gray-800/60 bg-gray-900/30">
      <button
        onClick={onToggleShowInputs}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
      >
        {showInputs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span>
          {showInputs ? 'Hide' : 'Show'} {title.toLowerCase()} ({inputs.length})
        </span>
      </button>
    </div>

    {/* Raw Inputs */}
    {showInputs && (
      <div className="border-t border-gray-800/60">
        {inputs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No inputs in this session</p>
          </div>
        ) : (
          inputs.map((input, index) => (
            <div key={index} className="border-b border-gray-800/60 last:border-b-0">
              <div className="flex items-start gap-3 p-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-500">#{inputs.length - index}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3 h-3 text-gray-600" />
                    <span className="text-xs text-gray-500">{formatRelativeTime(input.timestamp)}</span>
                  </div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                    {input.display || '(empty)'}
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
