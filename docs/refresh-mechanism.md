# Sessions 刷新机制说明

## 概述

本文档说明 claude-viewer 前端 Sessions 列表和 Session 详情的刷新机制。

## 刷新机制概览

### 1. Sessions 列表刷新

| 触发方式 | 频率 | 说明 |
|---------|------|------|
| 手动刷新 | 用户点击 | 点击刷新按钮时触发 `refetchSessions()` |
| 初始加载 | 页面挂载时 | `useSessions` hook 的 `useEffect` 自动加载 |
| 轮询 | **已禁用** | `sessionsPollingInterval = 0`，不自动轮询 |
| SSE 事件 | **未监听** | `sessionListChanged` 事件被后端发送但前端不处理 |
| 404 错误后 | 错误发生时 | Session 不存在时触发 `refetchSessions()` 同步状态 |

### 2. Session 详情刷新

| 触发方式 | 频率 | 说明 |
|---------|------|------|
| 选中会话 | 切换时 | `selectedSessionId` 变化时重新获取 |
| SSE 实时推送 | 实时 | 当前选中的会话有更新时自动刷新 |
| 轮询（兜底） | 5秒 | SSE 断线时 (`connectionState !== 'connected'`) |
| 手动刷新 | 用户操作 | 调用 `refetch()` 方法 |

## SSE 事件处理

### 后端发送的事件

位于 `backend/src/services/fileWatcher.ts`：

```typescript
// 每次 .jsonl 文件变化时触发
if (type === 'agent') {
  eventBus.emit('agentSessionChanged', {...});
} else {
  eventBus.emit('sessionChanged', {...});      // 单个会话更新
  eventBus.emit('sessionListChanged', {...});  // 列表更新通知
}
```

### 前端监听处理

位于 `frontend/src/App.tsx`：

```typescript
// sessionChanged - 只刷新当前选中的会话详情
const handleSessionChanged = (event) => {
  const { sessionId } = event.detail;
  if (sessionId === selectedSessionId) {
    refetchSelectedSession();  // 仅当变化的是当前选中会话
  }
};

// sessionListChanged - 未监听，不触发列表刷新
// agentSessionChanged - 仅记录日志
```

## 为什么会出现 404

### 场景描述

当点击某个 Session 时，控制台报错：
```
GET http://localhost:5173/api/sessions/xxx?full=true&limit=100 404 (Not Found)
```

### 原因分析

1. **数据不同步**：前端显示的 Sessions 列表可能已过期
2. **触发时机**：
   - 后端 `history.jsonl` 已更新（会话被删除）
   - 但前端列表尚未刷新（无自动刷新机制）
   - 用户点击了一个已删除的会话
   - 后端返回 404

3. **常见触发情况**：
   - 在另一个 Claude 窗口删除了会话
   - 文件被外部程序修改
   - 多标签页操作后切换回 viewer

### 当前处理

位于 `frontend/src/hooks/useSessions.ts`：

```typescript
// 检测到 404 时
if (axios.isAxiosError(err) && err.response?.status === 404) {
  setError('SESSION_NOT_FOUND');
  // 派发事件通知 App 刷新列表
  window.dispatchEvent(new CustomEvent('session:notFound', {
    detail: { sessionId }
  }));
}
```

位于 `frontend/src/App.tsx`：

```typescript
// 收到 404 事件后刷新列表
const handleSessionNotFound = (event) => {
  refetchSessions();  // 刷新列表
  refetchStats();     // 刷新统计数据
};
```

### 用户体验

当 404 发生时，用户会看到友好的错误提示：
- 标题："会话不存在"
- 说明："该会话可能已被删除"

## 设计决策

### 为什么 Sessions 列表不自动刷新？

1. **性能考虑**：扫描所有项目目录是昂贵操作
2. **用户体验**：列表突然变化会打断用户操作
3. **一致性**：手动刷新让用户有明确的控制感

### 为什么单个 Session 要实时刷新？

1. **实时性需求**：用户期望看到当前对话的最新状态
2. **成本较低**：单个会话的数据量小，刷新开销小
3. **上下文保持**：用户正在查看该会话，更新不会打断

## 配置项

位于 `frontend/src/App.tsx`：

```typescript
// Sessions 列表：禁用轮询
const sessionsPollingInterval = 0;

// Teams 列表：5秒轮询（轻量级）
const teamsPollingInterval = useMemo(() => {
  if (!isPageVisible) return 0;
  return shouldPoll ? 5000 : 0;
}, [shouldPoll, isPageVisible]);

// 单个 Session：5秒轮询（仅 SSE 断线时）
const sessionPollingInterval = teamsPollingInterval;
```

## 调试日志

开启控制台日志查看刷新事件：

```
[SSE] Session changed: xxx          # 单个会话更新
[SSE] Session list changed: xxx     # 列表更新（后端发送）
[App] SSE refreshing selected session: xxx  # 前端刷新详情
[App] Session not found, refreshing: xxx    # 404 后刷新
```

## 相关文件

- `frontend/src/hooks/useSessions.ts` - Sessions 数据获取逻辑
- `frontend/src/App.tsx` - 全局事件处理
- `frontend/src/lib/sse/components/SSEEventListeners.tsx` - SSE 事件监听
- `backend/src/services/fileWatcher.ts` - 后端文件监视
- `backend/src/services/EventBus.ts` - 后端事件总线
- `backend/src/services/SSEController.ts` - SSE 推送控制
