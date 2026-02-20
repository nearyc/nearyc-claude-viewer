import path from 'path';
import type {
  HistoryEntry,
  Session,
  SessionInput,
  Project,
  ConversationMessage,
  ChatMessage,
  ContentBlock,
  FileWatcherEvent,
} from '../types';

import { SessionCache } from './sessions/SessionCache';
import { SessionLoader } from './sessions/SessionLoader';
import { ProjectScanner } from './sessions/ProjectScanner';
import { ConversationLoader } from './sessions/ConversationLoader';
import { SessionRepository } from './sessions/SessionRepository';
import { normalizePath, generateProjectSlug, projectSlugToPath } from './sessions/PathUtils';

// Re-export utility functions for backward compatibility
export { normalizePath, generateProjectSlug, projectSlugToPath };

export class SessionsService {
  private historyFilePath: string;
  private projectsDir: string;
  private cache: SessionCache;
  private sessionLoader: SessionLoader;
  private projectScanner: ProjectScanner;
  private conversationLoader: ConversationLoader;
  private repository: SessionRepository;

  constructor(historyFilePath: string) {
    this.historyFilePath = historyFilePath;
    this.projectsDir = path.join(path.dirname(historyFilePath), 'projects');

    // Initialize components
    this.cache = new SessionCache();
    this.sessionLoader = new SessionLoader({ historyFilePath: this.historyFilePath });
    this.projectScanner = new ProjectScanner({ projectsDir: this.projectsDir });
    this.conversationLoader = new ConversationLoader({ projectsDir: this.projectsDir });
    this.repository = new SessionRepository({
      historyFilePath: this.historyFilePath,
      projectsDir: this.projectsDir,
      cache: this.cache,
      sessionLoader: this.sessionLoader,
      projectScanner: this.projectScanner,
      conversationLoader: this.conversationLoader,
    });
  }

  // Parse history.jsonl file and build sessions
  async loadSessions(): Promise<Map<string, Session>> {
    return this.repository.loadSessions();
  }

  // Get all sessions
  async getSessions(): Promise<Session[]> {
    return this.repository.getSessions();
  }

  // Get session by ID
  async getSessionById(sessionId: string): Promise<Session | null> {
    return this.repository.getSessionById(sessionId);
  }

  // Get sessions by project
  async getSessionsByProject(projectPath: string): Promise<Session[]> {
    return this.repository.getSessionsByProject(projectPath);
  }

  // Get all projects
  async getProjects(): Promise<Project[]> {
    return this.repository.getProjects();
  }

  // Get project by path
  async getProjectByPath(projectPath: string): Promise<Project | null> {
    return this.repository.getProjectByPath(projectPath);
  }

  // Get recent sessions (last N sessions)
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    return this.repository.getRecentSessions(limit);
  }

  // Search sessions by display text
  async searchSessions(query: string): Promise<Session[]> {
    return this.repository.searchSessions(query);
  }

  // Handle file changes
  async handleFileChange(event: FileWatcherEvent): Promise<{
    type: 'sessions' | 'session' | null;
    sessionId?: string;
  }> {
    // Handle addDir events - trigger a full reload
    if (event.type === 'addDir') {
      this.clearCache();
      await this.loadSessions();
      return { type: 'sessions' };
    }

    // Normalize path for comparison
    const normalizedPath = path.normalize(event.path);
    const normalizedHistoryPath = path.normalize(this.historyFilePath);

    if (normalizedPath === normalizedHistoryPath) {
      // History file changed, reload all sessions
      this.clearCache();
      await this.loadSessions();
      // console.log('[FileWatcher] Sessions data reloaded');
      return { type: 'sessions' };
    }

    // Check if it's a session file in projects directory
    const normalizedProjectsDir = path.normalize(this.projectsDir);
    if (normalizedPath.startsWith(normalizedProjectsDir) && normalizedPath.endsWith('.jsonl')) {
      // Extract sessionId from filename
      const fileName = path.basename(event.path);
      const sessionId = fileName.replace('.jsonl', '');

      // Skip subagent files
      if (!fileName.includes('/subagents/') && !event.path.includes('subagents')) {
        // console.log(`[FileWatcher] Session file changed: ${sessionId}`);
        // Clear cache and reload sessions to pick up any new sessions
        this.clearCache();
        await this.loadSessions();
        return { type: 'session', sessionId };
      }
    }

    return { type: null };
  }

  // Clear cache
  clearCache(): void {
    this.repository.clearCache();
  }

  // After delete, reload sessions
  async afterDelete(): Promise<void> {
    await this.repository.reload();
  }

  // Delete a session by removing it from history and deleting its project file
  async deleteSession(sessionId: string): Promise<boolean> {
    return this.repository.deleteSession(sessionId);
  }

  // Get cache stats
  getCacheStats(): {
    sessionsCount: number;
    projectsCount: number;
    lastModified: number;
  } {
    return this.repository.getCacheStats();
  }

  // Get projects directory path
  getProjectsDir(): string {
    return this.projectsDir;
  }

  // Load full conversation from project jsonl file
  async loadFullConversation(sessionId: string, projectPath: string): Promise<ChatMessage[]> {
    return this.conversationLoader.loadFullConversation(sessionId, projectPath);
  }

  // Get session with full conversation
  async getSessionWithConversation(sessionId: string): Promise<Session | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;

    // Load full conversation
    const messages = await this.loadFullConversation(sessionId, session.project);

    // Calculate updatedAt from the latest message timestamp
    let updatedAt = session.updatedAt;
    if (messages.length > 0) {
      const latestMessageTimestamp = Math.max(...messages.map(m => m.timestamp));
      // Use the latest timestamp between the session's updatedAt and the latest message
      updatedAt = Math.max(session.updatedAt, latestMessageTimestamp);
    }

    return {
      ...session,
      messages,
      messageCount: messages.length,
      updatedAt,
    };
  }
}
