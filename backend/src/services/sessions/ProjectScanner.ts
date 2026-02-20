import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { Session, Project, ConversationMessage, SessionInput, ContentBlock } from '../../types';
import { normalizePath, projectSlugToPath } from './PathUtils';

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
}
