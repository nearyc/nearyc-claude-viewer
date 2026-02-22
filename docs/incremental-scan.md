# Claude Viewer 增量扫描系统

## 概述

增量扫描系统通过只处理变更的数据而非全量重新加载，大幅提升 Claude Viewer 的文件扫描性能。当 FileWatcher 检测到文件变化时，系统会精确识别哪些文件发生了变化，并只读取这些文件的新增内容。

## 为什么需要增量扫描

### 问题：全量扫描的性能瓶颈

在增量扫描之前，每次文件变化都会触发以下流程：

```
FileWatcher 检测到变化
  ↓
sessionsService.clearCache()  // 清空整个缓存
  ↓
SessionLoader.loadSessions()  // 全文读取 history.jsonl
ProjectScanner.scanProjectsDirectory()  // 扫描所有项目目录
  ↓
重新构建所有 Session 和 Project
```

当会话数量达到数百个时，这个过程会导致明显的延迟。

### 解决方案：增量扫描

增量扫描系统通过以下机制大幅提升性能：

1. **文件级脏检测** - 利用文件修改时间和大小判断文件是否变化
2. **增量加载 history.jsonl** - 记录上次读取位置，只读取新增行
3. **增量扫描项目目录** - 只处理新增/修改/删除的文件
4. **精细化缓存更新** - 只更新变更的会话，不清空整个缓存

## 架构设计

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                     SessionRepository                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  loadSessions()                                       │  │
│  │    ├─ 检查 cache.isValid()                            │  │
│  │    ├─ sessionLoader.loadIncremental()                 │  │
│  │    └─ projectScanner.scanIncremental()                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  SessionCache │    │ SessionLoader │    │ProjectScanner │
│               │    │               │    │               │
│ - sessions    │    │ - loadSessions│    │ - scanProjects│
│ - projects    │    │ - loadIncr... │    │ - scanIncr... │
│ - fileCache   │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

### 数据流

```
首次加载 (Cache Empty)
  │
  ├─► SessionLoader.loadSessions() ──► 全量加载 history.jsonl
  │
  ├─► ProjectScanner.scanProjectsDirectory() ──► 全量扫描项目目录
  │
  └─► 初始化 fileCache (记录每个文件的 mtime/size)

后续加载 (Incremental)
  │
  ├─► history.jsonl 追加内容
  │   └─► SessionLoader.loadIncremental(lastPosition)
  │       └─► 只读取新增的字节
  │
  ├─► 会话文件变化
  │   └─► ProjectScanner.scanIncremental(fileCache)
  │       ├─► 新增文件 ──► 读取并添加
  │       ├─► 修改文件 ──► 重新读取更新
  │       └─► 删除文件 ──► 从缓存移除
  │
  └─► 精细化更新缓存 (不调用 clearCache)
```

## 实现细节

### 1. SessionCache 增强

新增方法支持精细化缓存管理：

```typescript
// 更新单个会话（不触发全量重建）
updateSession(session: Session): void

// 更新单个项目
updateProject(project: Project): void

// 获取所有缓存的会话ID
getCachedSessionIds(): string[]

// 获取文件缓存快照
getAllFileCache(): Map<string, FileCacheEntry>

// 重新计算项目统计
updateProjectStats(projectPath: string): void
```

### 2. SessionLoader 增量加载

利用追加写入特性，只读取新增内容：

```typescript
async loadIncremental(
  existingSessions: Map<string, Session>,
  existingProjects: Map<string, Project>,
  lastPosition: number
): Promise<{
  sessions: Map<string, Session>;
  projects: Map<string, Project>;
  newPosition: number;  // 新的文件读取位置
}>
```

关键实现：
- 使用 `fs.stat()` 获取文件当前大小
- 使用 `createReadStream({ start: lastPosition })` 从上次位置读取
- 处理边界情况：文件截断时自动全量重新加载

### 3. ProjectScanner 增量扫描

只处理变化的文件：

```typescript
async scanIncremental(
  sessions: Map<string, Session>,
  projects: Map<string, Project>,
  fileCache: Map<string, FileCacheEntry>
): Promise<{
  updated: boolean;
  updatedSessions: string[];
  deletedSessions: string[];
}>
```

检测逻辑：
- 文件在 disk 但不在 fileCache → **新增文件**
- 文件在 disk 也在 fileCache，但 mtime/size 不同 → **修改文件**
- 文件不在 disk 但在 fileCache → **删除文件**

### 4. SessionRepository 整合

重写 `loadSessions()` 实现智能加载：

```typescript
async loadSessions(): Promise<Map<string, Session>> {
  // 1. 检查缓存有效性
  if (this.cache.isValid(currentMtime)) {
    return this.cache.getAllSessions();
  }

  // 2. 获取现有缓存作为基础
  let sessions = this.cache.getAllSessions();
  let projects = this.cache.getAllProjects();

  // 3. 首次加载或缓存为空时全量加载
  if (sessions.size === 0) {
    const result = await this.sessionLoader.loadSessions();
    sessions = result.sessions;
    projects = result.projects;
  }

  // 4. 增量加载 history.jsonl
  const incrementalResult = await this.sessionLoader.loadIncremental(
    sessions, projects, this.historyFilePosition
  );
  this.historyFilePosition = incrementalResult.newPosition;

  // 5. 增量扫描项目目录
  const fileCache = this.cache.getAllFileCache();
  await this.projectScanner.scanIncremental(sessions, projects, fileCache);

  // 6. 更新缓存
  this.cache.setSessions(sessions);
  this.cache.setProjects(projects);

  return sessions;
}
```

### 5. SessionsService 优化

移除 `handleFileChange` 中的 `clearCache()` 调用：

```typescript
// 之前：每次变化都清空缓存
async handleFileChange(event: FileWatcherEvent) {
  this.clearCache();  // ❌ 全量清空
  await this.loadSessions();
}

// 之后：使用增量加载
async handleFileChange(event: FileWatcherEvent) {
  // ✅ 直接调用增量加载，不清空缓存
  await this.loadSessions();
}
```

## 性能对比

### 基准测试结果

| 场景 | 全量扫描 | 增量扫描 | 提升 |
|------|----------|----------|------|
| 100会话，无变化 | 读取100个文件 | 只检查mtime | **~100x** |
| 100会话，1个变化 | 读取100个文件 | 读取1个文件 | **~100x** |
| 1000会话，无变化 | 读取1000个文件 | 只检查mtime | **~1000x** |
| 1000会话，10个变化 | 读取1000个文件 | 读取10个文件 | **~100x** |
| history.jsonl 追加1行 | 全文读取(1MB) | 只读1行(~100B) | **~10000x** |

### 实际应用场景

- **启动时**：首次全量加载，后续启动利用缓存
- **新会话创建**：只读取新增的会话文件
- **会话更新**：只重新读取变更的会话
- **会话删除**：只从缓存中移除对应条目
- **history.jsonl 追加**：只读取新增的行

## 日志输出

增量扫描系统会输出详细的日志便于调试：

```
[SessionLoader] Incremental load: 1024 bytes, 5 new entries
[ProjectScanner] Added new session abc-123
[ProjectScanner] Updated session def-456
[ProjectScanner] Removed deleted session ghi-789
[ProjectScanner] Incremental scan: 2 added/updated, 1 deleted
[SessionRepository] Loaded 150 sessions from 12 projects
```

## 故障排除

### 常见问题

#### 1. 文件被截断或清空

**现象**：history.jsonl 被清空后，会话列表仍然显示旧数据

**解决**：增量加载检测到 `lastPosition > fileSize` 时会自动全量重新加载

```typescript
if (lastPosition > fileSize) {
  console.log('[SessionLoader] File truncated, reloading from beginning');
  const result = await this.loadSessions();  // 全量加载
  return { sessions: result.sessions, projects: result.projects, newPosition: fileSize };
}
```

#### 2. 文件修改时间未变化但内容变化

**现象**：某些操作后文件显示未变化

**解决**：系统同时检查 mtime 和 size，任一变化都会触发重新读取

```typescript
private hasFileChanged(cached: FileCacheEntry | undefined, current: FileCacheEntry): boolean {
  if (!cached) return true;
  return cached.mtime !== current.mtime || cached.size !== current.size;
}
```

#### 3. 缓存数据不一致

**现象**：删除的会话仍然显示在列表中

**解决**：增量扫描会检测删除的文件并从缓存中移除

```typescript
// 在 scanIncremental 中
for (const [filePath, cachedEntry] of fileCache) {
  if (processedFiles.has(filePath)) continue;
  // 文件在缓存中但不在磁盘上，说明已被删除
  sessions.delete(sessionId);
  deletedSessions.push(sessionId);
}
```

## 扩展指南

### 添加更多增量检测

如果需要监控其他类型的文件变化，可以扩展 `scanIncremental`：

```typescript
// 在 collectCurrentFiles 中添加其他文件类型
const allFiles = files.filter(f =>
  f.endsWith('.jsonl') ||
  f.endsWith('.json') ||
  f.endsWith('.md')
);
```

### 自定义缓存策略

可以修改 `isFileDirty` 实现更复杂的缓存策略：

```typescript
// 例如：添加校验和检测
isFileDirty(filePath: string, mtime: number, size: number, checksum?: string): boolean {
  const cached = this.fileCache.get(filePath);
  if (!cached) return true;
  if (cached.mtime !== mtime || cached.size !== size) return true;
  if (checksum && cached.checksum !== checksum) return true;
  return false;
}
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `backend/src/services/sessions/SessionCache.ts` | 缓存管理 |
| `backend/src/services/sessions/SessionLoader.ts` | history.jsonl 加载 |
| `backend/src/services/sessions/ProjectScanner.ts` | 项目目录扫描 |
| `backend/src/services/sessions/SessionRepository.ts` | 仓库整合 |
| `backend/src/services/sessionsService.ts` | 服务层 |

## 未来优化

1. **预加载优化**：启动时预加载最近活跃的会话
2. **后台刷新**：定时后台增量刷新，减少用户等待
3. **多级缓存**：引入持久化缓存，重启后快速恢复
4. **批量更新**：合并短时间内的大量文件变化通知
