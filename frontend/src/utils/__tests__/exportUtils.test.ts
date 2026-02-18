import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportSession,
  downloadFile,
  copyToClipboard,
  type ExportFormat,
} from '../exportUtils';
import type { Session, ChatMessage } from '../../types';

describe('exportUtils', () => {
  // Mock session data for testing
  const createMockSession = (overrides?: Partial<Session>): Session => ({
    id: 'test-id-123',
    sessionId: 'session-456',
    project: 'Test Project',
    projectSlug: 'test-project',
    inputs: [
      { display: 'First user input', timestamp: 1704067200000 },
      { display: 'Second user input', timestamp: 1704067300000 },
    ],
    messages: [
      {
        uuid: 'msg-1',
        role: 'user',
        content: 'Hello, Claude!',
        timestamp: 1704067200000,
      },
      {
        uuid: 'msg-2',
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        timestamp: 1704067250000,
      },
    ],
    createdAt: 1704067200000,
    updatedAt: 1704067300000,
    inputCount: 2,
    messageCount: 2,
    ...overrides,
  });

  describe('exportSession', () => {
    it('should export to markdown format with metadata and timestamps', () => {
      const session = createMockSession();
      const result = exportSession(session, { format: 'markdown' });

      expect(result.mimeType).toBe('text/markdown');
      expect(result.filename).toMatch(/\.md$/);
      expect(result.content).toContain('# First user input');
      expect(result.content).toContain('## 会话信息');
      expect(result.content).toContain('**会话 ID**: session-456');
      expect(result.content).toContain('**项目**: Test Project');
      expect(result.content).toContain('## 对话内容');
      expect(result.content).toContain('**用户**');
      expect(result.content).toContain('**Claude**');
      expect(result.content).toContain('Hello, Claude!');
      expect(result.content).toContain('Hello! How can I help you today?');
    });

    it('should export to markdown without metadata when includeMetadata is false', () => {
      const session = createMockSession();
      const result = exportSession(session, {
        format: 'markdown',
        includeMetadata: false,
      });

      expect(result.content).not.toContain('## 会话信息');
      expect(result.content).not.toContain('**会话 ID**');
      expect(result.content).toContain('# First user input');
      expect(result.content).toContain('## 对话内容');
    });

    it('should export to markdown without timestamps when includeTimestamps is false', () => {
      const session = createMockSession();
      const result = exportSession(session, {
        format: 'markdown',
        includeTimestamps: false,
      });

      expect(result.content).toContain('## 会话信息');
      expect(result.content).not.toContain('**创建时间**');
      expect(result.content).not.toContain('**更新时间**');
      expect(result.content).not.toMatch(/\*\d{4}\/\d{2}\/\d{2}/);
    });

    it('should use "Empty Session" as title when no inputs exist', () => {
      const session = createMockSession({ inputs: [] });
      const result = exportSession(session, { format: 'markdown' });

      expect(result.content).toContain('# Empty Session');
    });

    it('should truncate title to 100 characters', () => {
      const longInput = 'a'.repeat(150);
      const session = createMockSession({
        inputs: [{ display: longInput, timestamp: 1704067200000 }],
      });
      const result = exportSession(session, { format: 'markdown' });

      expect(result.content).toContain('# ' + 'a'.repeat(100));
      expect(result.content).not.toContain('a'.repeat(101));
    });

    it('should export inputs when no messages exist', () => {
      const session = createMockSession({ messages: [] });
      const result = exportSession(session, { format: 'markdown' });

      expect(result.content).toContain('## 用户输入');
      expect(result.content).toContain('### 输入 1');
      expect(result.content).toContain('First user input');
      expect(result.content).toContain('Second user input');
    });

    it('should handle empty inputs display', () => {
      const session = createMockSession({
        messages: [],
        inputs: [{ display: '', timestamp: 1704067200000 }],
      });
      const result = exportSession(session, { format: 'markdown' });

      expect(result.content).toContain('(空)');
    });

    it('should sort messages by timestamp', () => {
      const session = createMockSession({
        messages: [
          {
            uuid: 'msg-3',
            role: 'assistant',
            content: 'Third message',
            timestamp: 1704067350000,
          },
          {
            uuid: 'msg-1',
            role: 'user',
            content: 'First message',
            timestamp: 1704067200000,
          },
          {
            uuid: 'msg-2',
            role: 'assistant',
            content: 'Second message',
            timestamp: 1704067250000,
          },
        ],
      });
      const result = exportSession(session, { format: 'markdown' });

      const firstIndex = result.content.indexOf('First message');
      const secondIndex = result.content.indexOf('Second message');
      const thirdIndex = result.content.indexOf('Third message');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    it('should format code blocks in markdown', () => {
      const session = createMockSession({
        messages: [
          {
            uuid: 'msg-1',
            role: 'assistant',
            content: 'Here is some code:\n```javascript\nconst x = 1;\n```',
            timestamp: 1704067200000,
          },
        ],
      });
      const result = exportSession(session, { format: 'markdown' });

      expect(result.content).toContain('```javascript');
      expect(result.content).toContain('const x = 1;');
    });

    it('should export to JSON format with metadata', () => {
      const session = createMockSession();
      const result = exportSession(session, { format: 'json' });

      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toMatch(/\.json$/);

      const parsed = JSON.parse(result.content);
      expect(parsed.session).toBeDefined();
      expect(parsed.session.id).toBe('test-id-123');
      expect(parsed.session.sessionId).toBe('session-456');
      expect(parsed.inputs).toHaveLength(2);
      expect(parsed.messages).toHaveLength(2);
    });

    it('should export to JSON format without metadata', () => {
      const session = createMockSession();
      const result = exportSession(session, {
        format: 'json',
        includeMetadata: false,
      });

      const parsed = JSON.parse(result.content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty('role');
      expect(parsed[0]).toHaveProperty('content');
      expect(parsed[0]).toHaveProperty('timestamp');
      expect(parsed[0]).not.toHaveProperty('uuid');
    });

    it('should sort messages in JSON export', () => {
      const session = createMockSession({
        messages: [
          {
            uuid: 'msg-2',
            role: 'assistant',
            content: 'Second',
            timestamp: 1704067250000,
          },
          {
            uuid: 'msg-1',
            role: 'user',
            content: 'First',
            timestamp: 1704067200000,
          },
        ],
      });
      const result = exportSession(session, {
        format: 'json',
        includeMetadata: false,
      });

      const parsed = JSON.parse(result.content);
      expect(parsed[0].content).toBe('First');
      expect(parsed[1].content).toBe('Second');
    });

    it('should export to HTML format', () => {
      const session = createMockSession();
      const result = exportSession(session, { format: 'html' });

      expect(result.mimeType).toBe('text/html');
      expect(result.filename).toMatch(/\.html$/);
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('<html lang="zh-CN">');
      expect(result.content).toContain('First user input');
    });

    it('should export to HTML with metadata and timestamps', () => {
      const session = createMockSession();
      const result = exportSession(session, { format: 'html' });

      expect(result.content).toContain('会话 ID:');
      expect(result.content).toContain('session-456');
      expect(result.content).toContain('项目:');
      expect(result.content).toContain('Test Project');
    });

    it('should export to HTML without metadata', () => {
      const session = createMockSession();
      const result = exportSession(session, {
        format: 'html',
        includeMetadata: false,
      });

      expect(result.content).not.toContain('会话 ID:');
      expect(result.content).not.toContain('项目:');
    });

    it('should export to HTML without timestamps', () => {
      const session = createMockSession();
      const result = exportSession(session, {
        format: 'html',
        includeTimestamps: false,
      });

      // Should not contain time elements in message headers
      expect(result.content).not.toMatch(/class="time"/);
    });

    it('should render user and assistant messages differently in HTML', () => {
      const session = createMockSession();
      const result = exportSession(session, { format: 'html' });

      expect(result.content).toContain('用户');
      expect(result.content).toContain('Claude');
      expect(result.content).toContain('U'); // User avatar
      expect(result.content).toContain('C'); // Claude avatar
    });

    it('should escape HTML in message content', () => {
      const session = createMockSession({
        messages: [
          {
            uuid: 'msg-1',
            role: 'user',
            content: '<script>alert("xss")</script>',
            timestamp: 1704067200000,
          },
        ],
      });
      const result = exportSession(session, { format: 'html' });

      expect(result.content).not.toContain('<script>alert("xss")</script>');
      expect(result.content).toContain('&lt;script&gt;');
    });

    it('should show empty message placeholder when no messages in HTML', () => {
      const session = createMockSession({ messages: [] });
      const result = exportSession(session, { format: 'html' });

      expect(result.content).toContain('无对话内容');
    });

    it('should throw error for unsupported format', () => {
      const session = createMockSession();

      expect(() => {
        exportSession(session, { format: 'xml' as ExportFormat });
      }).toThrow('Unsupported export format: xml');
    });

    it('should generate filename with sanitized title', () => {
      const session = createMockSession({
        inputs: [{ display: 'Hello <world>! @#$%', timestamp: 1704067200000 }],
      });
      const result = exportSession(session, { format: 'markdown' });

      expect(result.filename).toMatch(/^Hello world/);
      expect(result.filename).not.toContain('<');
      expect(result.filename).not.toContain('>');
      expect(result.filename).not.toContain('!');
      expect(result.filename).not.toContain('@');
      expect(result.filename).not.toContain('#');
      expect(result.filename).not.toContain('$');
      expect(result.filename).not.toContain('%');
    });

    it('should truncate filename title to 30 characters', () => {
      const longTitle = 'a'.repeat(50);
      const session = createMockSession({
        inputs: [{ display: longTitle, timestamp: 1704067200000 }],
      });
      const result = exportSession(session, { format: 'markdown' });

      const filenameWithoutDate = result.filename.replace(/-\d{4}-\d{2}-\d{2}\.md$/, '');
      expect(filenameWithoutDate.length).toBe(30);
    });

    it('should include date in filename', () => {
      const session = createMockSession();
      const result = exportSession(session, { format: 'markdown' });

      expect(result.filename).toMatch(/-\d{4}-\d{2}-\d{2}\./);
    });

    it('should use "session" as default filename when no inputs', () => {
      const session = createMockSession({ inputs: [] });
      const result = exportSession(session, { format: 'markdown' });

      expect(result.filename).toMatch(/^session-/);
    });
  });

  describe('downloadFile', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn>;
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let clickSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      clickSpy = vi.fn();
      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        click: clickSpy,
      } as unknown as HTMLAnchorElement);
      createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as Node));
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as Node));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create blob with correct content and mime type', () => {
      const blobInstances: Array<{ content: string[]; options: BlobPropertyBag }> = [];
      class MockBlob {
        content: string[];
        options: BlobPropertyBag;
        constructor(content: string[], options: BlobPropertyBag) {
          this.content = content;
          this.options = options;
          blobInstances.push({ content, options });
        }
      }
      global.Blob = MockBlob as unknown as typeof Blob;

      downloadFile('test content', 'test.txt', 'text/plain');

      expect(blobInstances).toHaveLength(1);
      expect(blobInstances[0].content).toEqual(['test content']);
      expect(blobInstances[0].options).toEqual({ type: 'text/plain' });
    });

    it('should create object URL from blob', () => {
      downloadFile('test content', 'test.txt', 'text/plain');

      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should create anchor element with correct attributes', () => {
      downloadFile('test content', 'test.txt', 'text/plain');

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    it('should set href and download attributes on anchor', () => {
      const linkElement = {
        href: '',
        download: '',
        click: clickSpy,
      };
      createElementSpy.mockReturnValue(linkElement as unknown as HTMLAnchorElement);

      downloadFile('test content', 'test.txt', 'text/plain');

      expect(linkElement.href).toBe('blob:test-url');
      expect(linkElement.download).toBe('test.txt');
    });

    it('should append link to body, click it, and remove it', () => {
      downloadFile('test content', 'test.txt', 'text/plain');

      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should revoke object URL after download', () => {
      downloadFile('test content', 'test.txt', 'text/plain');

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');
    });

    it('should handle markdown mime type', () => {
      const blobInstances: Array<{ content: string[]; options: BlobPropertyBag }> = [];
      class MockBlob {
        content: string[];
        options: BlobPropertyBag;
        constructor(content: string[], options: BlobPropertyBag) {
          this.content = content;
          this.options = options;
          blobInstances.push({ content, options });
        }
      }
      global.Blob = MockBlob as unknown as typeof Blob;

      downloadFile('# Markdown', 'test.md', 'text/markdown');

      expect(blobInstances).toHaveLength(1);
      expect(blobInstances[0].content).toEqual(['# Markdown']);
      expect(blobInstances[0].options).toEqual({ type: 'text/markdown' });
    });

    it('should handle JSON mime type', () => {
      const blobInstances: Array<{ content: string[]; options: BlobPropertyBag }> = [];
      class MockBlob {
        content: string[];
        options: BlobPropertyBag;
        constructor(content: string[], options: BlobPropertyBag) {
          this.content = content;
          this.options = options;
          blobInstances.push({ content, options });
        }
      }
      global.Blob = MockBlob as unknown as typeof Blob;

      downloadFile('{"key": "value"}', 'test.json', 'application/json');

      expect(blobInstances).toHaveLength(1);
      expect(blobInstances[0].content).toEqual(['{"key": "value"}']);
      expect(blobInstances[0].options).toEqual({ type: 'application/json' });
    });

    it('should handle HTML mime type', () => {
      const blobInstances: Array<{ content: string[]; options: BlobPropertyBag }> = [];
      class MockBlob {
        content: string[];
        options: BlobPropertyBag;
        constructor(content: string[], options: BlobPropertyBag) {
          this.content = content;
          this.options = options;
          blobInstances.push({ content, options });
        }
      }
      global.Blob = MockBlob as unknown as typeof Blob;

      downloadFile('<html></html>', 'test.html', 'text/html');

      expect(blobInstances).toHaveLength(1);
      expect(blobInstances[0].content).toEqual(['<html></html>']);
      expect(blobInstances[0].options).toEqual({ type: 'text/html' });
    });
  });

  describe('copyToClipboard', () => {
    let clipboardWriteTextSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      clipboardWriteTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteTextSpy,
        },
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should copy content to clipboard successfully', async () => {
      const result = await copyToClipboard('test content');

      expect(clipboardWriteTextSpy).toHaveBeenCalledWith('test content');
      expect(result).toBe(true);
    });

    it('should return true when clipboard write succeeds', async () => {
      const result = await copyToClipboard('content');

      expect(result).toBe(true);
    });

    it('should return false when clipboard write fails', async () => {
      clipboardWriteTextSpy.mockRejectedValue(new Error('Clipboard access denied'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await copyToClipboard('content');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to copy to clipboard:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty string', async () => {
      const result = await copyToClipboard('');

      expect(clipboardWriteTextSpy).toHaveBeenCalledWith('');
      expect(result).toBe(true);
    });

    it('should handle multiline content', async () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';

      const result = await copyToClipboard(multilineContent);

      expect(clipboardWriteTextSpy).toHaveBeenCalledWith(multilineContent);
      expect(result).toBe(true);
    });

    it('should handle special characters', async () => {
      const specialContent = 'Special: <>&"\'\n\t';

      const result = await copyToClipboard(specialContent);

      expect(clipboardWriteTextSpy).toHaveBeenCalledWith(specialContent);
      expect(result).toBe(true);
    });

    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(10000);

      const result = await copyToClipboard(longContent);

      expect(clipboardWriteTextSpy).toHaveBeenCalledWith(longContent);
      expect(result).toBe(true);
    });

    it('should handle unicode content', async () => {
      const unicodeContent = 'Hello 世界 🌍 ñöü';

      const result = await copyToClipboard(unicodeContent);

      expect(clipboardWriteTextSpy).toHaveBeenCalledWith(unicodeContent);
      expect(result).toBe(true);
    });
  });
});
