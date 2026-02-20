// ============================================
// Claude Viewer Frontend - Type Definitions
// Sessions + Agent Teams Integration
// ============================================

// ============================================
// Session Related Types
// ============================================

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result' | 'thinking' | 'redacted_thinking';
  text?: string;
  source?: {
    type: 'base64' | 'url';
    media_type: string;
    data: string;
  };
}

export interface SessionInput {
  display: string;
  timestamp: number;
}

// ============================================
// Session Related Types
// ============================================

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
}

// ============================================
// Agent Teams Related Types
// ============================================

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
  type: 'message' | 'idle_notification' | 'status_update' | 'task_completed' | 'task_failed' | 'shutdown_request' | 'shutdown_response' | 'plan_approval_request' | 'plan_approval_response' | 'shutdown_approved';
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
  allSessions: Session[]; // All sessions for activity charts
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
// Component Props Types
// ============================================

export interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  stats: DashboardStats | null;
  isConnected: boolean;
}

export interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  stats: DashboardStats | null;
  projects: Project[];
  isConnected: boolean;
  selectedProject?: string | null;
  onSelectProject?: (projectPath: string | null) => void;
}

export interface SessionListProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  projectFilter: string | null;
}

export interface SessionDetailProps {
  session: Session | null;
  onViewTeam?: (teamId: string) => void;
}

export interface TeamListProps {
  teams: Team[];
  selectedId: string | null;
  onSelect: (team: Team) => void;
}

export interface MemberListProps {
  members: TeamMember[];
  selectedMember: string | null;
  onSelectMember: (memberName: string | null) => void;
  messageCounts: Record<string, number>;
}

export interface MessagePanelProps {
  team: TeamWithInboxes | null;
  selectedMember: string | null;
  onViewSession?: (sessionId: string) => void;
}

export interface DashboardProps {
  stats: DashboardStats | null;
  recentActivity: ActivityItem[];
  onViewSession: (sessionId: string) => void;
  onViewTeam: (teamId: string) => void;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// WebSocket Types
// ============================================

export interface ServerToClientEvents {
  'sessions:initial': (data: { sessions: Session[] }) => void;
  'sessions:updated': (data: { sessions: Session[] }) => void;
  'session:data': (data: Session) => void;
  'session:updated': (data: { session: Session }) => void;
  'teams:initial': (data: { teams: Team[] }) => void;
  'teams:updated': (data: { teams: Team[] }) => void;
  'team:data': (data: TeamWithInboxes) => void;
  'team:messages': (data: { teamId: string; memberId: string; messages: Message[] }) => void;
  'projects:initial': (data: { projects: Project[] }) => void;
  'projects:updated': (data: { projects: Project[] }) => void;
  'stats:updated': (data: DashboardStats) => void;
}

export interface ClientToServerEvents {
  'session:subscribe': (sessionId: string) => void;
  'session:unsubscribe': (sessionId: string) => void;
  'team:subscribe': (teamId: string) => void;
  'team:unsubscribe': (teamId: string) => void;
}
