# Claude Viewer 消息推送性能优化总结

## 概述

本次优化解决了 claude-viewer 项目在处理大量消息时的性能问题。原先的实现会一次性加载 session 的全部消息，当消息数量达到几百甚至上千条时，会造成严重的性能瓶颈。

## 优化方案

### 核心思路
- **默认只返回最近 50 条消息** - 大幅减少初始加载时间和数据传输量
- **"加载所有"按钮** - 当消息总数超过 50 条时，用户可以手动加载剩余消息
- **向后兼容** - 不传 limit 参数时，API 仍然返回全部消息

## 技术实现

### 后端变更

#### 1. 类型定义 (`backend/src/types/index.ts`)

在 `Session` 接口中添加了 `hasMore` 字段：

```typescript
export interface Session {
  // ... 现有字段
  hasMore?: boolean;  // 新增：表示是否还有更多消息未加载
}
```

#### 2. ConversationLoader (`backend/src/services/sessions/ConversationLoader.ts`)

新增 `loadConversationWithLimit` 方法，支持分页加载：

```typescript
async loadConversationWithLimit(
  sessionId: string,
  projectPath: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{
  messages: ChatMessage[];
  totalCount: number;
  hasMore: boolean;
}> {
  const { limit, offset = 0 } = options;

  // 先加载全部消息（保持向后兼容）
  const allMessages = await this.loadFullConversation(sessionId, projectPath);
  const totalCount = allMessages.length;

  // 如果有限制且总数超过限制，只返回最后的 limit 条
  let messages = allMessages;
  if (limit !== undefined && limit < totalCount) {
    messages = allMessages.slice(-limit);
  }

  return {
    messages,
    totalCount,
    hasMore: totalCount > (offset + messages.length),
  };
}
```

#### 3. SessionsService (`backend/src/services/sessionsService.ts`)

- 修改 `getSessionWithConversation` 方法，支持 `limit` 参数
- 新增 `getSessionMessages` 方法，支持按 offset/limit 获取特定范围消息

```typescript
async getSessionWithConversation(
  sessionId: string,
  options: { limit?: number } = {}
): Promise<Session | null> {
  const session = await this.getSessionById(sessionId);
  if (!session) return null;

  const { messages, totalCount, hasMore } = await this.conversationLoader
    .loadConversationWithLimit(sessionId, session.project, options);

  return {
    ...session,
    messages,
    messageCount: totalCount,
    hasMore,
    updatedAt,
  };
}

async getSessionMessages(
  sessionId: string,
  offset: number,
  limit: number | 'all'
): Promise<{ messages: ChatMessage[]; total: number; offset: number; limit: number | 'all'; hasMore: boolean }> {
  // 实现分页加载逻辑
}
```

#### 4. API 路由 (`backend/src/routes/sessions.ts`)

新增消息分页路由：

```typescript
// GET /api/sessions/:id - 支持 limit 参数
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { full, limit } = req.query;

  let session;
  if (full === 'true') {
    const limitNum = limit ? parseInt(limit as string, 10) : undefined;
    session = await sessionsService.getSessionWithConversation(id, { limit: limitNum });
  } else {
    session = await sessionsService.getSessionById(id);
  }

  sendSuccess(res, session);
});

// GET /api/sessions/:id/messages - 分页获取消息
router.get('/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { offset, limit } = req.query;

  const offsetNum = offset ? parseInt(offset as string, 10) : 0;
  const limitValue = limit === 'all' ? 'all' : parseInt(limit as string, 10) || 100;

  const result = await sessionsService.getSessionMessages(id, offsetNum, limitValue);
  sendSuccess(res, result);
});
```

### 前端变更

#### 1. 类型定义 (`frontend/src/types/index.ts`)

在 `Session` 接口中添加了 `hasMore` 字段，与后端保持一致。

#### 2. useSessions Hook (`frontend/src/hooks/useSessions.ts`)

修改 `useSession` hook，支持 `messageLimit` 参数：

```typescript
export function useSession(
  sessionId: string | null,
  pollInterval: number = 0,
  fullConversation: boolean = true,
  messageLimit?: number  // 新增参数
) {
  const fetchSession = useCallback(async (silent = false) => {
    // ...
    const params: Record<string, string> = {};
    if (fullConversation) {
      params.full = 'true';
      if (messageLimit !== undefined) {
        params.limit = messageLimit.toString();
      }
    }
    const response = await axios.get<ApiResponse<Session>>(url, { params });
    // ...
  }, [sessionId, fullConversation, messageLimit]);
  // ...
}
```

#### 3. useSessionQueries Hook (`frontend/src/hooks/useSessionQueries.ts`)

新增 `useLoadMoreMessagesMutation` hook：

```typescript
export const useLoadMoreMessagesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; offset: number }) => {
      const response = await axios.get<ApiResponse<{
        messages: ChatMessage[];
        totalCount: number;
      }>>(`${API_BASE}/sessions/${params.sessionId}/messages?offset=${params.offset}&limit=all`);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // 更新缓存，追加消息
      queryClient.setQueryData(['session', variables.sessionId, 50], (old: Session | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, ...data.messages],
          hasMore: false,  // 已加载所有
        };
      });
    },
  });
};
```

#### 4. SessionDetail 组件 (`frontend/src/components/SessionDetail.tsx`)

添加"加载所有消息"按钮：

```tsx
export const SessionDetail: React.FC<SessionDetailProps> = ({ session, isUpdating }) => {
  const loadMoreMutation = useLoadMoreMessagesMutation();

  const handleLoadAll = useCallback(() => {
    if (session?.sessionId && session.hasMore) {
      loadMoreMutation.mutate({
        sessionId: session.sessionId,
        offset: session.messages.length,
      });
    }
  }, [session, loadMoreMutation]);

  return (
    <div className="flex flex-col h-full">
      {/* ... */}
      {session?.hasMore && (
        <div className="px-4 py-3 border-b text-center">
          <button
            onClick={handleLoadAll}
            disabled={loadMoreMutation.isPending}
          >
            {loadMoreMutation.isPending
              ? '加载中...'
              : `加载所有消息 (${session.messageCount} 条)`}
          </button>
        </div>
      )}
      {/* ... */}
    </div>
  );
};
```

#### 5. App 组件 (`frontend/src/App.tsx`)

使用 `limit=50` 获取 session：

```typescript
const { session: selectedSession, refetch: refetchSelectedSession } =
  useSession(selectedSessionId, 10000, true, 50);
```

## API 文档

### GET /api/sessions/:id

获取 session 详情，支持限制返回的消息数量。

**参数：**
- `full` (可选) - 如果为 `true`，返回包含消息的完整 session
- `limit` (可选) - 限制返回的消息数量，不传则返回全部

**示例：**
```bash
# 获取最近 50 条消息
GET /api/sessions/xxx?full=true&limit=50

# 获取全部消息（向后兼容）
GET /api/sessions/xxx?full=true
```

### GET /api/sessions/:id/messages

分页获取 session 的消息。

**参数：**
- `offset` (可选, 默认 0) - 起始位置
- `limit` (可选, 默认 100, 可传 'all') - 每页数量

**示例：**
```bash
# 获取从第 50 条开始的所有消息
GET /api/sessions/xxx/messages?offset=50&limit=all

# 分页获取，每页 100 条
GET /api/sessions/xxx/messages?offset=0&limit=100
```

**响应：**
```json
{
  "success": true,
  "data": {
    "messages": [...],
    "total": 1000,
    "offset": 0,
    "limit": 100,
    "hasMore": true
  }
}
```

## 性能提升

### 优化前
- 加载一个有 1000 条消息的 session：需要传输 1000 条消息的完整数据
- 初始加载时间长，内存占用高

### 优化后
- 默认只加载最近 50 条消息：传输数据量减少 95%
- 用户可以根据需要手动加载剩余消息
- 对于消息较少的 session（< 50 条），行为与之前完全一致

## 向后兼容性

- **API 层**：不传 `limit` 参数时，API 仍然返回全部消息，保持现有行为
- **前端层**：所有现有组件继续使用原有接口，无需修改

## 后续优化方向

1. **虚拟滚动**：当消息数量极大时，使用 react-window 或 react-virtualized 实现虚拟滚动
2. **更细粒度的分页**：支持"加载更多"（逐步加载）而不是"加载所有"
3. **缓存策略优化**：前端缓存已加载的消息页，避免重复请求
4. **反向读取优化**：对于超大文件，实现从文件末尾反向读取最后 N 条消息

## 开发团队

本次优化使用 **team-better** 蜂群模式开发，并行完成多个模块：
- **backend-core-dev**: 后端核心功能（ConversationLoader、SessionsService、types）
- **backend-api-dev**: 后端 API 路由
- **frontend-dev**: 前端 hooks 和 types
- **team-lead**: 前端组件集成和测试验证
