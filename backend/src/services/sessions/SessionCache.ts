import type { Session, Project } from '../../types';

export interface CacheStats {
  sessionsCount: number;
  projectsCount: number;
  lastModified: number;
  fileCount: number;
}

export interface FileCacheEntry {
  mtime: number;
  size: number;
}

/**
 * Manages caching of sessions and projects data
 */
export class SessionCache {
  private sessionsCache: Map<string, Session> = new Map();
  private projectsCache: Map<string, Project> = new Map();
  private fileCache: Map<string, FileCacheEntry> = new Map();
  private lastModifiedTime: number = 0;
  private lastScanTime: number = 0;

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
    // If cache is empty, it's invalid
    if (this.sessionsCache.size === 0) {
      return false;
    }
    const currentMtimeFloor = Math.floor(currentMtime);
    const lastMtimeFloor = Math.floor(this.lastModifiedTime);
    return currentMtimeFloor <= lastMtimeFloor;
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.sessionsCache.clear();
    this.projectsCache.clear();
    this.fileCache.clear();
    this.lastModifiedTime = 0;
    this.lastScanTime = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      sessionsCount: this.sessionsCache.size,
      projectsCount: this.projectsCache.size,
      lastModified: this.lastModifiedTime,
      fileCount: this.fileCache.size,
    };
  }

  /**
   * Check if cache has sessions
   */
  hasSessions(): boolean {
    return this.sessionsCache.size > 0;
  }

  /**
   * Get file cache entry
   */
  getFileCache(filePath: string): FileCacheEntry | undefined {
    return this.fileCache.get(filePath);
  }

  /**
   * Set file cache entry
   */
  setFileCache(filePath: string, entry: FileCacheEntry): void {
    this.fileCache.set(filePath, entry);
  }

  /**
   * Check if file needs to be re-scanned
   */
  isFileDirty(filePath: string, mtime: number, size: number): boolean {
    const cached = this.fileCache.get(filePath);
    if (!cached) return true;
    return cached.mtime !== mtime || cached.size !== size;
  }

  /**
   * Get all cached file paths
   */
  getCachedFilePaths(): string[] {
    return Array.from(this.fileCache.keys());
  }

  /**
   * Remove file from cache (for deleted files)
   */
  removeFileCache(filePath: string): void {
    this.fileCache.delete(filePath);
  }

  /**
   * Set last scan time
   */
  setLastScanTime(time: number): void {
    this.lastScanTime = time;
  }

  /**
   * Get last scan time
   */
  getLastScanTime(): number {
    return this.lastScanTime;
  }

  /**
   * Check if a session exists in cache
   */
  hasSession(sessionId: string): boolean {
    return this.sessionsCache.has(sessionId);
  }

  /**
   * Remove a session from cache
   */
  removeSession(sessionId: string): void {
    this.sessionsCache.delete(sessionId);
  }
}
