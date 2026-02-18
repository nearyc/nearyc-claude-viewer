import { SessionCache } from '../SessionCache';
import type { Session, Project } from '../../../types';

describe('SessionCache', () => {
  let cache: SessionCache;

  const mockSession: Session = {
    id: 'session-1',
    sessionId: 'session-1',
    project: '/home/user/project',
    projectSlug: '-home-user-project',
    inputs: [],
    messages: [],
    createdAt: 1000,
    updatedAt: 2000,
    inputCount: 0,
    messageCount: 0,
  };

  const mockProject: Project = {
    name: 'project',
    path: '/home/user/project',
    sessionCount: 1,
    lastActive: 2000,
  };

  beforeEach(() => {
    cache = new SessionCache();
  });

  describe('getSession', () => {
    it('should return undefined for non-existent session', () => {
      expect(cache.getSession('non-existent')).toBeUndefined();
    });

    it('should return session from cache', () => {
      const sessions = new Map([['session-1', mockSession]]);
      cache.setSessions(sessions);
      expect(cache.getSession('session-1')).toEqual(mockSession);
    });
  });

  describe('getAllSessions', () => {
    it('should return empty map when cache is empty', () => {
      expect(cache.getAllSessions().size).toBe(0);
    });

    it('should return all sessions from cache', () => {
      const sessions = new Map([
        ['session-1', mockSession],
        ['session-2', { ...mockSession, id: 'session-2', sessionId: 'session-2' }],
      ]);
      cache.setSessions(sessions);
      expect(cache.getAllSessions().size).toBe(2);
    });
  });

  describe('getProject', () => {
    it('should return undefined for non-existent project', () => {
      expect(cache.getProject('/non/existent')).toBeUndefined();
    });

    it('should return project from cache', () => {
      const projects = new Map([['/home/user/project', mockProject]]);
      cache.setProjects(projects);
      expect(cache.getProject('/home/user/project')).toEqual(mockProject);
    });
  });

  describe('getAllProjects', () => {
    it('should return empty map when cache is empty', () => {
      expect(cache.getAllProjects().size).toBe(0);
    });

    it('should return all projects from cache', () => {
      const projects = new Map([
        ['/home/user/project1', mockProject],
        ['/home/user/project2', { ...mockProject, path: '/home/user/project2' }],
      ]);
      cache.setProjects(projects);
      expect(cache.getAllProjects().size).toBe(2);
    });
  });

  describe('setSessions', () => {
    it('should set sessions cache', () => {
      const sessions = new Map([['session-1', mockSession]]);
      cache.setSessions(sessions);
      expect(cache.getAllSessions().get('session-1')).toEqual(mockSession);
    });

    it('should create a copy of the map', () => {
      const sessions = new Map([['session-1', mockSession]]);
      cache.setSessions(sessions);
      sessions.set('session-2', { ...mockSession, id: 'session-2' });
      expect(cache.getAllSessions().size).toBe(1);
    });
  });

  describe('setProjects', () => {
    it('should set projects cache', () => {
      const projects = new Map([['/home/user/project', mockProject]]);
      cache.setProjects(projects);
      expect(cache.getAllProjects().get('/home/user/project')).toEqual(mockProject);
    });
  });

  describe('setLastModified and getLastModified', () => {
    it('should set and get last modified time', () => {
      cache.setLastModified(1234567890);
      expect(cache.getLastModified()).toBe(1234567890);
    });
  });

  describe('isValid', () => {
    it('should return false when cache is empty', () => {
      cache.setLastModified(1000);
      expect(cache.isValid(1000)).toBe(false);
    });

    it('should return true when file has not changed', () => {
      cache.setSessions(new Map([['session-1', mockSession]]));
      cache.setLastModified(1000);
      expect(cache.isValid(1000)).toBe(true);
    });

    it('should return true when file mtime is older than cache', () => {
      cache.setSessions(new Map([['session-1', mockSession]]));
      cache.setLastModified(2000);
      expect(cache.isValid(1000)).toBe(true);
    });

    it('should return false when file has been modified', () => {
      cache.setSessions(new Map([['session-1', mockSession]]));
      cache.setLastModified(1000);
      expect(cache.isValid(2000)).toBe(false);
    });

    it('should handle floating point comparison', () => {
      cache.setSessions(new Map([['session-1', mockSession]]));
      cache.setLastModified(1000.123);
      expect(cache.isValid(1000.456)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all caches', () => {
      cache.setSessions(new Map([['session-1', mockSession]]));
      cache.setProjects(new Map([['/home/user/project', mockProject]]));
      cache.setLastModified(1000);

      cache.clear();

      expect(cache.getAllSessions().size).toBe(0);
      expect(cache.getAllProjects().size).toBe(0);
      expect(cache.getLastModified()).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.setSessions(new Map([['session-1', mockSession]]));
      cache.setProjects(new Map([['/home/user/project', mockProject]]));
      cache.setLastModified(1234567890);

      const stats = cache.getStats();

      expect(stats.sessionsCount).toBe(1);
      expect(stats.projectsCount).toBe(1);
      expect(stats.lastModified).toBe(1234567890);
    });

    it('should return zero stats for empty cache', () => {
      const stats = cache.getStats();

      expect(stats.sessionsCount).toBe(0);
      expect(stats.projectsCount).toBe(0);
      expect(stats.lastModified).toBe(0);
    });
  });

  describe('hasSessions', () => {
    it('should return false when cache is empty', () => {
      expect(cache.hasSessions()).toBe(false);
    });

    it('should return true when cache has sessions', () => {
      cache.setSessions(new Map([['session-1', mockSession]]));
      expect(cache.hasSessions()).toBe(true);
    });
  });
});
