import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { SessionsService } from './sessionsService';
import type { TeamsService } from './teamsService';
import type { ConversationMessage, RawInboxMessage } from '../types';

export interface SearchResult {
  type: 'session' | 'team_message';
  id: string;
  title: string;
  snippet: string;
  timestamp: number;
  project?: string;
}

export interface SearchOptions {
  query: string;
  type?: 'session' | 'team_message' | 'all';
  limit?: number;
}

export class SearchService {
  private sessionsService: SessionsService;
  private teamsService: TeamsService;
  private projectsDir: string;
  private teamsDir: string;

  constructor(
    sessionsService: SessionsService,
    teamsService: TeamsService,
    historyFilePath: string,
    teamsDir: string
  ) {
    this.sessionsService = sessionsService;
    this.teamsService = teamsService;
    this.projectsDir = path.join(path.dirname(historyFilePath), 'projects');
    this.teamsDir = teamsDir;
  }

  // Main search function
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, type = 'all', limit = 50 } = options;
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return [];
    }

    const results: SearchResult[] = [];

    try {
      // Search sessions
      if (type === 'all' || type === 'session') {
        const sessionResults = await this.searchSessions(lowerQuery, limit);
        results.push(...sessionResults);
      }

      // Search team messages
      if (type === 'all' || type === 'team_message') {
        const teamResults = await this.searchTeamMessages(lowerQuery, limit);
        results.push(...teamResults);
      }

      // Sort by timestamp (newest first) and apply limit
      return results
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('[SearchService] Error during search:', error);
      return results;
    }
  }

  // Search in session messages
  private async searchSessions(query: string, limit: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // Get all sessions first
      const sessions = await this.sessionsService.getSessions();

      // Search in session inputs (from history)
      for (const session of sessions) {
        // Check session ID
        if (session.sessionId.toLowerCase().includes(query)) {
          results.push({
            type: 'session',
            id: session.sessionId,
            title: `Session: ${session.sessionId}`,
            snippet: this.generateSnippet(session.inputs.map(i => i.display).join(' '), query),
            timestamp: session.updatedAt,
            project: session.project,
          });
          continue;
        }

        // Check project name
        if (session.project.toLowerCase().includes(query)) {
          results.push({
            type: 'session',
            id: session.sessionId,
            title: `Project: ${path.basename(session.project)}`,
            snippet: this.generateSnippet(session.inputs.map(i => i.display).join(' '), query),
            timestamp: session.updatedAt,
            project: session.project,
          });
          continue;
        }

        // Check inputs
        const matchingInput = session.inputs.find(input =>
          input.display.toLowerCase().includes(query)
        );

        if (matchingInput) {
          results.push({
            type: 'session',
            id: session.sessionId,
            title: `Session: ${session.sessionId}`,
            snippet: this.generateSnippet(matchingInput.display, query),
            timestamp: matchingInput.timestamp,
            project: session.project,
          });
          continue;
        }

        // Search in full conversation files
        const conversationResults = await this.searchSessionConversation(
          session.sessionId,
          session.project,
          query
        );

        if (conversationResults) {
          results.push({
            type: 'session',
            id: session.sessionId,
            title: `Session: ${session.sessionId}`,
            snippet: conversationResults.snippet,
            timestamp: conversationResults.timestamp,
            project: session.project,
          });
        }

        if (results.length >= limit) {
          break;
        }
      }
    } catch (error) {
      console.error('[SearchService] Error searching sessions:', error);
    }

    return results;
  }

  // Search in a specific session's conversation file
  private async searchSessionConversation(
    sessionId: string,
    projectPath: string,
    query: string
  ): Promise<{ snippet: string; timestamp: number } | null> {
    try {
      const projectSlug = this.generateProjectSlug(projectPath);
      const conversationFile = path.join(this.projectsDir, projectSlug, `${sessionId}.jsonl`);

      // Check if file exists
      try {
        await fs.access(conversationFile);
      } catch {
        return null;
      }

      const fileStream = createReadStream(conversationFile, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let lastMatch: { snippet: string; timestamp: number } | null = null;

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry: ConversationMessage = JSON.parse(line);

          if (entry.message?.content) {
            let content = '';

            if (typeof entry.message.content === 'string') {
              content = entry.message.content;
            } else if (Array.isArray(entry.message.content)) {
              content = entry.message.content
                .filter(c => c.type === 'text' || c.type === 'thinking')
                .map(c => c.text || c.thinking || '')
                .join(' ');
            }

            if (content.toLowerCase().includes(query)) {
              const timestamp = new Date(entry.timestamp).getTime();
              lastMatch = {
                snippet: this.generateSnippet(content, query),
                timestamp,
              };
            }
          }
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }

      return lastMatch;
    } catch (error) {
      console.error(`[SearchService] Error searching conversation for ${sessionId}:`, error);
      return null;
    }
  }

  // Search in team messages
  private async searchTeamMessages(query: string, limit: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // Get all teams
      const teams = await this.teamsService.getTeams();

      for (const team of teams) {
        // Check team name
        if (team.name.toLowerCase().includes(query)) {
          results.push({
            type: 'team_message',
            id: team.id,
            title: `Team: ${team.name}`,
            snippet: `Team with ${team.memberCount} members`,
            timestamp: team.updatedAt,
          });
        }

        // Search in member messages
        for (const member of team.members) {
          const messages = await this.searchMemberMessages(
            team.id,
            member.name,
            query
          );

          for (const msg of messages) {
            results.push({
              type: 'team_message',
              id: `${team.id}/${member.name}/${msg.id}`,
              title: `${team.name} - ${member.name}`,
              snippet: msg.snippet,
              timestamp: msg.timestamp,
            });

            if (results.length >= limit) {
              return results;
            }
          }
        }
      }
    } catch (error) {
      console.error('[SearchService] Error searching team messages:', error);
    }

    return results;
  }

  // Search in a specific member's inbox
  private async searchMemberMessages(
    teamId: string,
    memberName: string,
    query: string
  ): Promise<Array<{ id: string; snippet: string; timestamp: number }>> {
    const results: Array<{ id: string; snippet: string; timestamp: number }> = [];

    try {
      const inboxPath = path.join(this.teamsDir, teamId, 'inboxes', `${memberName}.json`);

      // Check if file exists
      try {
        await fs.access(inboxPath);
      } catch {
        return results;
      }

      const data = await fs.readFile(inboxPath, 'utf-8');
      const messages: RawInboxMessage[] = JSON.parse(data);

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.text.toLowerCase().includes(query)) {
          const timestamp = typeof msg.timestamp === 'string'
            ? new Date(msg.timestamp).getTime()
            : msg.timestamp || Date.now();

          results.push({
            id: msg.id || `${i}`,
            snippet: this.generateSnippet(msg.text, query),
            timestamp,
          });
        }
      }
    } catch (error) {
      console.error(`[SearchService] Error searching messages for ${teamId}/${memberName}:`, error);
    }

    return results;
  }

  // Generate a snippet around the matched query
  private generateSnippet(text: string, query: string, maxLength: number = 150): string {
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(query);

    if (index === -1) {
      // Query not found, return beginning of text
      return text.length > maxLength
        ? text.substring(0, maxLength - 3) + '...'
        : text;
    }

    const contextLength = Math.floor((maxLength - query.length) / 2);
    let start = Math.max(0, index - contextLength);
    let end = Math.min(text.length, index + query.length + contextLength);

    // Adjust to not cut words
    if (start > 0) {
      const nextSpace = text.indexOf(' ', start);
      if (nextSpace !== -1 && nextSpace < index) {
        start = nextSpace + 1;
      }
    }

    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > index + query.length) {
        end = lastSpace;
      }
    }

    let snippet = text.substring(start, end);

    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < text.length) {
      snippet = snippet + '...';
    }

    return snippet;
  }

  // Generate project slug from path (same logic as sessionsService)
  private generateProjectSlug(projectPath: string): string {
    if (!projectPath || projectPath === 'unknown') return 'unknown';

    const normalized = projectPath
      .replace(/:/g, '-')
      .replace(/[\\\/]/g, '-')
      .toLowerCase();

    return normalized;
  }
}
