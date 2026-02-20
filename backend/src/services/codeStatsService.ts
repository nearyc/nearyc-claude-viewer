import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import type { SessionsService } from './sessionsService';
import type { TeamsService } from './TeamsService';
import type { ConversationMessage, RawInboxMessage } from '../types';

export interface CodeStats {
  totalLines: number;
  byLanguage: { [lang: string]: number };
  byProject: { [project: string]: number };
  dailyTrend: { date: string; lines: number }[];
}

interface CodeBlock {
  language: string;
  lines: number;
  timestamp: number;
  project?: string;
}

export class CodeStatsService {
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

  // Get code statistics
  async getCodeStats(days: number = 30): Promise<CodeStats> {
    const codeBlocks: CodeBlock[] = [];

    try {
      // Collect code blocks from sessions
      await this.collectSessionCodeBlocks(codeBlocks, days);

      // Collect code blocks from team messages
      await this.collectTeamCodeBlocks(codeBlocks, days);

      // Calculate statistics
      return this.calculateStats(codeBlocks, days);
    } catch (error) {
      console.error('[CodeStatsService] Error getting code stats:', error);
      return {
        totalLines: 0,
        byLanguage: {},
        byProject: {},
        dailyTrend: [],
      };
    }
  }

  // Collect code blocks from session conversations
  private async collectSessionCodeBlocks(codeBlocks: CodeBlock[], days: number): Promise<void> {
    try {
      const sessions = await this.sessionsService.getSessions();
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

      for (const session of sessions) {
        // Skip if session is too old
        if (session.updatedAt < cutoffTime) {
          continue;
        }

        const projectSlug = this.generateProjectSlug(session.project);
        const conversationFile = path.join(this.projectsDir, projectSlug, `${session.sessionId}.jsonl`);

        try {
          await fs.access(conversationFile);
        } catch {
          continue;
        }

        const fileStream = createReadStream(conversationFile, { encoding: 'utf-8' });
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });

        for await (const line of rl) {
          if (!line.trim()) continue;

          try {
            const entry: ConversationMessage = JSON.parse(line);

            if (entry.message?.content && entry.timestamp) {
              const timestamp = new Date(entry.timestamp).getTime();

              // Skip if message is too old
              if (timestamp < cutoffTime) {
                continue;
              }

              let content = '';

              if (typeof entry.message.content === 'string') {
                content = entry.message.content;
              } else if (Array.isArray(entry.message.content)) {
                content = entry.message.content
                  .filter(c => c.type === 'text' || c.type === 'thinking')
                  .map(c => c.text || c.thinking || '')
                  .join(' ');
              }

              const blocks = this.extractCodeBlocks(content);
              for (const block of blocks) {
                codeBlocks.push({
                  language: block.language,
                  lines: block.lines,
                  timestamp,
                  project: session.project,
                });
              }
            }
          } catch {
            continue;
          }
        }
      }
    } catch (error) {
      console.error('[CodeStatsService] Error collecting session code blocks:', error);
    }
  }

  // Collect code blocks from team messages
  private async collectTeamCodeBlocks(codeBlocks: CodeBlock[], days: number): Promise<void> {
    try {
      const teams = await this.teamsService.getTeams();
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

      for (const team of teams) {
        for (const member of team.members) {
          const inboxPath = path.join(this.teamsDir, team.id, 'inboxes', `${member.name}.json`);

          try {
            await fs.access(inboxPath);
          } catch {
            continue;
          }

          const data = await fs.readFile(inboxPath, 'utf-8');
          const messages: RawInboxMessage[] = JSON.parse(data);

          for (const msg of messages) {
            const timestamp = typeof msg.timestamp === 'string'
              ? new Date(msg.timestamp).getTime()
              : msg.timestamp || Date.now();

            // Skip if message is too old
            if (timestamp < cutoffTime) {
              continue;
            }

            const blocks = this.extractCodeBlocks(msg.text);
            for (const block of blocks) {
              codeBlocks.push({
                language: block.language,
                lines: block.lines,
                timestamp,
                project: `team:${team.name}`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[CodeStatsService] Error collecting team code blocks:', error);
    }
  }

  // Extract code blocks from text content
  private extractCodeBlocks(content: string): Array<{ language: string; lines: number }> {
    const blocks: Array<{ language: string; lines: number }> = [];

    // Match code blocks with language specifier: ```language\ncode\n```
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];
      const lines = code.split('\n').filter(line => line.trim().length > 0).length;

      if (lines > 0) {
        blocks.push({
          language: language.toLowerCase(),
          lines,
        });
      }
    }

    return blocks;
  }

  // Calculate statistics from code blocks
  private calculateStats(codeBlocks: CodeBlock[], days: number): CodeStats {
    const byLanguage: { [lang: string]: number } = {};
    const byProject: { [project: string]: number } = {};
    const dailyMap = new Map<string, number>();

    // Initialize all days with zero
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = this.formatDate(date);
      dailyMap.set(dateStr, 0);
    }

    let totalLines = 0;

    for (const block of codeBlocks) {
      totalLines += block.lines;

      // Aggregate by language
      byLanguage[block.language] = (byLanguage[block.language] || 0) + block.lines;

      // Aggregate by project
      if (block.project) {
        byProject[block.project] = (byProject[block.project] || 0) + block.lines;
      }

      // Aggregate by date
      const dateStr = this.formatDate(new Date(block.timestamp));
      if (dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + block.lines);
      }
    }

    // Convert daily map to sorted array
    const dailyTrend = Array.from(dailyMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, lines]) => ({ date, lines }));

    return {
      totalLines,
      byLanguage,
      byProject,
      dailyTrend,
    };
  }

  // Format date as YYYY-MM-DD
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Generate project slug from path
  private generateProjectSlug(projectPath: string): string {
    if (!projectPath || projectPath === 'unknown') return 'unknown';

    return projectPath
      .replace(/:/g, '-')
      .replace(/[\\\/]/g, '-')
      .toLowerCase();
  }
}
