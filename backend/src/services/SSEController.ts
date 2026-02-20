/**
 * SSEController - Server-Sent Events 控制器
 * 管理 SSE 客户端连接，监听 EventBus 事件并推送到客户端
 */

import type { Response } from 'express';
import { eventBus, type InternalEventDeclaration } from './EventBus';

// SSE 事件声明接口
export interface SSEEventDeclaration {
  connect: {
    timestamp: string;
  };
  sessionChanged: {
    projectId: string;
    sessionId: string;
    timestamp: string;
  };
  sessionListChanged: {
    projectId: string;
    timestamp: string;
  };
  agentSessionChanged: {
    projectId: string;
    agentSessionId: string;
    timestamp: string;
  };
}

// SSE 客户端连接接口
interface SSEClient {
  id: string;
  response: Response;
  connectedAt: Date;
}

// SSE 消息格式
interface SSEMessage {
  event: string;
  id: string;
  data: string;
  timestamp: string;
}

/**
 * 生成 ULID 格式的 ID
 * 使用 timestamp + random 模拟 ULID
 */
function generateUlid(): string {
  const timestamp = Date.now().toString(36).toUpperCase().padStart(8, '0');
  const random = Math.random().toString(36).substring(2, 12).toUpperCase().padStart(10, '0');
  return `${timestamp}${random}`;
}

/**
 * 写入 SSE 事件
 * @param client - SSE 客户端连接
 * @param eventName - 事件名称
 * @param data - 事件数据
 */
function writeSSE<EventName extends keyof SSEEventDeclaration>(
  client: SSEClient,
  eventName: EventName,
  data: Omit<SSEEventDeclaration[EventName], 'timestamp'>,
): void {
  const message: SSEMessage = {
    event: eventName,
    id: generateUlid(),
    data: JSON.stringify({
      kind: eventName,
      ...data,
    }),
    timestamp: new Date().toISOString(),
  };

  const sseData = [
    `id: ${message.id}`,
    `event: ${message.event}`,
    `data: ${message.data}`,
  ].join('\n') + '\n\n';

  client.response.write(sseData);
}

/**
 * SSEController 类
 * 管理 SSE 客户端连接列表，监听 EventBus 事件并推送
 */
class SSEController {
  private clients: Map<string, SSEClient>;
  private heartbeatInterval: NodeJS.Timeout | null;
  private readonly heartbeatIntervalMs: number;

  constructor(heartbeatIntervalMs: number = 30000) {
    this.clients = new Map();
    this.heartbeatInterval = null;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  /**
   * 启动心跳定时器
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      this.broadcast('connect', { timestamp: new Date().toISOString() });
    }, this.heartbeatIntervalMs);
  }

  /**
   * 停止心跳定时器
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 注册 EventBus 事件监听器
   */
  private registerEventListeners(): void {
    // sessionChanged 事件处理
    const onSessionChanged = (event: InternalEventDeclaration['sessionChanged']) => {
      this.broadcast('sessionChanged', {
        projectId: event.projectId,
        sessionId: event.sessionId,
      });
    };

    // sessionListChanged 事件处理
    const onSessionListChanged = (event: InternalEventDeclaration['sessionListChanged']) => {
      this.broadcast('sessionListChanged', {
        projectId: event.projectId,
      });
    };

    // agentSessionChanged 事件处理
    const onAgentSessionChanged = (event: InternalEventDeclaration['agentSessionChanged']) => {
      this.broadcast('agentSessionChanged', {
        projectId: event.projectId,
        agentSessionId: event.agentSessionId,
      });
    };

    // 注册监听器
    eventBus.on('sessionChanged', onSessionChanged);
    eventBus.on('sessionListChanged', onSessionListChanged);
    eventBus.on('agentSessionChanged', onAgentSessionChanged);

    // 保存监听器引用以便清理
    this.eventListeners = {
      onSessionChanged,
      onSessionListChanged,
      onAgentSessionChanged,
    };
  }

  // 存储事件监听器引用
  private eventListeners: {
    onSessionChanged: (event: InternalEventDeclaration['sessionChanged']) => void;
    onSessionListChanged: (event: InternalEventDeclaration['sessionListChanged']) => void;
    onAgentSessionChanged: (event: InternalEventDeclaration['agentSessionChanged']) => void;
  } | null = null;

  /**
   * 注销 EventBus 事件监听器
   */
  private unregisterEventListeners(): void {
    if (this.eventListeners) {
      eventBus.off('sessionChanged', this.eventListeners.onSessionChanged);
      eventBus.off('sessionListChanged', this.eventListeners.onSessionListChanged);
      eventBus.off('agentSessionChanged', this.eventListeners.onAgentSessionChanged);
      this.eventListeners = null;
    }
  }

  /**
   * 处理新的 SSE 连接
   * @param response - Express Response 对象
   * @returns 客户端 ID
   */
  handleConnection(response: Response): string {
    const clientId = generateUlid();

    // 设置 SSE 响应头
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    });

    const client: SSEClient = {
      id: clientId,
      response,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    // 发送连接成功事件
    writeSSE(client, 'connect', {
      timestamp: new Date().toISOString(),
    });

    // Note: Event listeners are now registered in server.ts
    // to ensure events are always broadcast even if no clients are connected.
    // The registerEventListeners() method is kept for potential future use
    // but is not called here to avoid duplicate broadcasts.

    // 启动心跳
    this.startHeartbeat();

    // 处理连接关闭
    response.on('close', () => {
      this.removeClient(clientId);
    });

    response.on('error', (error) => {
      console.error(`[SSEController] Client ${clientId} error:`, error);
      this.removeClient(clientId);
    });

    console.log(`[SSEController] Client connected: ${clientId}, total clients: ${this.clients.size}`);

    return clientId;
  }

  /**
   * 移除客户端连接
   * @param clientId - 客户端 ID
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`[SSEController] Client disconnected: ${clientId}, remaining clients: ${this.clients.size}`);

      // 如果没有客户端了，停止心跳和注销监听器
      if (this.clients.size === 0) {
        this.stopHeartbeat();
        this.unregisterEventListeners();
      }
    }
  }

  /**
   * 广播事件到所有连接的客户端
   * @param eventName - 事件名称
   * @param data - 事件数据
   */
  broadcast<EventName extends keyof SSEEventDeclaration>(
    eventName: EventName,
    data: Omit<SSEEventDeclaration[EventName], 'timestamp'>,
  ): void {
    const timestamp = new Date().toISOString();
    const fullData = { ...data, timestamp } as SSEEventDeclaration[EventName];

    const clientCount = this.clients.size;
    console.log(`[SSEController] Broadcasting '${eventName}' to ${clientCount} client(s):`, data);

    if (clientCount === 0) {
      console.log(`[SSEController] No clients connected, event '${eventName}' not sent`);
      return;
    }

    for (const client of this.clients.values()) {
      try {
        writeSSE(client, eventName, fullData);
        console.log(`[SSEController] Sent '${eventName}' to client ${client.id}`);
      } catch (error) {
        console.error(`[SSEController] Failed to send to client ${client.id}:`, error);
        this.removeClient(client.id);
      }
    }
  }

  /**
   * 获取当前连接的客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 获取所有客户端信息
   */
  getClients(): Array<{ id: string; connectedAt: Date }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
    }));
  }

  /**
   * 关闭所有连接并清理资源
   */
  closeAll(): void {
    this.stopHeartbeat();
    this.unregisterEventListeners();

    for (const client of this.clients.values()) {
      try {
        client.response.end();
      } catch (error) {
        // 忽略关闭时的错误
      }
    }

    this.clients.clear();
    console.log('[SSEController] All connections closed');
  }
}

// 导出单例实例
export const sseController = new SSEController();

// 导出类和类型
export { SSEController };
export type { SSEClient, SSEMessage };
