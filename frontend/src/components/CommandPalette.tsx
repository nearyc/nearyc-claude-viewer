import React, { useRef, useEffect } from 'react';
import { Search, LayoutDashboard, List, Users, FolderGit2, MessageSquare, RefreshCw, Command, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useMobile } from '../contexts/MobileContext';
import type { Command as CommandType } from '../hooks/useCommandPalette';

interface CommandPaletteProps {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  commands: CommandType[];
  onSearchChange: (query: string) => void;
  onSelectCommand: (command: CommandType) => void;
  onClose: () => void;
}

const getCommandIcon = (type: CommandType['type']) => {
  switch (type) {
    case 'navigate-dashboard':
      return LayoutDashboard;
    case 'navigate-sessions':
      return List;
    case 'navigate-teams':
      return Users;
    case 'navigate-projects':
      return FolderGit2;
    case 'open-session':
      return MessageSquare;
    case 'open-team':
      return Users;
    case 'refresh-data':
      return RefreshCw;
    default:
      return Command;
  }
};

const getCommandCategory = (type: CommandType['type'], t: (key: string) => string): string => {
  switch (type) {
    case 'navigate-dashboard':
    case 'navigate-sessions':
    case 'navigate-teams':
    case 'navigate-projects':
      return t('commandPalette.navigation');
    case 'open-session':
      return t('commandPalette.sessions');
    case 'open-team':
      return t('commandPalette.teams');
    case 'refresh-data':
      return t('commandPalette.actions');
    default:
      return t('commandPalette.other');
  }
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  searchQuery,
  selectedIndex,
  commands,
  onSearchChange,
  onSelectCommand,
  onClose,
}) => {
  const { t } = useTranslation();
  const { isMobile } = useMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect();
      const selectedRect = selectedRef.current.getBoundingClientRect();

      if (selectedRect.bottom > listRect.bottom) {
        listRef.current.scrollTop += selectedRect.bottom - listRect.bottom + 8;
      } else if (selectedRect.top < listRect.top) {
        listRef.current.scrollTop -= listRect.top - selectedRect.top + 8;
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group commands by category
  const groupedCommands = commands.reduce((acc, command) => {
    const category = getCommandCategory(command.type, t);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(command);
    return acc;
  }, {} as Record<string, CommandType[]>);

  const categories = Object.keys(groupedCommands);
  let globalIndex = 0;

  return (
    <div
      className={`fixed inset-0 z-50 ${
        isMobile
          ? 'flex flex-col pt-safe-area-top pb-safe-area-bottom'
          : 'flex items-start justify-center pt-[20vh]'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMobile) {
          onClose();
        }
      }}
    >
      <div
        className={`${
          isMobile
            ? 'w-full h-full flex flex-col rounded-none'
            : 'w-full max-w-2xl rounded-lg shadow-2xl'
        } overflow-hidden`}
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: isMobile ? 'none' : '1px solid var(--border-primary)',
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b safe-area-left safe-area-right"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <Search className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('commandPalette.placeholder')}
            className="flex-1 bg-transparent text-base outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {isMobile ? (
            <button
              onClick={onClose}
              className="p-2 rounded-md transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <kbd
              className="px-2 py-1 text-xs rounded"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
              }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* Commands List */}
        <div
          ref={listRef}
          className={`overflow-y-auto py-2 flex-1 ${
            isMobile ? 'safe-area-left safe-area-right' : 'max-h-[50vh]'
          }`}
        >
          {commands.length === 0 ? (
            <div
              className="px-4 py-8 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('commandPalette.noResults')}
            </div>
          ) : (
            categories.map((category) => (
              <div key={category}>
                <div
                  className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {category}
                </div>
                {groupedCommands[category].map((command) => {
                  const Icon = getCommandIcon(command.type);
                  const isSelected = globalIndex === selectedIndex;
                  const currentIndex = globalIndex++;

                  return (
                    <button
                      key={command.id}
                      ref={isSelected ? selectedRef : null}
                      onClick={() => onSelectCommand(command)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--bg-selected)'
                          : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{
                            color: isSelected
                              ? 'var(--accent-blue)'
                              : 'var(--text-primary)',
                          }}
                        >
                          {command.title}
                        </div>
                        {command.subtitle && (
                          <div
                            className="text-xs truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {command.subtitle}
                          </div>
                        )}
                      </div>
                      {command.shortcut && (
                        <div className="flex items-center gap-1">
                          {command.shortcut.split(' ').map((key, i) => (
                            <kbd
                              key={i}
                              className="px-1.5 py-0.5 text-xs rounded"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs border-t ${
            isMobile ? 'safe-area-left safe-area-right safe-area-bottom' : ''
          }`}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-muted)',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd
                className="px-1 rounded"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                ↑
              </kbd>
              <kbd
                className="px-1 rounded"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                ↓
              </kbd>
              <span>{t('commandPalette.toNavigate')}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd
                className="px-1 rounded"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                ↵
              </kbd>
              <span>{t('commandPalette.toSelect')}</span>
            </span>
          </div>
          <span>{t('commandPalette.commandCount', { count: commands.length })}</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
