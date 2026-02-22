// ============================================
// Claude Viewer - Unified Type Definitions
// Sessions + Agent Teams Integration
// ============================================

import { Socket } from 'socket.io';

// ============================================
// Session Related Types (from sessions-viewer)
// ============================================

export interface HistoryEntry {
  display: string;
  timestamp: number;
  project: string;
  sessionId: string;
  pastedContents?: Record<string, any>;
}

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result' | 'thinking' | 'redacted_thinking';
  text?: string;
  thinking?: string;
  source?: {
    type: 'base64' | 'url';
    media_type: string;
    data: string;
  };
}

export interface ConversationMessage {
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  type: string;
  project?: string;
  message?: {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  };
}

export interface SessionInput {
  display: string;
  timestamp: number;
}

export interface ChatMessage {
  uuid: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: string;
}

export interface Session {
  id: string;
  sessionId: string;
  project: string;
  projectSlug: string;
  inputs: SessionInput[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  inputCount: number;
  messageCount: number;
  hasMore?: boolean;
}

// ============================================
// Agent Teams Related Types (from agent-teams-viewer)
// ============================================

export interface MemberConfig {
  agentId: string;
  name: string;
  agentType: string;
  description?: string;
  mode?: string;
  model?: string;
  color?: string;
  prompt?: string;
  planModeRequired?: boolean;
  joinedAt: number;
  tmuxPaneId?: string;
  cwd?: string;
  subscriptions?: string[];
  backendType?: string;
}

export interface TeamConfig {
  name: string;
  description?: string;
  createdAt: number;
  leadAgentId?: string;
  leadSessionId?: string;
  members: MemberConfig[];
}

export interface TeamMember {
  name: string;
  agentType: string;
  description?: string;
  mode?: string;
  model?: string;
  inboxPath?: string;
}

export interface Message {
  id: string;
  type: 'message' | 'idle_notification' | 'status_update' | 'task_completed' | 'task_failed' | 'shutdown_request' | 'shutdown_response' | 'plan_approval_request' | 'plan_approval_response';
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MemberInbox {
  memberName: string;
  messages: Message[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  agentType: string;
  configPath: string;
  members: TeamMember[];
  memberCount: number;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface TeamWithInboxes extends Team {
  inboxes: MemberInbox[];
}

// ============================================
// Project Type
// ============================================

export interface Project {
  name: string;
  path: string;
  sessionCount: number;
  lastActive: number;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  totalSessions: number;
  totalProjects: number;
  totalInputs: number;
  totalTeams: number;
  totalMembers: number;
  recentSessions: Session[];
  recentTeams: Team[];
}

export interface ActivityItem {
  type: 'session' | 'team';
  id: string;
  title: string;
  subtitle?: string;
  timestamp: number;
}

// ============================================
// View State Types
// ============================================

export type ViewType = 'dashboard' | 'sessions' | 'projects' | 'teams';

export interface AppState {
  currentView: ViewType;
  selectedSessionId: string | null;
  selectedTeamId: string | null;
  selectedProject: string | null;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface SessionDetailResponse {
  session: Session;
}

export interface TeamsResponse {
  teams: Team[];
}

export interface TeamDetailResponse {
  team: TeamWithInboxes;
}

export interface ProjectsResponse {
  projects: Project[];
}

// ============================================
// WebSocket Event Types
// ============================================

export interface ServerToClientEvents {
  // Sessions events
  'sessions:initial': (data: SessionsResponse) => void;
  'sessions:updated': (data: SessionsResponse) => void;
  'session:data': (data: Session) => void;
  'session:updated': (data: { session: Session }) => void;

  // Teams events
  'teams:initial': (data: TeamsResponse) => void;
  'teams:updated': (data: TeamsResponse) => void;
  'team:data': (data: TeamWithInboxes) => void;
  'team:messages': (data: { teamId: string; memberId: string; messages: Message[] }) => void;

  // Projects events
  'projects:initial': (data: ProjectsResponse) => void;
  'projects:updated': (data: ProjectsResponse) => void;

  // Stats events
  'stats:updated': (data: DashboardStats) => void;

  // Activity stream events
  'activity:stream': (data: ActivityEvent) => void;
}

export interface ClientToServerEvents {
  'session:subscribe': (sessionId: string) => void;
  'session:unsubscribe': (sessionId: string) => void;
  'team:subscribe': (teamId: string) => void;
  'team:unsubscribe': (teamId: string) => void;
}

export interface SocketData {
  subscribedSessions: Set<string>;
  subscribedTeams: Set<string>;
}

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, SocketData>;

// ============================================
// File Watcher Types
// ============================================

export interface FileWatcherEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir';
  path: string;
}

export interface DataUpdateEvent {
  source: 'sessions' | 'teams' | 'projects';
  action: 'initial' | 'updated';
  data: any;
}

// ============================================
// Activity Stream Types
// ============================================

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
  | SessionCreatedActivityData
  | SessionUpdatedActivityData
  | TeamMessageActivityData
  | MemberJoinedActivityData;

export interface SessionCreatedActivityData {
  sessionId: string;
  project: string;
  display?: string;
}

export interface SessionUpdatedActivityData {
  sessionId: string;
  project: string;
  messageCount: number;
}

export interface TeamMessageActivityData {
  teamId: string;
  sender: string;
  recipient: string;
  preview: string;
}

export interface MemberJoinedActivityData {
  teamId: string;
  memberName: string;
  agentType: string;
}

// ============================================
// Search Types
// ============================================

export interface SearchResult {
  type: 'session' | 'team_message';
  id: string;
  title: string;
  snippet: string;
  timestamp: number;
  project?: string;
}

// ============================================
// Team Stats Types
// ============================================

export interface TeamMemberStats {
  name: string;
  messageCount: number;
  avgResponseTime: number;
  tasksCompleted: number;
  tasksFailed: number;
}

export interface TeamStats {
  memberStats: TeamMemberStats[];
  overall: {
    totalMessages: number;
    avgResponseTime: number;
    completionRate: number;
  };
}

// ============================================
// Code Stats Types
// ============================================

export interface CodeStats {
  totalLines: number;
  byLanguage: { [lang: string]: number };
  byProject: { [project: string]: number };
  dailyTrend: { date: string; lines: number }[];
}

// Raw inbox message format for search
export interface RawInboxMessage {
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
