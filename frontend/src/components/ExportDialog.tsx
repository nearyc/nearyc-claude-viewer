import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText, FileJson, FileCode } from 'lucide-react';
import type { Session } from '../types';
import {
  exportSession,
  downloadFile,
  copyToClipboard,
  type ExportFormat,
} from '../utils/exportUtils';

interface ExportDialogProps {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
}

interface FormatOption {
  value: ExportFormat;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'markdown',
    label: 'Markdown',
    icon: <FileText className="w-5 h-5" />,
    description: '格式化为可读的 Markdown 文档',
  },
  {
    value: 'json',
    label: 'JSON',
    icon: <FileJson className="w-5 h-5" />,
    description: '导出完整的数据结构',
  },
  {
    value: 'html',
    label: 'HTML',
    icon: <FileCode className="w-5 h-5" />,
    description: '带样式的网页格式',
  },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  session,
  isOpen,
  onClose,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
      alert('导出失败，请重试');
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
    return content.slice(0, maxLength) + '\n\n... (预览已截断)';
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
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              导出会话
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
              选择格式
            </label>
            <div className="grid grid-cols-3 gap-3">
              {FORMAT_OPTIONS.map((option) => (
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
                  <span className="text-sm font-medium">{option.label}</span>
                  <span
                    className="text-xs text-center"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {option.description}
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
              导出选项
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600"
                  style={{
                    accentColor: 'var(--accent-blue)',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  包含会话元数据（ID、项目、统计信息）
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600"
                  style={{
                    accentColor: 'var(--accent-blue)',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  包含时间戳
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
              预览
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
            backgroundColor: 'rgba(30, 41, 59, 0.3)',
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
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制到剪贴板
              </>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-blue)',
              color: 'white',
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
            {isExporting ? '导出中...' : '下载文件'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
