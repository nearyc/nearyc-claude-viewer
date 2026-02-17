import type { SessionsService } from './sessionsService';
import type { TeamsService } from './TeamsService';
import type { Session, Project, Team } from '../types';

// Activity stats interfaces
export interface DailyActivity {
  date: string; // YYYY-MM-DD
  sessionCount: number;
  messageCount: number;
}

export interface HeatmapData {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ActivityStats {
  daily: DailyActivity[];
  heatmap: HeatmapData[];
}

export interface ProjectTrends {
  projectPath: string;
  daily: DailyActivity[];
}

export interface UsageStats {
  totalSessions: number;
  totalMessages: number;
  totalTeams: number;
  activeToday: number;
  activeThisWeek: number;
  averageSessionDuration: number;
  topProjects: { name: string; count: number }[];
}

export class StatsService {
  private sessionsService: SessionsService;
  private teamsService: TeamsService;

  constructor(sessionsService: SessionsService, teamsService: TeamsService) {
    this.sessionsService = sessionsService;
    this.teamsService = teamsService;
  }

  /**
   * Get activity statistics for the last N days
   */
  async getActivityStats(days: number = 30): Promise<ActivityStats> {
    const sessions = await this.sessionsService.getSessions();
    const now = new Date();
    const dailyMap = new Map<string, { sessionCount: number; messageCount: number }>();

    // Initialize all days with zero counts
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = this.formatDate(date);
      dailyMap.set(dateStr, { sessionCount: 0, messageCount: 0 });
    }

    // Aggregate session data by date
    for (const session of sessions) {
      const sessionDate = new Date(session.createdAt);
      const dateStr = this.formatDate(sessionDate);

      // Only include if within the date range
      const daysDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < days) {
        const existing = dailyMap.get(dateStr);
        if (existing) {
          dailyMap.set(dateStr, {
            sessionCount: existing.sessionCount + 1,
            messageCount: existing.messageCount + session.messageCount,
          });
        }
      }
    }

    // Convert map to sorted array (oldest first)
    const daily: DailyActivity[] = Array.from(dailyMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, counts]) => ({
        date,
        sessionCount: counts.sessionCount,
        messageCount: counts.messageCount,
      }));

    // Generate heatmap data
    const heatmap = this.generateHeatmap(daily);

    return {
      daily,
      heatmap,
    };
  }

  /**
   * Get project trends for a specific project
   */
  async getProjectTrends(projectPath: string, days: number = 30): Promise<ProjectTrends> {
    const sessions = await this.sessionsService.getSessionsByProject(projectPath);
    const now = new Date();
    const dailyMap = new Map<string, { sessionCount: number; messageCount: number }>();

    // Initialize all days with zero counts
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = this.formatDate(date);
      dailyMap.set(dateStr, { sessionCount: 0, messageCount: 0 });
    }

    // Aggregate session data by date
    for (const session of sessions) {
      const sessionDate = new Date(session.createdAt);
      const dateStr = this.formatDate(sessionDate);

      const daysDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < days) {
        const existing = dailyMap.get(dateStr);
        if (existing) {
          dailyMap.set(dateStr, {
            sessionCount: existing.sessionCount + 1,
            messageCount: existing.messageCount + session.messageCount,
          });
        }
      }
    }

    // Convert map to sorted array
    const daily: DailyActivity[] = Array.from(dailyMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, counts]) => ({
        date,
        sessionCount: counts.sessionCount,
        messageCount: counts.messageCount,
      }));

    return {
      projectPath,
      daily,
    };
  }

  /**
   * Get overall usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    const [sessions, teams, projects] = await Promise.all([
      this.sessionsService.getSessions(),
      this.teamsService.getTeams(),
      this.sessionsService.getProjects(),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    let totalMessages = 0;
    let activeToday = 0;
    let activeThisWeek = 0;
    let totalDuration = 0;
    let sessionsWithDuration = 0;

    // Project session counts for top projects
    const projectCounts = new Map<string, number>();

    for (const session of sessions) {
      totalMessages += session.messageCount;

      // Count sessions per project
      const count = projectCounts.get(session.project) || 0;
      projectCounts.set(session.project, count + 1);

      // Check if active today
      if (session.updatedAt >= todayStart.getTime()) {
        activeToday++;
      }

      // Check if active this week
      if (session.updatedAt >= weekStart.getTime()) {
        activeThisWeek++;
      }

      // Calculate session duration
      if (session.updatedAt > session.createdAt) {
        const duration = session.updatedAt - session.createdAt;
        totalDuration += duration;
        sessionsWithDuration++;
      }
    }

    // Calculate average session duration in minutes
    const averageSessionDuration = sessionsWithDuration > 0
      ? Math.round(totalDuration / sessionsWithDuration / 1000 / 60)
      : 0;

    // Get top 5 projects by session count
    const topProjects = Array.from(projectCounts.entries())
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalSessions: sessions.length,
      totalMessages,
      totalTeams: teams.length,
      activeToday,
      activeThisWeek,
      averageSessionDuration,
      topProjects,
    };
  }

  /**
   * Generate heatmap levels based on daily activity
   * Level 0: No activity
   * Level 1: Light (1-2 sessions)
   * Level 2: Moderate (3-5 sessions)
   * Level 3: Active (6-10 sessions)
   * Level 4: Very Active (11+ sessions)
   */
  private generateHeatmap(daily: DailyActivity[]): HeatmapData[] {
    return daily.map((day) => {
      const count = day.sessionCount;
      let level: 0 | 1 | 2 | 3 | 4;

      if (count === 0) level = 0;
      else if (count <= 2) level = 1;
      else if (count <= 5) level = 2;
      else if (count <= 10) level = 3;
      else level = 4;

      return {
        date: day.date,
        level,
      };
    });
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
