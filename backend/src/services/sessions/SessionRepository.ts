import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import readline from 'readline';
import type { HistoryEntry, Session, Project } from '../../types';
import { SessionCache } from './SessionCache';
import { SessionLoader } from './SessionLoader';
import { ProjectScanner } from './ProjectScanner';
import { ConversationLoader } from './ConversationLoader';
import { normalizePath, generateProjectSlug } from './PathUtils';

export interface SessionRepositoryDependencies {
  historyFilePath: string;
  projectsDir: string;
  cache: SessionCache;
  sessionLoader: SessionLoader;
  projectScanner: ProjectScanner;
  conversationLoader: ConversationLoader;
}

/**
 * Repository for session CRUD operations
 */
export class SessionRepository {
  private historyFilePath: string;
  private projectsDir: string;
  private cache: SessionCache;
  private sessionLoader: SessionLoader;
  private projectScanner: ProjectScanner;
  private conversationLoader: ConversationLoader;

  constructor(deps: SessionRepositoryDependencies) {
    this.historyFilePath = deps.historyFilePath;
    this.projectsDir = deps.projectsDir;
    this.cache = deps.cache;
    this.sessionLoader = deps.sessionLoader;
    this.projectScanner = deps.projectScanner;
    this.conversationLoader = deps.conversationLoader;
  }

  /**
   * Load all sessions (from cache if valid, otherwise from file)
   */
  async loadSessions(): Promise<Map<string, Session>> {
    try {
      // Check if file exists and get modification time
      const stats = await fs.stat(this.historyFilePath);
      const currentMtime = Math.floor(stats.mtimeMs);

      // Check if cache is still valid
      if (this.cache.isValid(currentMtime)) {
        return this.cache.getAllSessions();
      }

      // Update last modified time
      this.cache.setLastModified(stats.mtimeMs);

      // Load sessions from history file
      const { sessions, projects } = await this.sessionLoader.loadSessions();

      // Scan projects directory to find sessions not in history.jsonl
      await this.projectScanner.scanProjectsDirectory(sessions, projects);

      // Update caches
      this.cache.setSessions(sessions);
      this.cache.setProjects(projects);

      console.log(`[SessionRepository] Loaded ${sessions.size} sessions from ${projects.size} projects`);

      return sessions;
    } catch (error) {
      console.error('[SessionRepository] Error loading sessions:', error);
      return this.cache.getAllSessions();
    }
  }

  /**
   * Get all sessions sorted by updatedAt (descending)
   */
  async getSessions(): Promise<Session[]> {
    const sessions = await this.loadSessions();
    return Array.from(sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    const sessions = await this.loadSessions();
    return sessions.get(sessionId) || null;
  }

  /**
   * Get sessions by project
   */
  async getSessionsByProject(projectPath: string): Promise<Session[]> {
    const sessions = await this.loadSessions();
    const normalizedPath = normalizePath(projectPath);
    return Array.from(sessions.values())
      .filter(s => s.project === normalizedPath)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get all projects sorted by lastActive (descending)
   */
  async getProjects(): Promise<Project[]> {
    await this.loadSessions();
    return Array.from(this.cache.getAllProjects().values())
      .sort((a, b) => b.lastActive - a.lastActive);
  }

  /**
   * Get project by path
   */
  async getProjectByPath(projectPath: string): Promise<Project | null> {
    await this.loadSessions();
    return this.cache.getProject(projectPath) || null;
  }

  /**
   * Get recent sessions (last N sessions)
   */
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    const sessions = await this.getSessions();
    return sessions.slice(0, limit);
  }

  /**
   * Search sessions by display text
   */
  async searchSessions(query: string): Promise<Session[]> {
    const sessions = await this.getSessions();
    const lowerQuery = query.toLowerCase();
    return sessions.filter(session =>
      session.inputs.some(input =>
        input.display.toLowerCase().includes(lowerQuery)
      )
    );
  }

  /**
   * Delete a session by removing it from history and deleting its project file
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      let deleted = false;

      // 1. Delete the session file from projects directory
      const session = await this.getSessionById(sessionId);
      if (session) {
        const projectSlug = session.projectSlug;
        const sessionFile = path.join(this.projectsDir, projectSlug, `${sessionId}.jsonl`);
        const subagentsFile = path.join(this.projectsDir, projectSlug, 'subagents', `${sessionId}.jsonl`);

        try {
          await fs.unlink(sessionFile);
          console.log(`[SessionRepository] Deleted session file: ${sessionFile}`);
          deleted = true;
        } catch {
          // File might not exist
        }

        // Try to delete subagents file if exists
        try {
          await fs.unlink(subagentsFile);
          console.log(`[SessionRepository] Deleted subagents file: ${subagentsFile}`);
        } catch {
          // File might not exist
        }
      }

      // 2. Remove from history.jsonl by creating a filtered version
      try {
        await fs.access(this.historyFilePath);
        const tempFilePath = `${this.historyFilePath}.tmp`;

        // Read original file and write filtered content to temp file
        const readStream = createReadStream(this.historyFilePath, { encoding: 'utf-8' });
        const writeStream = createWriteStream(tempFilePath, { encoding: 'utf-8' });
        const rl = readline.createInterface({
          input: readStream,
          crlfDelay: Infinity,
        });

        for await (const line of rl) {
          if (!line.trim()) continue;
          try {
            const entry: HistoryEntry = JSON.parse(line);
            // Only keep lines that don't match the session to delete
            if (entry.sessionId !== sessionId) {
              writeStream.write(line + '\n');
            }
          } catch {
            // Skip invalid JSON lines but keep them to preserve file structure
            writeStream.write(line + '\n');
          }
        }

        writeStream.end();
        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        // Replace original file with filtered temp file
        await fs.rename(tempFilePath, this.historyFilePath);
        console.log(`[SessionRepository] Removed session ${sessionId} from history`);
        deleted = true;
      } catch (error) {
        console.error(`[SessionRepository] Error updating history file:`, error);
      }

      // 3. Clear cache to force reload
      if (deleted) {
        this.cache.clear();
      }

      return deleted;
    } catch (error) {
      console.error(`[SessionRepository] Error deleting session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Load full conversation for a session
   */
  async loadFullConversation(sessionId: string, projectPath: string) {
    return this.conversationLoader.loadFullConversation(sessionId, projectPath);
  }

  /**
   * Clear cache and reload sessions
   */
  async reload(): Promise<void> {
    this.cache.clear();
    await this.loadSessions();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get projects directory path
   */
  getProjectsDir(): string {
    return this.projectsDir;
  }
}
