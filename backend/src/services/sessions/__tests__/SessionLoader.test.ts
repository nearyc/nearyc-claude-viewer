import { SessionLoader } from '../SessionLoader';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { HistoryEntry } from '../../../types';

// Mock fs and readline
jest.mock('fs');
jest.mock('readline');

describe('SessionLoader', () => {
  let loader: SessionLoader;
  const mockHistoryFilePath = '/mock/history.jsonl';

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new SessionLoader({ historyFilePath: mockHistoryFilePath });
  });

  describe('loadSessions', () => {
    it('should return empty maps when file is empty', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          return;
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadSessions();

      expect(result.sessions.size).toBe(0);
      expect(result.projects.size).toBe(0);
    });

    it('should load sessions from history entries', async () => {
      const entries: HistoryEntry[] = [
        {
          sessionId: 'session-1',
          display: 'Test input 1',
          timestamp: 1000,
          project: '/home/user/project1',
        },
        {
          sessionId: 'session-1',
          display: 'Test input 2',
          timestamp: 2000,
          project: '/home/user/project1',
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const entry of entries) {
            yield JSON.stringify(entry);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadSessions();

      expect(result.sessions.size).toBe(1);
      expect(result.sessions.get('session-1')?.inputs.length).toBe(2);
      expect(result.sessions.get('session-1')?.inputCount).toBe(2);
    });

    it('should handle timestamp in seconds', async () => {
      const entries: HistoryEntry[] = [
        {
          sessionId: 'session-1',
          display: 'Test',
          timestamp: 1000000, // seconds
          project: '/home/user/project1',
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const entry of entries) {
            yield JSON.stringify(entry);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadSessions();

      // Should convert to milliseconds
      expect(result.sessions.get('session-1')?.createdAt).toBe(1000000000);
    });

    it('should handle timestamp in milliseconds', async () => {
      const entries: HistoryEntry[] = [
        {
          sessionId: 'session-1',
          display: 'Test',
          timestamp: 1700000000000, // milliseconds (larger than 10000000000 threshold)
          project: '/home/user/project1',
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const entry of entries) {
            yield JSON.stringify(entry);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadSessions();

      // Should keep as milliseconds (not multiply by 1000)
      expect(result.sessions.get('session-1')?.createdAt).toBe(1700000000000);
    });

    it('should skip entries without required fields', async () => {
      const entries = [
        { display: 'Test', timestamp: 1000, project: '/home/user/project1' }, // missing sessionId
        { sessionId: 'session-1', display: 'Test', project: '/home/user/project1' }, // missing timestamp
        { sessionId: 'session-2', display: 'Valid', timestamp: 1000, project: '/home/user/project1' },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const entry of entries) {
            yield JSON.stringify(entry);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadSessions();

      expect(result.sessions.size).toBe(1);
      expect(result.sessions.has('session-2')).toBe(true);
    });

    it('should skip invalid JSON lines', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield 'invalid json';
          yield JSON.stringify({ sessionId: 'session-1', display: 'Valid', timestamp: 1000, project: '/home/user/project1' });
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadSessions();

      expect(result.sessions.size).toBe(1);
    });

    it('should create projects from entries', async () => {
      const entries: HistoryEntry[] = [
        {
          sessionId: 'session-1',
          display: 'Test',
          timestamp: 1000,
          project: '/home/user/project1',
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const entry of entries) {
            yield JSON.stringify(entry);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadSessions();

      expect(result.projects.size).toBe(1);
      expect(result.projects.get('/home/user/project1')?.name).toBe('project1');
    });

    it('should sort inputs by timestamp', async () => {
      const entries: HistoryEntry[] = [
        {
          sessionId: 'session-1',
          display: 'Second',
          timestamp: 2000,
          project: '/home/user/project1',
        },
        {
          sessionId: 'session-1',
          display: 'First',
          timestamp: 1000,
          project: '/home/user/project1',
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const entry of entries) {
            yield JSON.stringify(entry);
          }
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const result = await loader.loadSessions();

      const session = result.sessions.get('session-1');
      expect(session?.inputs[0].display).toBe('First');
      expect(session?.inputs[1].display).toBe('Second');
    });

    it('should handle errors gracefully', async () => {
      (createReadStream as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await loader.loadSessions();

      expect(result.sessions.size).toBe(0);
      expect(result.projects.size).toBe(0);
    });
  });
});
