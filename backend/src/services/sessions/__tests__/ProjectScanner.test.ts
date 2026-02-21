import { ProjectScanner } from '../ProjectScanner';
import { SessionCache } from '../SessionCache';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { Session, Project, ConversationMessage } from '../../../types';

// Mock fs and readline
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('readline');

describe('ProjectScanner', () => {
  let scanner: ProjectScanner;
  let mockCache: SessionCache;
  const mockProjectsDir = '/mock/projects';

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = new SessionCache();
    scanner = new ProjectScanner({ projectsDir: mockProjectsDir, cache: mockCache });
  });

  describe('scanProjectsDirectory', () => {
    it('should return early if projects directory does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Not found'));

      const sessions = new Map<string, Session>();
      const projects = new Map<string, Project>();

      await scanner.scanProjectsDirectory(sessions, projects);

      expect(sessions.size).toBe(0);
      expect(projects.size).toBe(0);
    });

    it('should scan project directories and find sessions', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce([
          { name: 'project-1', isDirectory: () => true },
        ])
        .mockResolvedValueOnce(['session-1.jsonl']);

      const mockMessage: ConversationMessage = {
        uuid: 'msg-1',
        parentUuid: null,
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'user',
        project: '/home/user/project1',
      };

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield JSON.stringify(mockMessage);
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const sessions = new Map<string, Session>();
      const projects = new Map<string, Project>();

      await scanner.scanProjectsDirectory(sessions, projects);

      expect(sessions.size).toBe(1);
      expect(sessions.has('session-1')).toBe(true);
    });

    it('should skip sessions already in history', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce([
          { name: 'project-1', isDirectory: () => true },
        ])
        .mockResolvedValueOnce(['existing-session.jsonl']);

      const existingSession: Session = {
        id: 'existing-session',
        sessionId: 'existing-session',
        project: '/home/user/project1',
        projectSlug: 'project-1',
        inputs: [],
        messages: [],
        createdAt: 1000,
        updatedAt: 2000,
        inputCount: 1,
        messageCount: 1,
      };

      const sessions = new Map<string, Session>([['existing-session', existingSession]]);
      const projects = new Map<string, Project>();

      await scanner.scanProjectsDirectory(sessions, projects);

      expect(sessions.size).toBe(1);
    });

    it('should skip non-directory entries', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValueOnce([
        { name: 'file.txt', isDirectory: () => false },
        { name: 'project-1', isDirectory: () => true },
      ]);

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          return;
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});
      (fs.readdir as jest.Mock).mockResolvedValueOnce([]);

      const sessions = new Map<string, Session>();
      const projects = new Map<string, Project>();

      await scanner.scanProjectsDirectory(sessions, projects);

      // Should only process the directory
      expect(fs.readdir).toHaveBeenCalledTimes(2);
    });

    it('should skip subagent files', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce([
          { name: 'project-1', isDirectory: () => true },
        ])
        .mockResolvedValueOnce(['session-1.jsonl', 'subagents-session.jsonl']);

      const mockMessage: ConversationMessage = {
        uuid: 'msg-1',
        parentUuid: null,
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'user',
      };

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield JSON.stringify(mockMessage);
        },
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockStream);
      (createReadStream as jest.Mock).mockReturnValue({});

      const sessions = new Map<string, Session>();
      const projects = new Map<string, Project>();

      await scanner.scanProjectsDirectory(sessions, projects);

      // Should only have session-1, not subagents-session
      expect(sessions.has('session-1')).toBe(true);
      expect(sessions.has('subagents-session')).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Read error'));

      const sessions = new Map<string, Session>();
      const projects = new Map<string, Project>();

      await expect(scanner.scanProjectsDirectory(sessions, projects)).resolves.not.toThrow();
    });
  });
});
