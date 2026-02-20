import fs from 'fs/promises';
import path from 'path';
import type {
  TeamConfig,
  Team,
  TeamWithInboxes,
  TeamMember,
  MemberInbox,
  Message,
  FileWatcherEvent,
  TeamStats,
  TeamMemberStats,
} from '../types';

// Raw inbox message format from JSON files
interface RawInboxMessage {
  id?: string;
  from: string;
  to?: string;
  text: string;
  timestamp: string;
  color?: string;
  read?: boolean;
  summary?: string;
  type?: string;
  metadata?: Record<string, any>;
}

export class TeamsService {
  private teamsDir: string;
  private teamsCache: Map<string, TeamConfig> = new Map();
  private messagesCache: Map<string, Message[]> = new Map(); // key: teamId/memberName

  constructor(teamsDir: string) {
    this.teamsDir = teamsDir;
  }

  // Get all teams
  async getTeams(): Promise<Team[]> {
    const teams: Team[] = [];

    try {
      // Check if teams directory exists
      try {
        await fs.access(this.teamsDir);
      } catch {
        console.log('[TeamsService] Teams directory does not exist');
        return teams;
      }

      const entries = await fs.readdir(this.teamsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const teamId = entry.name;
          const team = await this.getTeamById(teamId);
          if (team) {
            teams.push(team);
          }
        }
      }
    } catch (error) {
      console.error('[TeamsService] Error reading teams directory:', error);
    }

    return teams.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Get single team by ID
  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const configPath = path.join(this.teamsDir, teamId, 'config.json');
      let config: TeamConfig | null = null;

      // Try to read config.json
      try {
        const data = await fs.readFile(configPath, 'utf-8');
        config = JSON.parse(data);
        if (config) {
          this.teamsCache.set(teamId, config);
        }
      } catch {
        // Config file doesn't exist, we'll infer from inboxes
        // Debug: console.log(`[TeamsService] No config.json for team ${teamId}, inferring from inboxes`);
      }

      // If no config, try to infer from inboxes directory
      if (!config) {
        const inferredTeam = await this.inferTeamFromInboxes(teamId);
        if (!inferredTeam) {
          // Debug: console.log(`[TeamsService] No inboxes found for team ${teamId}, skipping`);
          return null;
        }
        return inferredTeam;
      }

      // Get message count for all members
      let messageCount = 0;
      for (const member of config.members || []) {
        const messages = await this.getMessages(teamId, member.name);
        messageCount += messages.length;
      }

      return {
        id: teamId,
        name: config.name,
        description: config.description,
        agentType: config.leadAgentId ? 'team-lead' : 'general',
        configPath: configPath,
        members: (config.members || []).map(m => ({
          name: m.name,
          agentType: m.agentType,
          description: m.description,
          mode: m.mode,
          model: m.model,
          inboxPath: path.join(this.teamsDir, teamId, 'inboxes', `${m.name}.json`),
        })),
        memberCount: config.members?.length || 0,
        messageCount,
        createdAt: config.createdAt || 0,
        updatedAt: config.createdAt || 0, // Use createdAt as fallback
      };
    } catch (error) {
      console.error(`[TeamsService] Error reading team ${teamId}:`, error);
      return null;
    }
  }

  // Infer team data from inboxes directory when config.json doesn't exist
  private async inferTeamFromInboxes(teamId: string): Promise<Team | null> {
    try {
      const inboxesDir = path.join(this.teamsDir, teamId, 'inboxes');

      // Check if inboxes directory exists
      try {
        await fs.access(inboxesDir);
      } catch {
        return null;
      }

      // Read all inbox files
      const entries = await fs.readdir(inboxesDir, { withFileTypes: true });
      const inboxFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json'));

      if (inboxFiles.length === 0) {
        return null;
      }

      // Build members list from inbox files
      const members: TeamMember[] = [];
      let totalMessageCount = 0;
      let oldestTimestamp = Date.now();

      for (const file of inboxFiles) {
        const memberName = path.basename(file.name, '.json');
        const inboxPath = path.join(inboxesDir, file.name);

        // Try to get member info from inbox file
        let agentType = 'general-purpose';
        let description = '';
        let mode = 'default';
        let model = 'claude';

        try {
          const data = await fs.readFile(inboxPath, 'utf-8');
          const messages: RawInboxMessage[] = JSON.parse(data);
          totalMessageCount += messages.length;

          // Find oldest message timestamp
          for (const msg of messages) {
            const ts = typeof msg.timestamp === 'string'
              ? new Date(msg.timestamp).getTime()
              : msg.timestamp;
            if (ts && ts < oldestTimestamp) {
              oldestTimestamp = ts;
            }
          }

          // Try to infer agent type from messages
          if (messages.length > 0) {
            const firstMsg = messages[0];
            if (firstMsg.metadata?.type) {
              agentType = firstMsg.metadata.type;
            }
            // Check for agent type mentions in early messages
            for (const msg of messages.slice(0, 5)) {
              const text = msg.text.toLowerCase();
              if (text.includes('explore') || text.includes('research')) {
                agentType = 'Explore';
              } else if (text.includes('plan') || text.includes('design')) {
                agentType = 'Plan';
              } else if (text.includes('code') || text.includes('implement')) {
                agentType = 'general-purpose';
              }
            }
          }
        } catch {
          // Inbox file might be empty or invalid
        }

        members.push({
          name: memberName,
          agentType,
          description,
          mode,
          model,
          inboxPath,
        });
      }

      // Create a human-readable team name
      const displayName = teamId
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return {
        id: teamId,
        name: displayName,
        description: `Team with ${members.length} member${members.length > 1 ? 's' : ''}`,
        agentType: members.some(m => m.name === 'team-lead') ? 'team-lead' : 'general',
        configPath: '', // No config file
        members,
        memberCount: members.length,
        messageCount: totalMessageCount,
        createdAt: oldestTimestamp,
        updatedAt: Date.now(),
      };
    } catch (error) {
      console.error(`[TeamsService] Error inferring team ${teamId}:`, error);
      return null;
    }
  }

  // Get full team config
  async getTeamConfig(teamId: string): Promise<(TeamConfig & { id: string }) | null> {
    try {
      const configPath = path.join(this.teamsDir, teamId, 'config.json');
      const data = await fs.readFile(configPath, 'utf-8');
      const config: TeamConfig = JSON.parse(data);

      this.teamsCache.set(teamId, config);

      return {
        ...config,
        id: teamId,
      };
    } catch (error) {
      console.error(`[TeamsService] Error reading team config ${teamId}:`, error);
      return null;
    }
  }

  // Get team with inboxes (full data including messages)
  async getTeamWithInboxes(teamId: string): Promise<TeamWithInboxes | null> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        return null;
      }

      const inboxes: MemberInbox[] = [];

      // Load inboxes for all members
      for (const member of team.members) {
        const messages = await this.getMessages(teamId, member.name);
        inboxes.push({
          memberName: member.name,
          messages,
        });
      }

      return {
        ...team,
        inboxes,
      };
    } catch (error) {
      console.error(`[TeamsService] Error getting team with inboxes ${teamId}:`, error);
      return null;
    }
  }

  // Get team members
  async getMembers(teamId: string): Promise<TeamMember[]> {
    const team = await this.getTeamById(teamId);
    return team?.members || [];
  }

  // Find inbox file for a member (handles name mismatch between config and filename)
  private async findInboxFile(teamId: string, memberName: string): Promise<string | null> {
    const inboxesDir = path.join(this.teamsDir, teamId, 'inboxes');

    try {
      // First try exact match
      const exactPath = path.join(inboxesDir, `${memberName}.json`);
      try {
        await fs.access(exactPath);
        return exactPath;
      } catch {
        // Exact match not found, try to find by reading all files
      }

      // Read all inbox files and find the one where 'to' field matches memberName
      const entries = await fs.readdir(inboxesDir, { withFileTypes: true });
      const inboxFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json'));

      for (const file of inboxFiles) {
        const filePath = path.join(inboxesDir, file.name);
        try {
          const data = await fs.readFile(filePath, 'utf-8');
          const messages: RawInboxMessage[] = JSON.parse(data);

          // Check if any message has this member as recipient
          const hasMatch = messages.some(msg =>
            msg.to === memberName ||
            (!msg.to && msg.from !== memberName) // If no 'to', check if this is incoming message
          );

          if (hasMatch) {
            // Debug: console.log(`[TeamsService] Found inbox file ${file.name} for member ${memberName}`);
            return filePath;
          }
        } catch {
          // Skip invalid files
        }
      }

      // Fallback: try to match by stripping non-alphanumeric characters
      const normalizedName = memberName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
      for (const file of inboxFiles) {
        const fileNameWithoutExt = path.basename(file.name, '.json');
        const normalizedFileName = fileNameWithoutExt.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');

        // Check if normalized names match or one contains the other
        if (normalizedName === normalizedFileName ||
            normalizedName.includes(normalizedFileName) ||
            normalizedFileName.includes(normalizedName)) {
          // Debug: console.log(`[TeamsService] Matched inbox file ${file.name} for member ${memberName} (normalized match)`);
          return path.join(inboxesDir, file.name);
        }
      }

      // Debug: console.log(`[TeamsService] No inbox file found for member ${memberName} in team ${teamId}`);
      return null;
    } catch {
      return null;
    }
  }

  // Get member messages
  async getMessages(teamId: string, memberName: string): Promise<Message[]> {
    const cacheKey = `${teamId}/${memberName}`;

    try {
      // Find the correct inbox file (handles name mismatch)
      const inboxPath = await this.findInboxFile(teamId, memberName);
      if (!inboxPath) {
        // Debug: console.log(`[TeamsService] Inbox not found for ${teamId}/${memberName}`);
        return [];
      }

      const data = await fs.readFile(inboxPath, 'utf-8');
      const rawMessages: RawInboxMessage[] = JSON.parse(data);

      // Convert raw inbox format to Message format
      const messages: Message[] = rawMessages.map((raw, index) => {
        // Parse timestamp (handle both string ISO format and number)
        const timestamp = typeof raw.timestamp === 'string'
          ? new Date(raw.timestamp).getTime()
          : raw.timestamp || Date.now();

        // Detect message type from content if not specified
        let messageType: Message['type'] = 'message';
        if (raw.type) {
          switch (raw.type) {
            case 'idle_notification':
              messageType = 'idle_notification';
              break;
            case 'status_update':
              messageType = 'status_update';
              break;
            case 'task_assignment':
              messageType = 'task_completed';
              break;
            case 'shutdown_request':
              messageType = 'shutdown_request';
              break;
            case 'shutdown_response':
              messageType = 'shutdown_response';
              break;
            default:
              messageType = 'message';
          }
        } else if (raw.text?.includes('"type":"idle_notification"')) {
          messageType = 'idle_notification';
        } else if (raw.text?.includes('"type":"shutdown_approved"') || raw.text?.includes('shutdown')) {
          messageType = 'shutdown_request';
        }

        return {
          id: raw.id || `${teamId}-${memberName}-${index}`,
          type: messageType,
          sender: raw.from,
          recipient: raw.to || memberName,
          content: raw.text,
          timestamp,
          metadata: raw.metadata || {
            color: raw.color,
            read: raw.read,
            summary: raw.summary,
          },
        };
      });

      this.messagesCache.set(cacheKey, messages);

      return messages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      // Inbox file may not exist
      return [];
    }
  }

  // Get all messages for a team (aggregated from all members)
  async getAllTeamMessages(teamId: string): Promise<Message[]> {
    const team = await this.getTeamById(teamId);
    if (!team) return [];

    const allMessages: Message[] = [];

    for (const member of team.members) {
      const messages = await this.getMessages(teamId, member.name);
      allMessages.push(...messages);
    }

    // Sort by timestamp
    return allMessages.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Handle file changes
  async handleFileChange(event: FileWatcherEvent): Promise<{
    type: 'team' | 'messages' | null;
    teamId?: string;
    memberName?: string;
  }> {
    // Handle addDir events - a new team directory was created
    if (event.type === 'addDir') {
      // console.log(`[FileWatcher] New team directory created: ${event.path}`);
      return { type: 'team' };
    }

    // Normalize path separators for cross-platform compatibility
    const normalizedEventPath = path.normalize(event.path);
    const normalizedTeamsDir = path.normalize(this.teamsDir);
    const relativePath = path.relative(normalizedTeamsDir, normalizedEventPath);
    const parts = relativePath.split(/[\\/]/);

    if (parts.length >= 2 && parts[1] === 'config.json') {
      // Team config changed
      const teamId = parts[0];
      this.teamsCache.delete(teamId);
      // console.log(`[FileWatcher] Team config changed: ${teamId}`);
      return { type: 'team', teamId };
    }

    if (parts.length >= 3 && parts[1] === 'inboxes') {
      // Messages changed
      const teamId = parts[0];
      const memberName = path.basename(parts[2], '.json');
      const cacheKey = `${teamId}/${memberName}`;
      this.messagesCache.delete(cacheKey);
      // console.log(`[FileWatcher] Messages changed: ${teamId}/${memberName}`);
      return { type: 'messages', teamId, memberName };
    }

    return { type: null };
  }

  // After delete, reload teams
  async afterDelete(): Promise<void> {
    this.clearCache();
  }

  // Delete a team by removing its directory
  async deleteTeam(teamId: string): Promise<boolean> {
    try {
      const teamDir = path.join(this.teamsDir, teamId);

      // Check if team directory exists
      try {
        await fs.access(teamDir);
      } catch {
        // Debug: console.log(`[TeamsService] Team directory not found: ${teamId}`);
        return false;
      }

      // Remove team directory recursively
      await fs.rm(teamDir, { recursive: true, force: true });

      // Clear cache
      this.teamsCache.delete(teamId);

      // Debug: console.log(`[TeamsService] Deleted team: ${teamId}`);
      return true;
    } catch (error) {
      console.error(`[TeamsService] Error deleting team ${teamId}:`, error);
      throw error;
    }
  }

  // Clear cache
  clearCache(): void {
    this.teamsCache.clear();
    this.messagesCache.clear();
  }

  // Get cache stats
  getCacheStats(): {
    teamsCount: number;
    messagesCount: number;
  } {
    return {
      teamsCount: this.teamsCache.size,
      messagesCount: this.messagesCache.size,
    };
  }

  // Get team statistics
  async getTeamStats(teamId: string): Promise<TeamStats | null> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        return null;
      }

      const memberStats: TeamMemberStats[] = [];
      let totalMessages = 0;
      let totalResponseTime = 0;
      let responseTimeCount = 0;
      let totalTasksCompleted = 0;
      let totalTasksFailed = 0;

      for (const member of team.members) {
        const messages = await this.getMessages(teamId, member.name);
        const messageCount = messages.length;
        totalMessages += messageCount;

        // Calculate response times and task statistics
        let memberResponseTime = 0;
        let memberResponseCount = 0;
        let tasksCompleted = 0;
        let tasksFailed = 0;

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];

          // Count tasks based on message type
          if (msg.type === 'task_completed') {
            tasksCompleted++;
            totalTasksCompleted++;
          } else if (msg.type === 'task_failed') {
            tasksFailed++;
            totalTasksFailed++;
          }

          // Calculate response time (time between received message and reply)
          if (i > 0) {
            const prevMsg = messages[i - 1];
            // If this member is responding to someone else
            if (msg.sender === member.name && prevMsg.sender !== member.name) {
              const responseTime = msg.timestamp - prevMsg.timestamp;
              // Only count reasonable response times (less than 1 hour)
              if (responseTime > 0 && responseTime < 60 * 60 * 1000) {
                memberResponseTime += responseTime;
                memberResponseCount++;
              }
            }
          }
        }

        const avgResponseTime = memberResponseCount > 0
          ? Math.round(memberResponseTime / memberResponseCount / 1000) // in seconds
          : 0;

        if (memberResponseCount > 0) {
          totalResponseTime += memberResponseTime;
          responseTimeCount += memberResponseCount;
        }

        memberStats.push({
          name: member.name,
          messageCount,
          avgResponseTime,
          tasksCompleted,
          tasksFailed,
        });
      }

      // Calculate overall statistics
      const overallAvgResponseTime = responseTimeCount > 0
        ? Math.round(totalResponseTime / responseTimeCount / 1000) // in seconds
        : 0;

      const totalTasks = totalTasksCompleted + totalTasksFailed;
      const completionRate = totalTasks > 0
        ? Math.round((totalTasksCompleted / totalTasks) * 100)
        : 0;

      return {
        memberStats: memberStats.sort((a, b) => b.messageCount - a.messageCount),
        overall: {
          totalMessages,
          avgResponseTime: overallAvgResponseTime,
          completionRate,
        },
      };
    } catch (error) {
      console.error(`[TeamsService] Error getting team stats for ${teamId}:`, error);
      return null;
    }
  }
}
