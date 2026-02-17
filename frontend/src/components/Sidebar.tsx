import React from 'react';
import {
  LayoutDashboard,
  List,
  FolderGit2,
  Users,
  Circle,
  type LucideIcon,
} from 'lucide-react';
import type { ViewType, DashboardStats, Project } from '../types';

export interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  stats: DashboardStats | null;
  projects: Project[];
  isConnected: boolean;
  selectedProject?: string | null;
  onSelectProject?: (projectPath: string | null) => void;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  stats,
  projects,
  isConnected,
  selectedProject,
  onSelectProject,
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sessions', label: 'Sessions', icon: List, count: stats?.totalSessions },
    { id: 'teams', label: 'Agent Teams', icon: Users, count: stats?.totalTeams },
  ];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Logo/Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
            }}
          >
            <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--accent-blue-light)' }} />
          </div>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Claude Viewer</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {/* Main Nav Items */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'sessions' || item.id === 'dashboard') {
                    onSelectProject?.(null);
                  }
                  onViewChange(item.id);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 border"
                style={{
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  borderColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon
                  className="w-4 h-4"
                  style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--bg-tertiary)',
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Projects Section */}
        <div className="mt-6">
          <div className="px-3 mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <FolderGit2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Projects</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
              {stats?.totalProjects || 0}
            </span>
          </div>
          <div className="space-y-0.5">
            {projects.map((project) => {
              const isActive = selectedProject === project.path;
              return (
                <button
                  key={project.path}
                  onClick={() => {
                    onSelectProject?.(project.path);
                    onViewChange('projects');
                  }}
                  className="w-full px-3 py-2 text-left rounded-lg transition-all duration-150 border"
                  style={{
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                    borderColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }}
                    />
                    <span className="text-sm truncate flex-1">{project.name}</span>
                    <span className="text-xs" style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                      {project.sessionCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Connection Status */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Circle
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
              color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
            }}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
