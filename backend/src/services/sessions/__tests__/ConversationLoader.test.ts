import { ConversationLoader } from '../ConversationLoader';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { ConversationMessage, ContentBlock } from '../../../types';

// Mock fs and readline
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('readline');

describe('ConversationLoader', () => {
  let loader: ConversationLoader;
  const mockProjectsDir = '/mock/projects';

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new ConversationLoader({ projectsDir: mockProjectsDir });
  });

  describe('loadFullConversation', () => {
    it('should return empty array if file does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result).toEqual([]);
    });

    it('should load user messages', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const messages: ConversationMessage[] = [
        {
          uuid: 'msg-1',
          parentUuid: null,
          timestamp: '2024-01-01T00:00:00.000Z',
          type: 'user',
          message: {
            role: 'user',
            content: 'Hello',
          },
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const msg of messages) {
            yield JSON.stringify(msg);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result.length).toBe(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Hello');
    });

    it('should load assistant messages', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const messages: ConversationMessage[] = [
        {
          uuid: 'msg-1',
          parentUuid: null,
          timestamp: '2024-01-01T00:00:00.000Z',
          type: 'assistant',
          message: {
            role: 'assistant',
            content: 'Hi there!',
          },
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const msg of messages) {
            yield JSON.stringify(msg);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result.length).toBe(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].content).toBe('Hi there!');
    });

    it('should handle array content blocks', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const contentBlocks: ContentBlock[] = [
        { type: 'text', text: 'First part' },
        { type: 'text', text: 'Second part' },
      ];

      const messages: ConversationMessage[] = [
        {
          uuid: 'msg-1',
          parentUuid: null,
          timestamp: '2024-01-01T00:00:00.000Z',
          type: 'assistant',
          message: {
            role: 'assistant',
            content: contentBlocks,
          },
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const msg of messages) {
            yield JSON.stringify(msg);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result.length).toBe(2);
      expect(result[0].content).toBe('First part');
      expect(result[1].content).toBe('Second part');
    });

    it('should handle thinking content blocks', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const contentBlocks: ContentBlock[] = [
        { type: 'thinking', thinking: 'Let me think...' },
      ];

      const messages: ConversationMessage[] = [
        {
          uuid: 'msg-1',
          parentUuid: null,
          timestamp: '2024-01-01T00:00:00.000Z',
          type: 'assistant',
          message: {
            role: 'assistant',
            content: contentBlocks,
          },
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const msg of messages) {
            yield JSON.stringify(msg);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('thinking');
      expect(result[0].content).toBe('Let me think...');
    });

    it('should skip empty string content', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const messages: ConversationMessage[] = [
        {
          uuid: 'msg-1',
          parentUuid: null,
          timestamp: '2024-01-01T00:00:00.000Z',
          type: 'user',
          message: {
            role: 'user',
            content: '   ',
          },
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const msg of messages) {
            yield JSON.stringify(msg);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result.length).toBe(0);
    });

    it('should sort messages by timestamp', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const messages: ConversationMessage[] = [
        {
          uuid: 'msg-2',
          parentUuid: null,
          timestamp: '2024-01-01T00:00:02.000Z',
          type: 'user',
          message: {
            role: 'user',
            content: 'Second',
          },
        },
        {
          uuid: 'msg-1',
          parentUuid: null,
          timestamp: '2024-01-01T00:00:01.000Z',
          type: 'user',
          message: {
            role: 'user',
            content: 'First',
          },
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const msg of messages) {
            yield JSON.stringify(msg);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result[0].content).toBe('First');
      expect(result[1].content).toBe('Second');
    });

    it('should skip invalid JSON lines', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield 'invalid json';
          yield JSON.stringify({
            uuid: 'msg-1',
            parentUuid: null,
            timestamp: '2024-01-01T00:00:00.000Z',
            type: 'user',
            message: {
              role: 'user',
              content: 'Valid message',
            },
          });
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result.length).toBe(1);
      expect(result[0].content).toBe('Valid message');
    });

    it('should handle errors gracefully', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (createReadStream as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = await loader.loadFullConversation('session-1', '/home/user/project1');

      expect(result).toEqual([]);
    });
  });
});
