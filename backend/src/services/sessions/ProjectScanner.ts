import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { Session, Project, ConversationMessage, SessionInput, ContentBlock } from '../../types';
import { normalizePath, projectSlugToPath } from './PathUtils';
import type { SessionCache } from './SessionCache';

export interface ProjectScannerDependencies {
  projectsDir: string;
  cache: SessionCache;
}

export interface SessionInfo {
  timestamp: number;
  inputCount: number;
  messageCount: number;
  projectPath?: string;
  inputs: SessionInput[];
}

export interface ScanResult {
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
}

/**
 * Scans projects directory to discover sessions not in history.jsonl
 */
export class ProjectScanner {
  private projectsDir: string;
  private cache: SessionCache;

  constructor(deps: ProjectScannerDependencies) {
    this.projectsDir = deps.projectsDir;
    this.cache = deps.cache;
  }

  /**
   * Incremental scan - only scan changed files
   */
  async scanProjectsDirectoryIncremental(
    sessions: Map<string, Session>,
    projects: Map<string, Project>
  ): Promise<ScanResult> {
    const result: ScanResult = { added: 0, updated: 0, removed: 0, unchanged: 0 };

    try {
      // Check if projects directory exists
      try {
        await fs.access(this.projectsDir);
      } catch {
        console.log('[ProjectScanner] Projects directory does not exist');
        return result;
      }

      const currentFiles = new Set<string>();

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
          const filePath = path.join(projectFullPath, file);
          currentFiles.add(filePath);

          // Get file stats
          const stats = await fs.stat(filePath);
          const mtime = Math.floor(stats.mtimeMs);

          // Check if file is dirty (modified since last scan)
          if (!this.cache.isFileDirty(filePath, mtime, stats.size)) {
            result.unchanged++;
            continue;
          }

          // File is new or modified - read it
          const sessionInfo = await this.getSessionInfoFromFile(filePath, sessionId);

          if (sessionInfo) {
            const actualProjectPath = sessionInfo.projectPath || projectSlugToPath(projectSlug);
            const normalizedProjectPath = normalizePath(actualProjectPath);

            // Check if this is a new session or update
            const isNew = !sessions.has(sessionId);

            // Create/update session - preserve existing data if available
            const existingSession = sessions.get(sessionId);
            const session: Session = {
              id: sessionId,
              sessionId: sessionId,
              project: normalizedProjectPath,
              projectSlug: projectSlug,
              inputs: sessionInfo.inputs,
              messages: existingSession?.messages || [], // Preserve loaded messages
              createdAt: sessionInfo.timestamp,
              updatedAt: sessionInfo.timestamp,
              inputCount: sessionInfo.inputCount,
              messageCount: sessionInfo.messageCount,
            };
            sessions.set(sessionId, session);

            // Update project info
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
            project.lastActive = Math.max(project.lastActive, sessionInfo.timestamp);

            // Update file cache
            this.cache.setFileCache(filePath, { mtime, size: stats.size });

            if (isNew) {
              result.added++;
            } else {
              result.updated++;
            }
          }
        }
      }

      // Remove deleted sessions from cache
      const cachedFiles = this.cache.getCachedFilePaths();
      for (const filePath of cachedFiles) {
        if (!currentFiles.has(filePath)) {
          // File was deleted - remove from sessions
          const fileName = path.basename(filePath, '.jsonl');
          if (sessions.has(fileName)) {
            sessions.delete(fileName);
            this.cache.removeFileCache(filePath);
            result.removed++;
          }
        }
      }

      // Recalculate session counts for all projects
      for (const project of projects.values()) {
        project.sessionCount = 0;
      }
      for (const session of sessions.values()) {
        const project = projects.get(session.project);
        if (project) {
          project.sessionCount++;
        }
      }

      // Update last scan time
      this.cache.setLastScanTime(Date.now());

      console.log(`[ProjectScanner] Incremental scan: +${result.added}, ~${result.updated}, -${result.removed}, =${result.unchanged}`);

      return result;
    } catch (error) {
      console.error('[ProjectScanner] Error during incremental scan:', error);
      return result;
    }
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

            // console.log(`[ProjectScanner] Found session ${sessionId} in ${normalizedProjectPath}`);
          }
        }
      }

      // console.log(`[ProjectScanner] Scanned projects directory, found ${sessions.size} total sessions, ${projects.size} projects`);
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

          // Count all valid messages
          if (entry.message) {
            messageCount++;

            // Handle user messages
            if (entry.type === 'user' || entry.message?.role === 'user') {
              inputCount++;

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
            }
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
}
