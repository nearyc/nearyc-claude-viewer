import React, { useMemo } from 'react';
import { User, Circle } from 'lucide-react';
import { getMemberColor } from '../utils/colors';
import type { TeamMember, MemberInbox, Message } from '../types';

interface MemberListProps {
  members: TeamMember[];
  selectedMember: string | null;
  onSelectMember: (memberName: string | null) => void;
  messageCounts: Record<string, number>;
  inboxes?: MemberInbox[];
}

const getStatusColor = (status?: string): string => {
  const statusLower = status?.toLowerCase() || '';

  // Available / Online / Ready states
  if (['online', 'available', 'ready', 'active', 'idle', 'completed', 'success', 'done'].includes(statusLower)) {
    return 'var(--accent-green)';
  }

  // Busy / Working states
  if (['busy', 'working', 'processing', 'in_progress', 'task', 'assigned'].includes(statusLower)) {
    return 'var(--accent-amber)';
  }

  // Offline / Shutdown states
  if (['offline', 'shutdown', 'disconnected', 'unavailable'].includes(statusLower)) {
    return 'var(--text-muted)';
  }

  // Error / Failed states
  if (['error', 'failed', 'crash', 'exception'].includes(statusLower)) {
    return 'var(--accent-red)';
  }

  // Default
  return 'var(--text-muted)';
};

// Get friendly status label
const getStatusLabel = (status?: string): string => {
  if (!status) return 'Offline';
  const statusLower = status.toLowerCase();

  const labels: Record<string, string> = {
    online: 'Online',
    available: 'Available',
    ready: 'Ready',
    active: 'Active',
    idle: 'Idle',
    completed: 'Done',
    success: 'Success',
    done: 'Done',
    busy: 'Busy',
    working: 'Working',
    processing: 'Processing',
    in_progress: 'In Progress',
    task: 'Task',
    assigned: 'Assigned',
    offline: 'Offline',
    shutdown: 'Offline',
    disconnected: 'Offline',
    unavailable: 'Unavailable',
    error: 'Error',
    failed: 'Failed',
    crash: 'Crashed',
    exception: 'Error',
  };

  return labels[statusLower] || status.charAt(0).toUpperCase() + status.slice(1);
};

// Get status badge style
const getStatusBadgeStyle = (status?: string): React.CSSProperties => {
  const statusLower = status?.toLowerCase() || '';

  // Available / Online / Ready states - Green
  if (['online', 'available', 'ready', 'active', 'completed', 'success', 'done'].includes(statusLower)) {
    return {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      color: 'var(--accent-green)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
    };
  }

  // Idle states - Blue
  if (['idle'].includes(statusLower)) {
    return {
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      color: 'var(--accent-blue)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
    };
  }

  // Busy / Working states - Amber
  if (['busy', 'working', 'processing', 'in_progress', 'task', 'assigned'].includes(statusLower)) {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      color: 'var(--accent-amber)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    };
  }

  // Error / Failed states - Red
  if (['error', 'failed', 'crash', 'exception'].includes(statusLower)) {
    return {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: 'var(--accent-red)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    };
  }

  // Offline / Default - Gray
  return {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    color: 'var(--text-muted)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  };
};

const ROLE_STYLES: Record<string, React.CSSProperties> = {
  lead: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: 'var(--accent-purple)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  explore: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--accent-blue)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  plan: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--accent-amber)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  execute: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--accent-green)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  review: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    color: '#ec4899',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
};

const getRoleBadgeStyle = (role: string): React.CSSProperties => {
  return ROLE_STYLES[role.toLowerCase()] || {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-muted)',
    borderColor: 'var(--border-primary)',
  };
};

// Parse member status from their messages
const getMemberStatusFromMessages = (messages: Message[]): string => {
  if (!messages || messages.length === 0) return 'offline';

  // Find the most recent status-related message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    // Check explicit message types
    if (msg.type === 'idle_notification') {
      try {
        const data = JSON.parse(msg.content);
        const status = data.idleReason || data.status;
        if (status) return status.toLowerCase();
      } catch {
        // Try to infer from text content
        const text = msg.content?.toLowerCase() || '';
        if (text.includes('available')) return 'available';
        if (text.includes('idle')) return 'idle';
        if (text.includes('busy')) return 'busy';
      }
      return 'available';
    }

    if (msg.type === 'status_update') {
      try {
        const data = JSON.parse(msg.content);
        const status = data.status;
        if (status) return status.toLowerCase();
      } catch {
        return 'busy';
      }
    }

    if (msg.type === 'shutdown_approved' || msg.type === 'shutdown_request') {
      return 'offline';
    }

    if (msg.type === 'task_assignment' || msg.type === 'task_completed') {
      return 'working';
    }

    // Try to infer status from message content
    if (msg.content) {
      try {
        const data = JSON.parse(msg.content);
        const status = data.status || data.idleReason || data.state;
        if (status) return status.toLowerCase();
      } catch {
        // Not JSON, check text content
        const text = msg.content.toLowerCase();
        if (text.includes('available') || text.includes('idle')) return 'available';
        if (text.includes('busy') || text.includes('working') || text.includes('processing')) return 'busy';
        if (text.includes('complete') || text.includes('done')) return 'completed';
        if (text.includes('error') || text.includes('fail')) return 'error';
        if (text.includes('shutdown') || text.includes('offline')) return 'offline';
      }
    }
  }

  // Has messages but no explicit status - check most recent message time
  const lastMessage = messages[messages.length - 1];
  const timeSinceLastMessage = Date.now() - lastMessage.timestamp;

  // If last message was within 5 minutes, assume active
  if (timeSinceLastMessage < 5 * 60 * 1000) {
    return 'online';
  }

  // If last message was within 30 minutes, assume idle
  if (timeSinceLastMessage < 30 * 60 * 1000) {
    return 'idle';
  }

  return 'offline';
};

export const MemberList: React.FC<MemberListProps> = ({
  members,
  selectedMember,
  onSelectMember,
  messageCounts,
  inboxes,
}) => {
  // Create member status mapping from inboxes
  const memberStatuses = useMemo(() => {
    const statuses: Record<string, string> = {};
    inboxes?.forEach((inbox) => {
      statuses[inbox.memberName] = getMemberStatusFromMessages(inbox.messages);
    });
    return statuses;
  }, [inboxes]);
  if (members.length === 0) {
    return (
      <div
        className="flex flex-col h-full"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div
          className="px-5 py-3.5 border-b"
          style={{
            borderColor: 'var(--border-primary)',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
          }}
        >
          <div className="flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Members
            </span>
          </div>
        </div>
        <div
          className="h-full flex flex-col items-center justify-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <User className="w-5 h-5 opacity-40" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Select a team to view members
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 border-b"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
        }}
      >
        <div className="flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
          <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Members
          </span>
          <span
            className="ml-auto text-sm px-2 py-0.5 rounded-full"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            {members.length}
          </span>
        </div>
      </div>

      {/* Member List */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {members.map((member) => {
          const color = getMemberColor(member.name);
          const messageCount = messageCounts[member.name] || 0;
          const isSelected = selectedMember === member.name;
          const status = memberStatuses[member.name] || 'offline';

          return (
            <button
              key={member.name}
              onClick={() => onSelectMember(member.name)}
              className="w-full px-3 py-2.5 text-left rounded-lg transition-all duration-150 border"
              style={{
                backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                borderColor: isSelected ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border"
                    style={{
                      backgroundColor: `${color}30`,
                      color: color,
                      borderColor: 'var(--border-primary)',
                    }}
                  >
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <Circle
                    className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 rounded-full border-2"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--bg-primary)',
                      color: getStatusColor(status),
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div
                    className="font-medium text-sm truncate"
                    style={{
                      color: isSelected ? '#c4b5fd' : 'var(--text-secondary)',
                    }}
                  >
                    {member.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                      style={getRoleBadgeStyle(member.agentType || 'unknown')}
                    >
                      {member.agentType || 'unknown'}
                    </span>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                      style={getStatusBadgeStyle(status)}
                    >
                      {getStatusLabel(status)}
                    </span>
                    {messageCount > 0 && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {messageCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MemberList;
