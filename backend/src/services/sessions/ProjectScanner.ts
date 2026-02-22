import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { Session, Project, ConversationMessage, SessionInput, ContentBlock } from '../../types';
import { normalizePath, projectSlugToPath } from './PathUtils';
import type { FileCacheEntry } from './SessionCache';

export interface ProjectScannerDependencies {
  projectsDir: string;
}

export interface SessionInfo {
  timestamp: number;
  inputCount: number;
  messageCount: number;
  projectPath?: string;
  inputs: SessionInput[];
}

export interface IncrementalScanResult {
  updated: boolean;
  updatedSessions: string[];
  deletedSessions: string[];
}

/**
 * Scans projects directory to discover sessions not in history.jsonl
 */
export class ProjectScanner {
  private projectsDir: string;

  constructor(deps: ProjectScannerDependencies) {
    this.projectsDir = deps.projectsDir;
  }

  /**
   * Scan projects directory and add discovered sessions
   */
  async scanProjectsDirectory(
    sessions: Map<string, Session>,
    projects: Map<string, Project>
  ): Promise<void> {
    try {
      // Check if projects directory exists
      try {
        await fs.access(this.projectsDir);
      } catch {
        console.log('[ProjectScanner] Projects directory does not exist');
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
            const actualProjectPath = sessionInfo.projectPath || projectSlugToPath(projectSlug);
            const normalizedProjectPath = normalizePath(actualProjectPath);

            // Create session
            const session: Session = {
              id: sessionId,
              sessionId: sessionId,
              project: normalizedProjectPath,
              projectSlug: projectSlug,
              inputs: sessionInfo.inputs,
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
                name: normalizedProjectPath.split(/[/\\]/).pop() || projectSlug,
                path: normalizedProjectPath,
                sessionCount: 0,
                lastActive: sessionInfo.timestamp,
              };
              projects.set(normalizedProjectPath, project);
            }
            project.sessionCount++;
            project.lastActive = Math.max(project.lastActive, sessionInfo.timestamp);

            console.log(`[ProjectScanner] Found session ${sessionId} in ${normalizedProjectPath}`);
          }
        }
      }

      console.log(`[ProjectScanner] Scanned projects directory, found ${sessions.size} total sessions, ${projects.size} projects`);
    } catch (error) {
      console.error('[ProjectScanner] Error scanning projects directory:', error);
    }
  }

  /**
   * Get session info from a jsonl file
   */
  private async getSessionInfoFromFile(
    filePath: string,
    sessionId: string
  ): Promise<SessionInfo | null> {
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
      const inputs: SessionInput[] = [];

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

            // Extract user input text from message content
            let displayText = '';
            if (entry.message?.content) {
              if (typeof entry.message.content === 'string') {
                displayText = entry.message.content;
              } else if (Array.isArray(entry.message.content)) {
                // Handle array of content blocks
                const textParts: string[] = [];
                for (const block of entry.message.content) {
                  const contentBlock = block as ContentBlock;
                  if (contentBlock.type === 'text' && contentBlock.text) {
                    textParts.push(contentBlock.text);
                  }
                }
                displayText = textParts.join(' ');
              }
            }

            // Only add non-empty inputs
            if (displayText.trim()) {
              inputs.push({
                display: displayText,
                timestamp: entry.timestamp ? new Date(entry.timestamp).getTime() : Date.now(),
              });
            }
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
          inputs,
        };
      }

      return null;
    } catch (error) {
      console.error(`[ProjectScanner] Error reading session file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get file stats (mtime and size)
   */
  private async getFileStats(filePath: string): Promise<FileCacheEntry | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        mtime: Math.floor(stats.mtimeMs),
        size: stats.size,
      };
    } catch {
      return null;
    }
  }

  /**
   * Collect all current .jsonl files in projects directory
   */
  private async collectCurrentFiles(): Promise<Map<string, { filePath: string; projectSlug: string }>> {
    const currentFiles = new Map<string, { filePath: string; projectSlug: string }>();

    try {
      await fs.access(this.projectsDir);
    } catch {
      return currentFiles;
    }

    try {
      const projectDirs = await fs.readdir(this.projectsDir, { withFileTypes: true });

      for (const dir of projectDirs) {
        if (!dir.isDirectory()) continue;

        const projectSlug = dir.name;
        const projectFullPath = path.join(this.projectsDir, projectSlug);

        try {
          const files = await fs.readdir(projectFullPath);
          const jsonlFiles = files.filter(f => f.endsWith('.jsonl') && !f.includes('subagents'));

          for (const file of jsonlFiles) {
            const sessionId = file.replace('.jsonl', '');
            const filePath = path.join(projectFullPath, file);
            currentFiles.set(sessionId, { filePath, projectSlug });
          }
        } catch {
          // Skip directories we can't read
        }
      }
    } catch {
      // Return empty map on error
    }

    return currentFiles;
  }

  /**
   * Check if file has changed compared to cache
   */
  private hasFileChanged(
    cached: FileCacheEntry | undefined,
    current: FileCacheEntry
  ): boolean {
    if (!cached) return true;
    return cached.mtime !== current.mtime || cached.size !== current.size;
  }

  /**
   * Create a session from file info
   */
  private async createSessionFromFile(
    sessionId: string,
    filePath: string,
    projectSlug: string
  ): Promise<Session | null> {
    const sessionInfo = await this.getSessionInfoFromFile(filePath, sessionId);
    if (!sessionInfo) return null;

    const actualProjectPath = sessionInfo.projectPath || projectSlugToPath(projectSlug);
    const normalizedProjectPath = normalizePath(actualProjectPath);

    return {
      id: sessionId,
      sessionId: sessionId,
      project: normalizedProjectPath,
      projectSlug: projectSlug,
      inputs: sessionInfo.inputs,
      messages: [],
      createdAt: sessionInfo.timestamp,
      updatedAt: sessionInfo.timestamp,
      inputCount: sessionInfo.inputCount,
      messageCount: sessionInfo.messageCount,
    };
  }

  /**
   * Update project statistics
   */
  private updateProjectStats(
    projects: Map<string, Project>,
    session: Session
  ): void {
    let project = projects.get(session.project);
    if (!project) {
      project = {
        name: session.project.split(/[/\\]/).pop() || session.projectSlug,
        path: session.project,
        sessionCount: 0,
        lastActive: session.createdAt,
      };
      projects.set(session.project, project);
    }
    project.sessionCount++;
    project.lastActive = Math.max(project.lastActive, session.updatedAt);
  }

  /**
   * Decrement project session count and remove if empty
   */
  private decrementProjectStats(
    projects: Map<string, Project>,
    session: Session
  ): void {
    const project = projects.get(session.project);
    if (!project) return;

    project.sessionCount = Math.max(0, project.sessionCount - 1);

    if (project.sessionCount === 0) {
      projects.delete(session.project);
    }
  }

  /**
   * Incremental scan: only process changed files
   */
  async scanIncremental(
    sessions: Map<string, Session>,
    projects: Map<string, Project>,
    fileCache: Map<string, FileCacheEntry>
  ): Promise<IncrementalScanResult> {
    const updatedSessions: string[] = [];
    const deletedSessions: string[] = [];

    // Collect current files on disk
    const currentFiles = await this.collectCurrentFiles();

    // Track which cached files still exist
    const processedFiles = new Set<string>();

    // Process current files (add or update)
    for (const [sessionId, { filePath, projectSlug }] of currentFiles) {
      processedFiles.add(filePath);

      const currentStats = await this.getFileStats(filePath);
      if (!currentStats) continue;

      const cachedStats = fileCache.get(filePath);
      const hasChanged = this.hasFileChanged(cachedStats, currentStats);
      const isNew = !cachedStats;

      if (hasChanged) {
        // Read file and create/update session
        const session = await this.createSessionFromFile(sessionId, filePath, projectSlug);

        if (session) {
          // If updating existing session, update project stats
          const existingSession = sessions.get(sessionId);
          if (existingSession) {
            this.decrementProjectStats(projects, existingSession);
          }

          sessions.set(sessionId, session);
          this.updateProjectStats(projects, session);
          updatedSessions.push(sessionId);

          // Update file cache
          fileCache.set(filePath, currentStats);

          if (isNew) {
            console.log(`[ProjectScanner] Added new session ${sessionId}`);
          } else {
            console.log(`[ProjectScanner] Updated session ${sessionId}`);
          }
        }
      }
    }

    // Find deleted files (in cache but not on disk)
    for (const [filePath, cachedEntry] of fileCache) {
      if (processedFiles.has(filePath)) continue;

      // Find session ID from file path
      const sessionId = path.basename(filePath, '.jsonl');
      const existingSession = sessions.get(sessionId);

      if (existingSession) {
        // Remove session
        this.decrementProjectStats(projects, existingSession);
        sessions.delete(sessionId);
        deletedSessions.push(sessionId);
        console.log(`[ProjectScanner] Removed deleted session ${sessionId}`);
      }

      // Remove from file cache
      fileCache.delete(filePath);
    }

    const updated = updatedSessions.length > 0 || deletedSessions.length > 0;

    console.log(
      `[ProjectScanner] Incremental scan: ${updatedSessions.length} added/updated, ${deletedSessions.length} deleted`
    );

    return {
      updated,
      updatedSessions,
      deletedSessions,
    };
  }
}
