import { createReadStream } from 'fs';
import readline from 'readline';
import type { HistoryEntry, Session, SessionInput, Project } from '../../types';
import { normalizePath, generateProjectSlug } from './PathUtils';

export interface SessionLoaderDependencies {
  historyFilePath: string;
}

/**
 * Loads sessions from history.jsonl file
 */
export class SessionLoader {
  private historyFilePath: string;

  constructor(deps: SessionLoaderDependencies) {
    this.historyFilePath = deps.historyFilePath;
  }

  /**
   * Load sessions from history.jsonl file
   */
  async loadSessions(): Promise<{
    sessions: Map<string, Session>;
    projects: Map<string, Project>;
  }> {
    const sessions = new Map<string, Session>();
    const projects = new Map<string, Project>();

    try {
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
          const timestampMs = entry.timestamp > 10000000000 ? entry.timestamp : entry.timestamp * 1000;

          // Get or create session
          let session = sessions.get(entry.sessionId);
          if (!session) {
            const projectPath = normalizePath(entry.project || 'unknown');
            session = {
              id: entry.sessionId,
              sessionId: entry.sessionId,
              project: projectPath,
              projectSlug: generateProjectSlug(projectPath),
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
          // Each history entry represents one user input (messageCount = inputCount for history entries)
          session.messageCount = session.inputCount;
          if (timestampMs < session.createdAt) {
            session.createdAt = timestampMs;
          }
          if (timestampMs > session.updatedAt) {
            session.updatedAt = timestampMs;
          }

          // Update project info
          const projectPath = normalizePath(entry.project || 'unknown');
          let project = projects.get(projectPath);
          if (!project) {
            project = {
              name: projectPath.split(/[/\\]/).pop() || 'unknown',
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

      return { sessions, projects };
    } catch (error) {
      console.error('[SessionLoader] Error loading sessions:', error);
      return { sessions, projects };
    }
  }
}
