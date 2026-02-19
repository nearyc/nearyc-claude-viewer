import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Hash, Copy, Check, Terminal, Download, ExternalLink } from 'lucide-react';
import { formatRelativeTime } from '../../../utils/time';
import { useTranslation } from '../../../hooks/useTranslation';

interface SessionMetaProps {
  sessionId: string;
  project: string;
  updatedAt: number;
  inputCount: number;
  messageCount: number;
  hasFullConversation: boolean;
  onExport: () => void;
}

const PLUGIN_GITHUB_URL = 'https://github.com/nearyc/vscode-claude-code-launcher';

export const SessionMeta: React.FC<SessionMetaProps> = ({
  sessionId,
  project,
  updatedAt,
  inputCount,
  messageCount,
  hasFullConversation,
  onExport,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showPluginPrompt, setShowPluginPrompt] = useState(false);
  const vscodeCheckRef = useRef<number | null>(null);

  const handleCopySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInClaudeCode = () => {
    const command = `start powershell -Command "cd '${project}'; claude --dangerously-skip-permissions --resume '${sessionId}'"`;
    fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    }).catch(console.error);
  };

  const handleOpenInVSCode = () => {
    const encodedPath = encodeURIComponent(project);
    const encodedSession = encodeURIComponent(sessionId);
    const vscodeUri = `vscode://your-name.claude-code-launcher/open?path=${encodedPath}&session=${encodedSession}`;

    // Try to open VSCode
    window.location.href = vscodeUri;

    // Check if VSCode opened after a short delay
    // If the page is still visible, likely the plugin is not installed
    vscodeCheckRef.current = window.setTimeout(() => {
      setShowPluginPrompt(true);
    }, 500);
  };

  const handleClosePrompt = () => {
    setShowPluginPrompt(false);
    if (vscodeCheckRef.current) {
      clearTimeout(vscodeCheckRef.current);
      vscodeCheckRef.current = null;
    }
  };

  const handleOpenGitHub = () => {
    window.open(PLUGIN_GITHUB_URL, '_blank');
    handleClosePrompt();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (vscodeCheckRef.current) {
        clearTimeout(vscodeCheckRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Project Path */}
      <div className="flex items-start gap-2">
        <FolderOpen className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--text-muted)] mb-0.5">{t('common.project')}</div>
          <div className="text-sm text-[var(--text-primary)] truncate">{project}</div>
        </div>
        <button
          onClick={handleOpenInClaudeCode}
          title={t('session.openInClaude')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/60 border border-[var(--bg-tertiary)]/50 hover:border-[var(--text-muted)]/50"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{t('session.openInClaude')}</span>
        </button>
        <button
          onClick={handleOpenInVSCode}
          title={t('session.openInVSCode')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all text-[var(--accent-blue)] hover:text-blue-300 hover:bg-blue-600/20 border border-blue-600/30 hover:border-blue-500/50"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.583.063a1.5 1.5 0 0 1 1.342.894l.062.158 3.5 11.5a1.5 1.5 0 0 1-.947 1.89l-.159.048-8.527 1.707a.5.5 0 0 0-.369.369l-1.707 8.527a1.5 1.5 0 0 1-2.89.051l-.048-.159-3.5-11.5a1.5 1.5 0 0 1 .947-1.89l.159-.048 8.527-1.707a.5.5 0 0 0 .369-.369l1.707-8.527A1.5 1.5 0 0 1 17.583.063zM6.354 6.354l-3.182 3.182 2.828 2.828 3.182-3.182-2.828-2.828zm9.9 9.9l-3.182 3.182 2.828 2.828 3.182-3.182-2.828-2.828z"/>
          </svg>
          <span>{t('session.openInVSCode')}</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onExport}
          title={t('common.export')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all text-[var(--accent-green)] hover:text-green-300 hover:bg-green-600/20 border border-green-600/30 hover:border-green-500/50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('common.export')}</span>
        </button>
      </div>

      {/* Session ID */}
      <div className="flex items-start gap-2">
        <Hash className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--text-muted)] mb-0.5">Session ID</div>
          <div className="text-sm text-[var(--text-secondary)] font-mono truncate">{sessionId}</div>
        </div>
        <button
          onClick={handleCopySessionId}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all ${
            copied
              ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-green-600/30'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/60'
          }`}
          title={copied ? t('common.copied') : t('session.copySessionId')}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>{t('common.copied')}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{t('common.copy')}</span>
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 pt-2 border-t border-[var(--bg-secondary)]/40">
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-0.5">{t('session.messages')}</div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">
            {hasFullConversation ? messageCount : inputCount}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-0.5">{t('table.lastActive')}</div>
          <span className="text-sm text-[var(--text-primary)]">{formatRelativeTime(updatedAt)}</span>
        </div>
      </div>

      {/* Plugin Install Prompt Modal */}
      {showPluginPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleClosePrompt}
        >
          <div
            className="max-w-sm w-full rounded-lg p-6 shadow-xl"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-semibold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('session.vscodePluginRequired') || 'VSCode 插件未安装'}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {t('session.vscodePluginPrompt') ||
                '未检测到 VSCode Claude Code Launcher 插件。请安装插件后重试，或访问 GitHub 了解更多信息。'}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleClosePrompt}
                className="px-4 py-2 text-sm rounded-md transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('common.cancel') || '取消'}
              </button>
              <button
                onClick={handleOpenGitHub}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors"
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: '#fff',
                }}
              >
                <ExternalLink className="w-4 h-4" />
                {t('session.openGitHub') || '查看 GitHub'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
