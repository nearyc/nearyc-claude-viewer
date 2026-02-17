import type { Session, ChatMessage } from '../types';

export type ExportFormat = 'markdown' | 'json' | 'html';

interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
}

/**
 * Format timestamp to readable date string
 */
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Format message content for display
 */
const formatMessageContent = (content: string): string => {
  // Handle code blocks
  return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `\n\`\`\`${lang || ''}\n${code}\`\`\`\n`;
  });
};

/**
 * Export session to Markdown format
 */
const exportToMarkdown = (
  session: Session,
  options: ExportOptions
): string => {
  const { includeMetadata = true, includeTimestamps = true } = options;
  const lines: string[] = [];

  // Title
  const title = session.inputs.length > 0
    ? session.inputs[0].display.slice(0, 100)
    : 'Empty Session';
  lines.push(`# ${title}`);
  lines.push('');

  // Metadata
  if (includeMetadata) {
    lines.push('## 会话信息');
    lines.push('');
    lines.push(`- **会话 ID**: ${session.sessionId}`);
    lines.push(`- **项目**: ${session.project}`);
    lines.push(`- **消息数**: ${session.messageCount}`);
    lines.push(`- **输入数**: ${session.inputCount}`);
    if (includeTimestamps) {
      lines.push(`- **创建时间**: ${formatDate(session.createdAt)}`);
      lines.push(`- **更新时间**: ${formatDate(session.updatedAt)}`);
    }
    lines.push('');
  }

  // Messages
  if (session.messages.length > 0) {
    lines.push('## 对话内容');
    lines.push('');

    const sortedMessages = [...session.messages].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    sortedMessages.forEach((message, index) => {
      const role = message.role === 'user' ? '**用户**' : '**Claude**';
      lines.push(`### ${index + 1}. ${role}`);
      if (includeTimestamps) {
        lines.push(`*${formatDate(message.timestamp)}*`);
      }
      lines.push('');
      lines.push(formatMessageContent(message.content));
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  }

  // Inputs (if no full conversation)
  if (session.messages.length === 0 && session.inputs.length > 0) {
    lines.push('## 用户输入');
    lines.push('');

    const sortedInputs = [...session.inputs].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    sortedInputs.forEach((input, index) => {
      lines.push(`### 输入 ${index + 1}`);
      if (includeTimestamps) {
        lines.push(`*${formatDate(input.timestamp)}*`);
      }
      lines.push('');
      lines.push(input.display || '(空)');
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  }

  return lines.join('\n');
};

/**
 * Export session to JSON format
 */
const exportToJson = (
  session: Session,
  options: ExportOptions
): string => {
  const { includeMetadata = true } = options;

  if (!includeMetadata) {
    // Export only messages
    const sortedMessages = [...session.messages].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    return JSON.stringify(
      sortedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      null,
      2
    );
  }

  // Export full session data
  const exportData = {
    session: {
      id: session.id,
      sessionId: session.sessionId,
      project: session.project,
      projectSlug: session.projectSlug,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      inputCount: session.inputCount,
      messageCount: session.messageCount,
    },
    inputs: session.inputs,
    messages: [...session.messages].sort((a, b) => a.timestamp - b.timestamp),
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Export session to HTML format
 */
const exportToHtml = (
  session: Session,
  options: ExportOptions
): string => {
  const { includeMetadata = true, includeTimestamps = true } = options;

  const title = session.inputs.length > 0
    ? session.inputs[0].display.slice(0, 100)
    : 'Empty Session';

  const sortedMessages = [...session.messages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const renderMessage = (message: ChatMessage, index: number): string => {
    const isUser = message.role === 'user';
    const avatar = isUser ? 'U' : 'C';
    const bgColor = isUser ? '#1e40af' : '#7c3aed';
    const roleName = isUser ? '用户' : 'Claude';

    return `
      <div class="message" style="margin-bottom: 20px; display: flex; gap: 12px; ${isUser ? 'flex-direction: row-reverse;' : ''}">
        <div class="avatar" style="width: 36px; height: 36px; border-radius: 50%; background: ${bgColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0;">
          ${avatar}
        </div>
        <div class="content" style="flex: 1; max-width: calc(100% - 60px);">
          <div class="header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; ${isUser ? 'justify-content: flex-end;' : ''}">
            <span class="role" style="font-weight: 600; color: ${bgColor};">${roleName}</span>
            ${includeTimestamps ? `<span class="time" style="font-size: 12px; color: #6b7280;">${formatDate(message.timestamp)}</span>` : ''}
          </div>
          <div class="text" style="background: ${isUser ? '#1e3a5f' : '#1f2937'}; padding: 12px 16px; border-radius: 12px; color: #e5e7eb; white-space: pre-wrap; word-break: break-word; border: 1px solid ${isUser ? '#3b82f6' : '#4b5563'};">
            ${escapeHtml(message.content).replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>
    `;
  };

  const messagesHtml = sortedMessages.length > 0
    ? sortedMessages.map((m, i) => renderMessage(m, i)).join('')
    : '<p style="color: #6b7280; text-align: center;">无对话内容</p>';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0f172a;
      color: #e5e7eb;
      line-height: 1.6;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      border-bottom: 1px solid #374151;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #f3f4f6;
      margin-bottom: 16px;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      font-size: 14px;
    }
    .meta-item {
      display: flex;
      gap: 8px;
    }
    .meta-label {
      color: #9ca3af;
    }
    .meta-value {
      color: #e5e7eb;
    }
    .messages {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #374151;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${escapeHtml(title)}</h1>
      ${includeMetadata ? `
      <div class="meta">
        <div class="meta-item">
          <span class="meta-label">会话 ID:</span>
          <span class="meta-value">${session.sessionId}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">项目:</span>
          <span class="meta-value">${escapeHtml(session.project)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">消息数:</span>
          <span class="meta-value">${session.messageCount}</span>
        </div>
        ${includeTimestamps ? `
        <div class="meta-item">
          <span class="meta-label">创建时间:</span>
          <span class="meta-value">${formatDate(session.createdAt)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">更新时间:</span>
          <span class="meta-value">${formatDate(session.updatedAt)}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>
    <div class="messages">
      ${messagesHtml}
    </div>
    <div class="footer">
      导出自 Claude Viewer
    </div>
  </div>
</body>
</html>`;
};

/**
 * Export session data to specified format
 */
export const exportSession = (
  session: Session,
  options: ExportOptions
): { content: string; filename: string; mimeType: string } => {
  const { format } = options;

  const title = session.inputs.length > 0
    ? session.inputs[0].display.slice(0, 30).replace(/[^\w\s-]/g, '').trim()
    : 'session';

  const timestamp = new Date().toISOString().slice(0, 10);

  let content: string;
  let extension: string;
  let mimeType: string;

  switch (format) {
    case 'markdown':
      content = exportToMarkdown(session, options);
      extension = 'md';
      mimeType = 'text/markdown';
      break;
    case 'json':
      content = exportToJson(session, options);
      extension = 'json';
      mimeType = 'application/json';
      break;
    case 'html':
      content = exportToHtml(session, options);
      extension = 'html';
      mimeType = 'text/html';
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  return {
    content,
    filename: `${title}-${timestamp}.${extension}`,
    mimeType,
  };
};

/**
 * Download content as file
 */
export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Copy content to clipboard
 */
export const copyToClipboard = async (content: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};
