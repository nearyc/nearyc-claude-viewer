import React from 'react';
import { User, Circle } from 'lucide-react';
import { getMemberColor } from '../utils/colors';
import type { TeamMember } from '../types';

interface MemberListProps {
  members: TeamMember[];
  selectedMember: string | null;
  onSelectMember: (memberName: string | null) => void;
  messageCounts: Record<string, number>;
}

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'online':
      return 'var(--accent-green)';
    case 'busy':
      return 'var(--accent-red)';
    case 'idle':
      return 'var(--accent-amber)';
    default:
      return 'var(--text-muted)';
  }
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

export const MemberList: React.FC<MemberListProps> = ({
  members,
  selectedMember,
  onSelectMember,
  messageCounts,
}) => {
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
                      color: getStatusColor(),
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
