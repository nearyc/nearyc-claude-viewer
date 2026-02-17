import chokidar from 'chokidar';
import path from 'path';
import { EventEmitter } from 'events';
import type { FileWatcherEvent } from '../types';

export type DataSourceType = 'sessions' | 'teams' | 'projects';

export interface FileWatcherChangeEvent extends FileWatcherEvent {
  source: DataSourceType;
}

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private historyFilePath: string;
  private projectsDir: string;
  private teamsDir: string;

  constructor(historyFilePath: string, teamsDir: string) {
    super();
    this.historyFilePath = path.normalize(historyFilePath);
    this.projectsDir = path.normalize(path.join(path.dirname(historyFilePath), 'projects'));
    this.teamsDir = path.normalize(teamsDir);
  }

  start(): void {
    // Watch all three data sources:
    // 1. ~/.claude/history.jsonl (Sessions)
    // 2. ~/.claude/projects/**/*.jsonl (Session details)
    // 3. ~/.claude/teams/**/*.json (Teams)
    const watchPaths = [
      this.historyFilePath,
      path.join(this.projectsDir, '**', '*.jsonl'),
      path.join(this.teamsDir, '**', '*.json'),
    ];

    this.watcher = chokidar.watch(watchPaths, {
      ignored: [
        /(^|[\\/])\../, // ignore dotfiles
        /subagents/, // ignore subagent files
      ],
      persistent: true,
      ignoreInitial: false,
      depth: 5,
    });

    this.watcher
      .on('add', (filePath: string) => {
        console.log('[FileWatcher] File added:', filePath);
        this.emit('change', {
          path: filePath,
          type: 'add',
          source: this.getDataSource(filePath),
        } as FileWatcherChangeEvent);
      })
      .on('change', (filePath: string) => {
        console.log('[FileWatcher] File changed:', filePath);
        this.emit('change', {
          path: filePath,
          type: 'change',
          source: this.getDataSource(filePath),
        } as FileWatcherChangeEvent);
      })
      .on('unlink', (filePath: string) => {
        console.log('[FileWatcher] File removed:', filePath);
        this.emit('change', {
          path: filePath,
          type: 'unlink',
          source: this.getDataSource(filePath),
        } as FileWatcherChangeEvent);
      })
      .on('addDir', (dirPath: string) => {
        // Handle new directory creation (e.g., new team directory)
        console.log('[FileWatcher] Directory added:', dirPath);
        const normalizedDirPath = path.normalize(dirPath);
        if (normalizedDirPath.startsWith(this.teamsDir) && normalizedDirPath !== this.teamsDir) {
          // A new team directory was created, trigger teams update
          this.emit('change', {
            path: dirPath,
            type: 'addDir',
            source: 'teams',
          } as FileWatcherChangeEvent);
        }
      })
      .on('error', (error: Error) => {
        console.error('[FileWatcher] Error:', error);
        this.emit('error', error);
      })
      .on('ready', () => {
        console.log('[FileWatcher] Ready - watching:');
        console.log('  - Sessions:', this.historyFilePath);
        console.log('  - Projects:', this.projectsDir);
        console.log('  - Teams:', this.teamsDir);
        this.emit('ready');
      });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[FileWatcher] Stopped');
    }
  }

  getWatcher(): chokidar.FSWatcher | null {
    return this.watcher;
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }

  private getDataSource(filePath: string): DataSourceType {
    // Normalize path for consistent comparison (handles Windows \ vs / separators)
    const normalizedPath = path.normalize(filePath);

    if (normalizedPath === this.historyFilePath) {
      return 'sessions';
    }
    if (normalizedPath.startsWith(this.projectsDir)) {
      return 'projects';
    }
    if (normalizedPath.startsWith(this.teamsDir)) {
      return 'teams';
    }
    return 'sessions'; // Default fallback
  }
}
