import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText, FileJson, FileCode } from 'lucide-react';
import type { Session } from '../types';
import {
  exportSession,
  downloadFile,
  copyToClipboard,
  type ExportFormat,
} from '../utils/exportUtils';
import { useTranslation } from '../hooks/useTranslation';

interface ExportDialogProps {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
}

interface FormatOption {
  value: ExportFormat;
  labelKey: string;
  icon: React.ReactNode;
  descriptionKey: string;
}

const getFormatOptions = (t: (key: string) => string): FormatOption[] => [
  {
    value: 'markdown',
    labelKey: t('export.format.markdown'),
    icon: <FileText className="w-5 h-5" />,
    descriptionKey: t('export.format.markdownDesc'),
  },
  {
    value: 'json',
    labelKey: t('export.format.json'),
    icon: <FileJson className="w-5 h-5" />,
    descriptionKey: t('export.format.jsonDesc'),
  },
  {
    value: 'html',
    labelKey: t('export.format.html'),
    icon: <FileCode className="w-5 h-5" />,
    descriptionKey: t('export.format.htmlDesc'),
  },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  session,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const formatOptions = getFormatOptions(t);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);

    try {
      const { content, filename, mimeType } = exportSession(session, {
        format: selectedFormat,
        includeMetadata,
        includeTimestamps,
      });

      downloadFile(content, filename, mimeType);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('session.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    const { content } = exportSession(session, {
      format: selectedFormat,
      includeMetadata,
      includeTimestamps,
    });

    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const previewContent = () => {
    const { content } = exportSession(session, {
      format: selectedFormat,
      includeMetadata,
      includeTimestamps,
    });

    // Truncate for preview
    const maxLength = 500;
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '\n\n... (' + t('export.previewTruncated') + ')';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-lg shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('export.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'var(--text-secondary)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--text-muted)')
            }
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Format Selection */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('export.selectFormat')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFormat(option.value)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border transition-all"
                  style={{
                    backgroundColor:
                      selectedFormat === option.value
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'var(--bg-tertiary)',
                    borderColor:
                      selectedFormat === option.value
                        ? 'var(--accent-blue)'
                        : 'var(--border-primary)',
                    color:
                      selectedFormat === option.value
                        ? 'var(--accent-blue)'
                        : 'var(--text-muted)',
                  }}
                >
                  {option.icon}
                  <span className="text-sm font-medium">{option.labelKey}</span>
                  <span
                    className="text-xs text-center"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {option.descriptionKey}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('export.options')}
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{
                    accentColor: 'var(--accent-blue)',
                    borderColor: 'var(--border-primary)',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {t('export.includeMetadata')}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{
                    accentColor: 'var(--accent-blue)',
                    borderColor: 'var(--border-primary)',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {t('export.includeTimestamps')}
                </span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('export.preview')}
            </label>
            <pre
              className="p-4 rounded-lg text-xs overflow-auto max-h-40"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
              }}
            >
              {previewContent()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4 border-t"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                {t('common.copied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t('export.copyToClipboard')}
              </>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-blue)',
              color: 'var(--text-on-accent)',
            }}
            onMouseEnter={(e) => {
              if (!isExporting) {
                e.currentTarget.style.backgroundColor = 'var(--accent-blue-light)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-blue)';
            }}
          >
            <Download className="w-4 h-4" />
            {isExporting ? t('common.exporting') : t('export.downloadFile')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
