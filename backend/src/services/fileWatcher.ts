import { watch, type FSWatcher } from 'fs';
import path from 'path';
import { eventBus } from './EventBus';
import { parseSessionFilePath } from '../utils/parseSessionFilePath';

/**
 * FileWatcher - 文件监视服务
 * 使用 Node.js 原生 fs.watch + 防抖机制监视项目目录中的 .jsonl 文件变化
 */
export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private projectsDir: string;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 100;
  private isWatching = false;

  constructor(projectsDir: string) {
    this.projectsDir = path.normalize(projectsDir);
  }

  /**
   * 启动文件监视
   */
  start(): void {
    if (this.isWatching) {
      console.log('[FileWatcher] Already watching');
      return;
    }

    console.log(`[FileWatcher] Starting on: ${this.projectsDir}`);

    try {
      this.watcher = watch(
        this.projectsDir,
        { recursive: true, persistent: true },
        (eventType, filename) => {
          // console.log(`[FileWatcher] Raw event received: type=${eventType}, filename=${filename || 'null'}`);
          if (!filename) return;

          // console.log(`[FileWatcher] Raw file event: ${eventType} - ${filename}`);

          // 只处理 .jsonl 文件
          if (!filename.endsWith('.jsonl')) return;

          const fileMatch = parseSessionFilePath(filename);
          // console.log(`[FileWatcher] Parsed result:`, fileMatch);

          if (fileMatch === null) return;

          // 构建防抖 key
          const debounceKey =
            fileMatch.type === 'agent'
              ? `${fileMatch.projectId}/agent-${fileMatch.agentSessionId}`
              : `${fileMatch.projectId}/${fileMatch.sessionId}`;

          this.handleFileChange(debounceKey, fileMatch);
        }
      );

      this.isWatching = true;
      console.log('[FileWatcher] Started successfully');
    } catch (error) {
      console.error('[FileWatcher] Failed to start:', error);
      throw error;
    }
  }

  /**
   * 处理文件变化（带防抖）
   */
  private handleFileChange(
    debounceKey: string,
    fileMatch: NonNullable<ReturnType<typeof parseSessionFilePath>>
  ): void {
    // console.log(`[FileWatcher] File changed: ${debounceKey}, scheduling emit...`);

    // 清除现有计时器
    const existingTimer = this.debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新计时器
    const newTimer = setTimeout(() => {
      // console.log(`[FileWatcher] Debounce completed for: ${debounceKey}`);
      this.emitEvent(fileMatch);
      this.debounceTimers.delete(debounceKey);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(debounceKey, newTimer);
  }

  /**
   * 发射事件
   */
  private emitEvent(
    fileMatch: NonNullable<ReturnType<typeof parseSessionFilePath>>
  ): void {
    if (fileMatch.type === 'agent') {
      // console.log(`[FileWatcher] Emitting agentSessionChanged: ${fileMatch.projectId}/${fileMatch.agentSessionId}`);
      eventBus.emit('agentSessionChanged', {
        projectId: fileMatch.projectId,
        agentSessionId: fileMatch.agentSessionId,
      });
    } else {
      // console.log(`[FileWatcher] Emitting sessionChanged: ${fileMatch.projectId}/${fileMatch.sessionId}`);
      eventBus.emit('sessionChanged', {
        projectId: fileMatch.projectId,
        sessionId: fileMatch.sessionId,
      });

      // console.log(`[FileWatcher] Emitting sessionListChanged: ${fileMatch.projectId}`);
      eventBus.emit('sessionListChanged', {
        projectId: fileMatch.projectId,
      });
    }
  }

  /**
   * 停止文件监视
   */
  stop(): void {
    if (!this.isWatching) {
      return;
    }

    // 清除所有防抖计时器
    for (const [, timer] of this.debounceTimers) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // 关闭 watcher
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.isWatching = false;
    console.log('[FileWatcher] Stopped');
  }

  /**
   * 获取 watcher 实例
   */
  getWatcher(): FSWatcher | null {
    return this.watcher;
  }

  /**
   * 检查是否正在监视
   */
  isWatchingActive(): boolean {
    return this.isWatching;
  }
}
