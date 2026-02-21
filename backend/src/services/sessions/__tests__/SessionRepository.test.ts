import { SessionRepository } from '../SessionRepository';
import { SessionCache } from '../SessionCache';
import { SessionLoader } from '../SessionLoader';
import { ProjectScanner } from '../ProjectScanner';
import { ConversationLoader } from '../ConversationLoader';
import type { Session, Project } from '../../../types';

// Mock fs
jest.mock('fs/promises');

// Mock dependencies
jest.mock('../SessionLoader');
jest.mock('../ProjectScanner');
jest.mock('../ConversationLoader');

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let mockCache: SessionCache;
  let mockSessionLoader: jest.Mocked<SessionLoader>;
  let mockProjectScanner: jest.Mocked<ProjectScanner>;
  let mockConversationLoader: jest.Mocked<ConversationLoader>;

  const mockHistoryFilePath = '/mock/history.jsonl';
  const mockProjectsDir = '/mock/projects';

  const mockSession: Session = {
    id: 'session-1',
    sessionId: 'session-1',
    project: '/home/user/project1',
    projectSlug: '-home-user-project1',
    inputs: [{ display: 'Test input', timestamp: 1000 }],
    messages: [],
    createdAt: 1000,
    updatedAt: 2000,
    inputCount: 1,
    messageCount: 0,
  };

  const mockProject: Project = {
    name: 'project1',
    path: '/home/user/project1',
    sessionCount: 1,
    lastActive: 2000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCache = new SessionCache();
    mockSessionLoader = new SessionLoader({ historyFilePath: mockHistoryFilePath }) as jest.Mocked<SessionLoader>;
    mockProjectScanner = new ProjectScanner({ projectsDir: mockProjectsDir, cache: mockCache }) as jest.Mocked<ProjectScanner>;
    mockConversationLoader = new ConversationLoader({ projectsDir: mockProjectsDir }) as jest.Mocked<ConversationLoader>;

    repository = new SessionRepository({
      historyFilePath: mockHistoryFilePath,
      projectsDir: mockProjectsDir,
      cache: mockCache,
      sessionLoader: mockSessionLoader,
      projectScanner: mockProjectScanner,
      conversationLoader: mockConversationLoader,
    });
  });

  describe('loadSessions', () => {
    it('should return cached sessions if cache is valid', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      mockCache.setSessions(new Map([['session-1', mockSession]]));
      mockCache.setLastModified(1000);

      const result = await repository.loadSessions();

      expect(result.get('session-1')).toEqual(mockSession);
      expect(mockSessionLoader.loadSessions).not.toHaveBeenCalled();
    });

    it('should load from file if cache is invalid', async () => {
      const stats = { mtimeMs: 2000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      mockCache.setSessions(new Map([['session-1', mockSession]]));
      mockCache.setLastModified(1000);

      mockSessionLoader.loadSessions.mockResolvedValue({
        sessions: new Map([['session-2', { ...mockSession, id: 'session-2', sessionId: 'session-2' }]]),
        projects: new Map([['/home/user/project2', { ...mockProject, path: '/home/user/project2' }]]),
      });

      mockProjectScanner.scanProjectsDirectory.mockResolvedValue(undefined);

      const result = await repository.loadSessions();

      expect(result.has('session-2')).toBe(true);
      expect(mockSessionLoader.loadSessions).toHaveBeenCalled();
    });

    it('should handle file stat errors gracefully', async () => {
      jest.spyOn(require('fs/promises'), 'stat').mockRejectedValue(new Error('File not found'));

      mockCache.setSessions(new Map([['session-1', mockSession]]));

      const result = await repository.loadSessions();

      expect(result.get('session-1')).toEqual(mockSession);
    });
  });

  describe('getSessions', () => {
    it('should return sessions sorted by updatedAt descending', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      const sessions = new Map([
        ['session-1', { ...mockSession, updatedAt: 1000 }],
        ['session-2', { ...mockSession, id: 'session-2', sessionId: 'session-2', updatedAt: 3000 }],
        ['session-3', { ...mockSession, id: 'session-3', sessionId: 'session-3', updatedAt: 2000 }],
      ]);

      mockCache.setSessions(sessions);
      mockCache.setLastModified(1000);

      const result = await repository.getSessions();

      expect(result[0].sessionId).toBe('session-2');
      expect(result[1].sessionId).toBe('session-3');
      expect(result[2].sessionId).toBe('session-1');
    });
  });

  describe('getSessionById', () => {
    it('should return session by id', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      mockCache.setSessions(new Map([['session-1', mockSession]]));
      mockCache.setLastModified(1000);

      const result = await repository.getSessionById('session-1');

      expect(result).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      mockCache.setSessions(new Map());
      mockCache.setLastModified(1000);

      const result = await repository.getSessionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getSessionsByProject', () => {
    it('should return sessions filtered by project', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      const sessions = new Map([
        ['session-1', { ...mockSession, project: '/home/user/project1' }],
        ['session-2', { ...mockSession, id: 'session-2', sessionId: 'session-2', project: '/home/user/project2' }],
      ]);

      mockCache.setSessions(sessions);
      mockCache.setLastModified(1000);

      const result = await repository.getSessionsByProject('/home/user/project1');

      expect(result.length).toBe(1);
      expect(result[0].sessionId).toBe('session-1');
    });
  });

  describe('getProjects', () => {
    it('should return projects sorted by lastActive descending', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      mockCache.setSessions(new Map([['session-1', mockSession]]));
      mockCache.setProjects(new Map([
        ['/home/user/project1', { ...mockProject, lastActive: 1000 }],
        ['/home/user/project2', { ...mockProject, path: '/home/user/project2', lastActive: 3000 }],
      ]));
      mockCache.setLastModified(1000);

      const result = await repository.getProjects();

      expect(result[0].path).toBe('/home/user/project2');
      expect(result[1].path).toBe('/home/user/project1');
    });
  });

  describe('getProjectByPath', () => {
    it('should return project by path', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      mockCache.setSessions(new Map([['session-1', mockSession]]));
      mockCache.setProjects(new Map([['/home/user/project1', mockProject]]));
      mockCache.setLastModified(1000);

      const result = await repository.getProjectByPath('/home/user/project1');

      expect(result).toEqual(mockProject);
    });
  });

  describe('getRecentSessions', () => {
    it('should return limited number of recent sessions', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      const sessions = new Map([
        ['session-1', { ...mockSession, updatedAt: 1000 }],
        ['session-2', { ...mockSession, id: 'session-2', sessionId: 'session-2', updatedAt: 3000 }],
        ['session-3', { ...mockSession, id: 'session-3', sessionId: 'session-3', updatedAt: 2000 }],
      ]);

      mockCache.setSessions(sessions);
      mockCache.setLastModified(1000);

      const result = await repository.getRecentSessions(2);

      expect(result.length).toBe(2);
      expect(result[0].sessionId).toBe('session-2');
      expect(result[1].sessionId).toBe('session-3');
    });
  });

  describe('searchSessions', () => {
    it('should return sessions matching query', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      const sessions = new Map([
        ['session-1', { ...mockSession, inputs: [{ display: 'Hello world', timestamp: 1000 }] }],
        ['session-2', { ...mockSession, id: 'session-2', sessionId: 'session-2', inputs: [{ display: 'Goodbye', timestamp: 1000 }] }],
      ]);

      mockCache.setSessions(sessions);
      mockCache.setLastModified(1000);

      const result = await repository.searchSessions('hello');

      expect(result.length).toBe(1);
      expect(result[0].sessionId).toBe('session-1');
    });

    it('should be case insensitive', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      const sessions = new Map([
        ['session-1', { ...mockSession, inputs: [{ display: 'HELLO WORLD', timestamp: 1000 }] }],
      ]);

      mockCache.setSessions(sessions);
      mockCache.setLastModified(1000);

      const result = await repository.searchSessions('hello');

      expect(result.length).toBe(1);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      mockCache.setSessions(new Map([['session-1', mockSession]]));

      repository.clearCache();

      expect(mockCache.getAllSessions().size).toBe(0);
    });
  });

  describe('reload', () => {
    it('should clear cache and reload sessions', async () => {
      const stats = { mtimeMs: 1000 };
      jest.spyOn(require('fs/promises'), 'stat').mockResolvedValue(stats as any);

      mockSessionLoader.loadSessions.mockResolvedValue({
        sessions: new Map(),
        projects: new Map(),
      });

      mockProjectScanner.scanProjectsDirectory.mockResolvedValue(undefined);

      await repository.reload();

      expect(mockSessionLoader.loadSessions).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      mockCache.setSessions(new Map([['session-1', mockSession]]));
      mockCache.setProjects(new Map([['/home/user/project1', mockProject]]));
      mockCache.setLastModified(1234567890);

      const stats = repository.getCacheStats();

      expect(stats.sessionsCount).toBe(1);
      expect(stats.projectsCount).toBe(1);
      expect(stats.lastModified).toBe(1234567890);
    });
  });

  describe('getProjectsDir', () => {
    it('should return projects directory path', () => {
      expect(repository.getProjectsDir()).toBe(mockProjectsDir);
    });
  });

  describe('loadFullConversation', () => {
    it('should delegate to conversation loader', async () => {
      const mockMessages = [{ uuid: 'msg-1', role: 'user' as const, content: 'Hello', timestamp: 1000 }];
      mockConversationLoader.loadFullConversation.mockResolvedValue(mockMessages);

      const result = await repository.loadFullConversation('session-1', '/home/user/project1');

      expect(result).toEqual(mockMessages);
      expect(mockConversationLoader.loadFullConversation).toHaveBeenCalledWith('session-1', '/home/user/project1');
    });
  });
});
