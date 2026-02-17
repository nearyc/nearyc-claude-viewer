import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import readline from 'readline';
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

export class SessionsService {
  private historyFilePath: string;
  private projectsDir: string;
  private sessionsCache: Map<string, Session> = new Map();
  private projectsCache: Map<string, Project> = new Map();
  private lastModifiedTime: number = 0;

  constructor(historyFilePath: string) {
    this.historyFilePath = historyFilePath;
    this.projectsDir = path.join(path.dirname(historyFilePath), 'projects');
  }

  // Parse history.jsonl file and build sessions
  async loadSessions(): Promise<Map<string, Session>> {
    const sessions = new Map<string, Session>();
    const projects = new Map<string, Project>();

    try {
      // Check if file exists
      const stats = await fs.stat(this.historyFilePath);
      // Use Math.floor to handle filesystem precision differences
      const currentMtime = Math.floor(stats.mtimeMs);
      const lastMtime = Math.floor(this.lastModifiedTime);
      if (currentMtime <= lastMtime && this.sessionsCache.size > 0) {
        // File hasn't changed, return cached data
        return this.sessionsCache;
      }
      this.lastModifiedTime = stats.mtimeMs;

      // Read file line by line
      const fileStream = createReadStream(this.historyFilePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry: HistoryEntry = JSON.parse(line);

          // Skip entries without required fields
          if (!entry.sessionId || !entry.timestamp) continue;

          // Convert timestamp from seconds to milliseconds if needed
          // Claude Code history.jsonl uses Unix timestamp (seconds), JavaScript uses milliseconds
          const timestampMs = entry.timestamp > 10000000000 ? entry.timestamp : entry.timestamp * 1000;

          // Get or create session
          let session = sessions.get(entry.sessionId);
          if (!session) {
            const projectPath = this.normalizePath(entry.project || 'unknown');
            session = {
              id: entry.sessionId,
              sessionId: entry.sessionId,
              project: projectPath,
              projectSlug: this.generateProjectSlug(projectPath),
              inputs: [],
              messages: [],
              createdAt: timestampMs,
              updatedAt: timestampMs,
              inputCount: 0,
              messageCount: 0,
            };
            sessions.set(entry.sessionId, session);
          }

          // Add input to session
          const input: SessionInput = {
            display: entry.display || '',
            timestamp: timestampMs,
          };
          session.inputs.push(input);

          // Update session metadata
          session.inputCount = session.inputs.length;
          if (timestampMs < session.createdAt) {
            session.createdAt = timestampMs;
          }
          if (timestampMs > session.updatedAt) {
            session.updatedAt = timestampMs;
          }

          // Update project info
          const projectPath = this.normalizePath(entry.project || 'unknown');
          let project = projects.get(projectPath);
          if (!project) {
            project = {
              name: path.basename(projectPath),
              path: projectPath,
              sessionCount: 0,
              lastActive: timestampMs,
            };
            projects.set(projectPath, project);
          }
          project.lastActive = Math.max(project.lastActive, timestampMs);
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }

      // Count sessions per project
      for (const session of sessions.values()) {
        const project = projects.get(session.project);
        if (project) {
          project.sessionCount++;
        }
      }

      // Sort inputs within each session by timestamp
      for (const session of sessions.values()) {
        session.inputs.sort((a, b) => a.timestamp - b.timestamp);
      }

      // Scan projects directory to find sessions not in history.jsonl
      await this.scanProjectsDirectory(sessions, projects);

      // Update caches
      this.sessionsCache = sessions;
      this.projectsCache = projects;

      console.log(`[SessionsService] Loaded ${sessions.size} sessions from ${projects.size} projects`);

      return sessions;
    } catch (error) {
      console.error('[SessionsService] Error loading sessions:', error);
      return this.sessionsCache;
    }
  }

  // Get all sessions
  async getSessions(): Promise<Session[]> {
    const sessions = await this.loadSessions();
    return Array.from(sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Get session by ID
  async getSessionById(sessionId: string): Promise<Session | null> {
    const sessions = await this.loadSessions();
    return sessions.get(sessionId) || null;
  }

  // Get sessions by project
  async getSessionsByProject(projectPath: string): Promise<Session[]> {
    const sessions = await this.loadSessions();
    const normalizedPath = this.normalizePath(projectPath);
    return Array.from(sessions.values())
      .filter(s => s.project === normalizedPath)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Get all projects
  async getProjects(): Promise<Project[]> {
    await this.loadSessions();
    return Array.from(this.projectsCache.values()).sort((a, b) => b.lastActive - a.lastActive);
  }

  // Get project by path
  async getProjectByPath(projectPath: string): Promise<Project | null> {
    await this.loadSessions();
    return this.projectsCache.get(projectPath) || null;
  }

  // Get recent sessions (last N sessions)
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    const sessions = await this.getSessions();
    return sessions.slice(0, limit);
  }

  // Search sessions by display text
  async searchSessions(query: string): Promise<Session[]> {
    const sessions = await this.getSessions();
    const lowerQuery = query.toLowerCase();
    return sessions.filter(session =>
      session.inputs.some(input =>
        input.display.toLowerCase().includes(lowerQuery)
      )
    );
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
      console.log('[FileWatcher] Sessions data reloaded');
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
        console.log(`[FileWatcher] Session file changed: ${sessionId}`);
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
    this.sessionsCache.clear();
    this.projectsCache.clear();
    this.lastModifiedTime = 0;
  }

  // After delete, reload sessions
  async afterDelete(): Promise<void> {
    this.clearCache();
    await this.loadSessions();
  }

  // Delete a session by removing it from history and deleting its project file
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
          console.log(`[SessionsService] Deleted session file: ${sessionFile}`);
          deleted = true;
        } catch {
          // File might not exist
        }

        // Try to delete subagents file if exists
        try {
          await fs.unlink(subagentsFile);
          console.log(`[SessionsService] Deleted subagents file: ${subagentsFile}`);
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
        console.log(`[SessionsService] Removed session ${sessionId} from history`);
        deleted = true;
      } catch (error) {
        console.error(`[SessionsService] Error updating history file:`, error);
      }

      // 3. Clear cache to force reload
      if (deleted) {
        this.clearCache();
      }

      return deleted;
    } catch (error) {
      console.error(`[SessionsService] Error deleting session ${sessionId}:`, error);
      throw error;
    }
  }

  // Get cache stats
  getCacheStats(): {
    sessionsCount: number;
    projectsCount: number;
    lastModified: number;
  } {
    return {
      sessionsCount: this.sessionsCache.size,
      projectsCount: this.projectsCache.size,
      lastModified: this.lastModifiedTime,
    };
  }

  // Get projects directory path
  getProjectsDir(): string {
    return this.projectsDir;
  }

  // Load full conversation from project jsonl file
  async loadFullConversation(sessionId: string, projectPath: string): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    try {
      // Normalize path and generate project slug from path
      const normalizedPath = this.normalizePath(projectPath);
      const projectSlug = this.generateProjectSlug(normalizedPath);
      const conversationFile = path.join(this.projectsDir, projectSlug, `${sessionId}.jsonl`);

      console.log(`[SessionsService] Loading conversation for ${sessionId}`);
      console.log(`[SessionsService] Project path: ${normalizedPath} -> slug: ${projectSlug}`);
      console.log(`[SessionsService] Looking for file: ${conversationFile}`);

      // Check if file exists
      try {
        await fs.access(conversationFile);
        console.log(`[SessionsService] File found, parsing...`);
      } catch {
        console.log(`[SessionsService] File not found: ${conversationFile}`);
        return messages;
      }

      // Read file line by line
      const fileStream = createReadStream(conversationFile, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry: ConversationMessage = JSON.parse(line);

          // Only process user and assistant messages
          if (entry.type === 'user' || (entry.type === 'assistant' && entry.message)) {
            const role = entry.type === 'user' ? 'user' : 'assistant';
            const timestamp = new Date(entry.timestamp).getTime();

            if (entry.message?.content) {
              // Handle content as string or array
              if (typeof entry.message.content === 'string') {
                // Simple string content
                if (entry.message.content.trim()) {
                  messages.push({
                    uuid: entry.uuid,
                    role,
                    content: entry.message.content,
                    timestamp,
                    type: 'text',
                  });
                }
              } else if (Array.isArray(entry.message.content)) {
                // Array of content blocks
                for (const content of entry.message.content) {
                  if (content.type === 'text' && content.text) {
                    messages.push({
                      uuid: entry.uuid,
                      role,
                      content: content.text,
                      timestamp,
                      type: 'text',
                    });
                  } else if (content.type === 'thinking' && content.thinking) {
                    messages.push({
                      uuid: entry.uuid,
                      role,
                      content: content.thinking,
                      timestamp,
                      type: 'thinking',
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }

      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);

      console.log(`[SessionsService] Loaded ${messages.length} messages for ${sessionId}`);

      return messages;
    } catch (error) {
      console.error(`[SessionsService] Error loading conversation for ${sessionId}:`, error);
      return messages;
    }
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

  // Scan projects directory to discover sessions not in history.jsonl
  private async scanProjectsDirectory(
    sessions: Map<string, Session>,
    projects: Map<string, Project>
  ): Promise<void> {
    try {
      // Check if projects directory exists
      try {
        await fs.access(this.projectsDir);
      } catch {
        console.log('[SessionsService] Projects directory does not exist');
        return;
      }

      // Get all project directories
      const projectDirs = await fs.readdir(this.projectsDir, { withFileTypes: true });

      for (const dir of projectDirs) {
        if (!dir.isDirectory()) continue;

        const projectSlug = dir.name;
        const projectFullPath = path.join(this.projectsDir, projectSlug);

        // Get all jsonl files in this project directory
        const files = await fs.readdir(projectFullPath);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl') && !f.includes('subagents'));

        for (const file of jsonlFiles) {
          const sessionId = file.replace('.jsonl', '');

          // Skip if session already loaded from history.jsonl
          if (sessions.has(sessionId)) continue;

          // Read first line to get session info and extract actual project path
          const filePath = path.join(projectFullPath, file);
          const sessionInfo = await this.getSessionInfoFromFile(filePath, sessionId);

          if (sessionInfo) {
            // Try to get the actual project path from the file content, or use slug-based path
            const actualProjectPath = sessionInfo.projectPath || this.projectSlugToPath(projectSlug);
            const normalizedProjectPath = this.normalizePath(actualProjectPath);

            // Create session
            const session: Session = {
              id: sessionId,
              sessionId: sessionId,
              project: normalizedProjectPath,
              projectSlug: projectSlug,
              inputs: [],
              messages: [],
              createdAt: sessionInfo.timestamp,
              updatedAt: sessionInfo.timestamp,
              inputCount: sessionInfo.inputCount,
              messageCount: sessionInfo.messageCount,
            };
            sessions.set(sessionId, session);

            // Update project info - use normalized path as key
            let project = projects.get(normalizedProjectPath);
            if (!project) {
              project = {
                name: path.basename(normalizedProjectPath) || projectSlug,
                path: normalizedProjectPath,
                sessionCount: 0,
                lastActive: sessionInfo.timestamp,
              };
              projects.set(normalizedProjectPath, project);
            }
            project.sessionCount++;
            project.lastActive = Math.max(project.lastActive, sessionInfo.timestamp);

            console.log(`[SessionsService] Found session ${sessionId} in ${normalizedProjectPath}`);
          }
        }
      }

      console.log(`[SessionsService] Scanned projects directory, found ${sessions.size} total sessions, ${projects.size} projects`);
    } catch (error) {
      console.error('[SessionsService] Error scanning projects directory:', error);
    }
  }

  // Get session info from a jsonl file
  private async getSessionInfoFromFile(
    filePath: string,
    sessionId: string
  ): Promise<{ timestamp: number; inputCount: number; messageCount: number; projectPath?: string } | null> {
    try {
      const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let firstTimestamp: number | null = null;
      let lastTimestamp: number | null = null;
      let inputCount = 0;
      let messageCount = 0;
      let projectPath: string | undefined;

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry: ConversationMessage = JSON.parse(line);

          // Extract project path from the first user message if available
          if (!projectPath && entry.project) {
            projectPath = entry.project;
          }

          if (entry.timestamp) {
            const ts = new Date(entry.timestamp).getTime();
            if (!firstTimestamp || ts < firstTimestamp) {
              firstTimestamp = ts;
            }
            if (!lastTimestamp || ts > lastTimestamp) {
              lastTimestamp = ts;
            }
          }

          if (entry.type === 'user') {
            inputCount++;
            messageCount++;
          } else if (entry.type === 'assistant' && entry.message) {
            messageCount++;
          }
        } catch {
          // Skip invalid lines
        }
      }

      if (firstTimestamp) {
        return {
          timestamp: lastTimestamp || firstTimestamp,
          inputCount,
          messageCount,
          projectPath,
        };
      }

      return null;
    } catch (error) {
      console.error(`[SessionsService] Error reading session file ${filePath}:`, error);
      return null;
    }
  }

  // Convert project slug back to approximate path
  private projectSlugToPath(slug: string): string {
    if (!slug || slug === 'unknown') return 'unknown';

    // If it starts with a single letter followed by dash, it was likely a Windows drive
    if (/^[a-zA-Z]-/.test(slug)) {
      const drive = slug[0].toUpperCase();
      const rest = slug.substring(2).replace(/-/g, '\\');
      return `${drive}:\\${rest}`;
    }

    // If it starts with a dash followed by a letter, it was likely a Unix absolute path
    if (/^-[a-zA-Z]/.test(slug)) {
      return slug.substring(1).replace(/-/g, '/');
    }

    // Otherwise treat as relative path (replace dashes with slashes)
    return slug.replace(/-/g, '/');
  }

  // Normalize path to canonical form for consistent comparison
  private normalizePath(projectPath: string): string {
    if (!projectPath || projectPath === 'unknown') return 'unknown';

    // Normalize multiple backslashes to single backslash
    let normalized = projectPath.replace(/\\+/g, '\\');

    // Normalize forward slashes to backslash on Windows (if drive letter present)
    if (/^[a-zA-Z]:/.test(normalized) || /^[a-zA-Z]\//.test(normalized)) {
      normalized = normalized.replace(/\//g, '\\');
      // Ensure drive letter has colon
      if (/^[a-zA-Z]\\/.test(normalized)) {
        normalized = normalized[0] + ':' + normalized.slice(1);
      }
    }

    // Ensure Windows drive letter is uppercase for consistency
    if (/^[a-z]:/.test(normalized)) {
      normalized = normalized[0].toUpperCase() + normalized.slice(1);
    }

    return normalized;
  }

  // Generate project slug from path
  private generateProjectSlug(projectPath: string): string {
    const normalized = this.normalizePath(projectPath);

    return normalized
      .replace(/:/g, '-')  // Replace : with -
      .replace(/[\\\/]/g, '-')  // Replace \ and / with -
      .toLowerCase();
  }
}
