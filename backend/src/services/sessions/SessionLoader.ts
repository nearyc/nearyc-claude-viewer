import { createReadStream, stat } from 'fs';
import readline from 'readline';
import { promisify } from 'util';
import type { HistoryEntry, Session, SessionInput, Project } from '../../types';
import { normalizePath, generateProjectSlug } from './PathUtils';

const statAsync = promisify(stat);

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

  /**
   * Incrementally load new sessions from history.jsonl file
   * starting from the last read position
   */
  async loadIncremental(
    existingSessions: Map<string, Session>,
    existingProjects: Map<string, Project>,
    lastPosition: number
  ): Promise<{
    sessions: Map<string, Session>;
    projects: Map<string, Project>;
    newPosition: number;
  }> {
    try {
      const fileStats = await statAsync(this.historyFilePath);
      const fileSize = fileStats.size;

      // No new content
      if (lastPosition >= fileSize) {
        return {
          sessions: existingSessions,
          projects: existingProjects,
          newPosition: fileSize,
        };
      }

      // File was truncated/cleared, reload from beginning
      if (lastPosition > fileSize) {
        console.log('[SessionLoader] File truncated, reloading from beginning');
        const result = await this.loadSessions();
        return {
          sessions: result.sessions,
          projects: result.projects,
          newPosition: fileSize,
        };
      }

      const newEntries = await this.readNewEntries(lastPosition, fileSize);
      this.processEntries(newEntries, existingSessions, existingProjects);

      console.log(
        `[SessionLoader] Incremental load: ${fileSize - lastPosition} bytes, ${newEntries.length} new entries`
      );

      return {
        sessions: existingSessions,
        projects: existingProjects,
        newPosition: fileSize,
      };
    } catch (error) {
      console.error('[SessionLoader] Error in incremental load:', error);
      return {
        sessions: existingSessions,
        projects: existingProjects,
        newPosition: lastPosition,
      };
    }
  }

  private async readNewEntries(
    startPosition: number,
    endPosition: number
  ): Promise<HistoryEntry[]> {
    const entries: HistoryEntry[] = [];

    const fileStream = createReadStream(this.historyFilePath, {
      encoding: 'utf-8',
      start: startPosition,
      end: endPosition - 1,
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const entry: HistoryEntry = JSON.parse(line);
        if (entry.sessionId && entry.timestamp) {
          entries.push(entry);
        }
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }

    return entries;
  }

  private processEntries(
    entries: HistoryEntry[],
    sessions: Map<string, Session>,
    projects: Map<string, Project>
  ): void {
    for (const entry of entries) {
      const timestampMs =
        entry.timestamp > 10000000000 ? entry.timestamp : entry.timestamp * 1000;

      const session = this.getOrCreateSession(sessions, entry, timestampMs);

      const input: SessionInput = {
        display: entry.display || '',
        timestamp: timestampMs,
      };
      session.inputs.push(input);

      session.inputCount = session.inputs.length;
      session.createdAt = Math.min(session.createdAt, timestampMs);
      session.updatedAt = Math.max(session.updatedAt, timestampMs);

      this.updateProject(projects, entry, timestampMs);
    }

    // Sort inputs within each session by timestamp
    for (const session of sessions.values()) {
      session.inputs.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Recalculate session counts for affected projects
    const projectSessionCounts = new Map<string, number>();
    for (const session of sessions.values()) {
      const count = projectSessionCounts.get(session.project) || 0;
      projectSessionCounts.set(session.project, count + 1);
    }
    for (const [projectPath, count] of projectSessionCounts) {
      const project = projects.get(projectPath);
      if (project) {
        project.sessionCount = count;
      }
    }
  }

  private getOrCreateSession(
    sessions: Map<string, Session>,
    entry: HistoryEntry,
    timestampMs: number
  ): Session {
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
    return session;
  }

  private updateProject(
    projects: Map<string, Project>,
    entry: HistoryEntry,
    timestampMs: number
  ): void {
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
  }
}
