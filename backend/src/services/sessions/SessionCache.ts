import type { Session, Project } from '../../types';

export interface CacheStats {
  sessionsCount: number;
  projectsCount: number;
  lastModified: number;
}

/**
 * Manages caching of sessions and projects data
 */
export class SessionCache {
  private sessionsCache: Map<string, Session> = new Map();
  private projectsCache: Map<string, Project> = new Map();
  private lastModifiedTime: number = 0;

  /**
   * Get a session from cache
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessionsCache.get(sessionId);
  }

  /**
   * Get all sessions from cache
   */
  getAllSessions(): Map<string, Session> {
    return new Map(this.sessionsCache);
  }

  /**
   * Get a project from cache
   */
  getProject(projectPath: string): Project | undefined {
    return this.projectsCache.get(projectPath);
  }

  /**
   * Get all projects from cache
   */
  getAllProjects(): Map<string, Project> {
    return new Map(this.projectsCache);
  }

  /**
   * Set sessions cache
   */
  setSessions(sessions: Map<string, Session>): void {
    this.sessionsCache = new Map(sessions);
  }

  /**
   * Set projects cache
   */
  setProjects(projects: Map<string, Project>): void {
    this.projectsCache = new Map(projects);
  }

  /**
   * Update last modified time
   */
  setLastModified(time: number): void {
    this.lastModifiedTime = time;
  }

  /**
   * Get last modified time
   */
  getLastModified(): number {
    return this.lastModifiedTime;
  }

  /**
   * Check if cache is valid based on file modification time
   */
  isValid(currentMtime: number): boolean {
    const currentMtimeFloor = Math.floor(currentMtime);
    const lastMtimeFloor = Math.floor(this.lastModifiedTime);
    return currentMtimeFloor <= lastMtimeFloor && this.sessionsCache.size > 0;
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.sessionsCache.clear();
    this.projectsCache.clear();
    this.lastModifiedTime = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      sessionsCount: this.sessionsCache.size,
      projectsCount: this.projectsCache.size,
      lastModified: this.lastModifiedTime,
    };
  }

  /**
   * Check if cache has sessions
   */
  hasSessions(): boolean {
    return this.sessionsCache.size > 0;
  }
}
