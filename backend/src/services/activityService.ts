import { EventEmitter } from 'events';
import type { TypedSocket } from '../types';

// Activity event types
export type ActivityType =
  | 'session_created'
  | 'session_updated'
  | 'team_message'
  | 'member_joined';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  timestamp: number;
  data: ActivityData;
}

export type ActivityData =
  | SessionCreatedData
  | SessionUpdatedData
  | TeamMessageData
  | MemberJoinedData;

export interface SessionCreatedData {
  sessionId: string;
  project: string;
  display?: string;
}

export interface SessionUpdatedData {
  sessionId: string;
  project: string;
  messageCount: number;
}

export interface TeamMessageData {
  teamId: string;
  sender: string;
  recipient: string;
  preview: string;
}

export interface MemberJoinedData {
  teamId: string;
  memberName: string;
  agentType: string;
}

export class ActivityService extends EventEmitter {
  private activities: ActivityEvent[] = [];
  private maxActivities: number;
  private io: TypedSocket | null = null;

  constructor(maxActivities: number = 100) {
    super();
    this.maxActivities = maxActivities;
  }

  /**
   * Set the Socket.IO server for broadcasting
   */
  setSocketIO(io: TypedSocket): void {
    this.io = io;
  }

  /**
   * Record a new activity event
   */
  recordActivity(type: ActivityType, data: ActivityData): ActivityEvent {
    const activity: ActivityEvent = {
      id: this.generateId(),
      type,
      timestamp: Date.now(),
      data,
    };

    // Add to beginning of array (newest first)
    this.activities = [activity, ...this.activities].slice(0, this.maxActivities);

    // Emit to local listeners
    this.emit('activity', activity);

    // Broadcast via Socket.IO if available
    if (this.io) {
      this.io.emit('activity:stream', activity);
    }

    return activity;
  }

  /**
   * Record session created activity
   */
  recordSessionCreated(sessionId: string, project: string, display?: string): ActivityEvent {
    return this.recordActivity('session_created', {
      sessionId,
      project,
      display,
    });
  }

  /**
   * Record session updated activity
   */
  recordSessionUpdated(sessionId: string, project: string, messageCount: number): ActivityEvent {
    return this.recordActivity('session_updated', {
      sessionId,
      project,
      messageCount,
    });
  }

  /**
   * Record team message activity
   */
  recordTeamMessage(teamId: string, sender: string, recipient: string, content: string): ActivityEvent {
    // Create a preview (first 50 chars)
    const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;

    return this.recordActivity('team_message', {
      teamId,
      sender,
      recipient,
      preview,
    });
  }

  /**
   * Record member joined activity
   */
  recordMemberJoined(teamId: string, memberName: string, agentType: string): ActivityEvent {
    return this.recordActivity('member_joined', {
      teamId,
      memberName,
      agentType,
    });
  }

  /**
   * Get recent activities
   */
  getRecentActivities(limit: number = 50): ActivityEvent[] {
    return this.activities.slice(0, limit);
  }

  /**
   * Get activities by type
   */
  getActivitiesByType(type: ActivityType, limit: number = 50): ActivityEvent[] {
    return this.activities
      .filter(activity => activity.type === type)
      .slice(0, limit);
  }

  /**
   * Get activities since a specific timestamp
   */
  getActivitiesSince(timestamp: number): ActivityEvent[] {
    return this.activities.filter(activity => activity.timestamp >= timestamp);
  }

  /**
   * Clear all activities
   */
  clearActivities(): void {
    this.activities = [];
  }

  /**
   * Get activity count
   */
  getActivityCount(): number {
    return this.activities.length;
  }

  /**
   * Generate unique ID for activity
   */
  private generateId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance for shared access
let globalActivityService: ActivityService | null = null;

export function getGlobalActivityService(): ActivityService {
  if (!globalActivityService) {
    globalActivityService = new ActivityService();
  }
  return globalActivityService;
}

export function setGlobalActivityService(service: ActivityService): void {
  globalActivityService = service;
}
