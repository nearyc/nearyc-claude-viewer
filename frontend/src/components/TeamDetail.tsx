import React, { useState, useMemo } from 'react';
import { Users, ArrowLeft, Hash, UserCircle, Inbox, MessageCircle } from 'lucide-react';
import { useMobile } from '../contexts/MobileContext';
import { useTranslation } from '../hooks/useTranslation';
import { useIsMobile } from '../hooks/useMediaQuery';
import { MemberList } from './MemberList';
import { MessagePanel } from './MessagePanel';
import type { TeamWithInboxes, TeamMember } from '../types';

interface TeamDetailProps {
  team: TeamWithInboxes | null;
  onBack?: () => void;
  onViewSession?: (sessionId: string) => void;
  hideHeader?: boolean; // If true, hide header (when Layout provides its own)
}

export const TeamDetail: React.FC<TeamDetailProps> = ({
  team,
  onBack,
  onViewSession,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  const { isMobile } = useMobile();
  const isMobileDevice = useIsMobile();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Calculate message counts for each member
  const messageCounts = useMemo(() => {
    if (!team?.inboxes) return {};
    const counts: Record<string, number> = {};
    team.inboxes.forEach((inbox) => {
      counts[inbox.memberName] = inbox.messages.length;
    });
    return counts;
  }, [team?.inboxes]);

  // Get all messages count
  const totalMessages = useMemo(() => {
    return team?.messageCount || 0;
  }, [team?.messageCount]);

  if (!team) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <Users className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('team.selectTeam')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header - Hidden when Layout provides its own (mobile) */}
      {!hideHeader && (
        <div
          className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 border-b z-20 shrink-0"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex-shrink-0 p-1.5 md:p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}

          <div
            className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            <Hash className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'var(--accent-blue)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold text-sm truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {team.name}
            </h2>
            <div
              className="flex items-center gap-2 md:gap-3 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="flex items-center gap-0.5">
                <UserCircle className="w-3 h-3" />
                {team.memberCount}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" />
                {totalMessages}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content: Members + Messages - Both desktop and mobile: side by side */}
      <div className="flex-1 overflow-hidden flex flex-row" style={{ height: isMobileDevice ? '100%' : (hideHeader ? 'calc(100vh - 140px)' : 'calc(100vh - 180px)') }}>
        {/* Members List */}
        <div
          className={`${isMobileDevice ? 'w-[150px] min-w-[140px]' : 'w-[280px] min-w-[240px] max-w-[320px]'} border-r flex flex-col`}
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div
            className="px-2 md:px-3 py-1.5 md:py-2 text-xs font-medium border-b flex items-center justify-between shrink-0"
            style={{
              color: 'var(--text-muted)',
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <span>{t('team.members')}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              {team.members.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MemberList
              members={team.members}
              selectedMember={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              messageCounts={messageCounts}
              inboxes={team.inboxes}
            />
          </div>
        </div>

        {/* Messages Panel */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div
            className="px-2 md:px-3 py-1.5 md:py-2 text-xs font-medium border-b flex items-center justify-between shrink-0"
            style={{
              color: 'var(--text-muted)',
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <span className="flex items-center gap-1">
              <Inbox className="w-3 h-3" />
              {t('team.messages')}
            </span>
            {selectedMemberId && (
              <button
                onClick={() => setSelectedMemberId(null)}
                className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('common.all')}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <MessagePanel
              team={team}
              selectedMember={selectedMemberId}
              onViewSession={onViewSession}
              compact={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDetail;
