/**
 * ServerEventsProvider - SSE 连接上下文提供者
 * 管理全局 SSE 连接，为子组件提供 SSE 客户端实例
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { callSSE, type SSEClient, type SSEEventListener } from '../callSSE';

interface ServerEventsContextValue {
  /** SSE 客户端实例 */
  sseClient: SSEClient | null;
  /** 连接状态 */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** 连接错误信息 */
  error: Error | null;
  /** 手动重连 */
  reconnect: () => void;
  /** 添加事件监听器 */
  addEventListener: <T>(eventName: string, listener: SSEEventListener<T>) => void;
  /** 移除事件监听器 */
  removeEventListener: <T>(eventName: string, listener: SSEEventListener<T>) => void;
}

const ServerEventsContext = createContext<ServerEventsContextValue | null>(null);

export interface ServerEventsProviderProps {
  children: React.ReactNode;
  /** SSE 端点 URL */
  url?: string;
  /** 是否自动连接 */
  autoConnect?: boolean;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
}

/**
 * 获取 SSE 上下文
 */
export function useServerEvents(): ServerEventsContextValue {
  const context = useContext(ServerEventsContext);
  if (!context) {
    throw new Error('useServerEvents must be used within a ServerEventsProvider');
  }
  return context;
}

/**
 * 获取 SSE 客户端实例
 */
export function useSSEClient(): SSEClient | null {
  return useServerEvents().sseClient;
}

/**
 * ServerEventsProvider 组件
 *
 * @example
 * ```tsx
 * <ServerEventsProvider url="/api/sse">
 *   <App />
 * </ServerEventsProvider>
 * ```
 */
type PendingListener = { eventName: string; listener: SSEEventListener<unknown> };

export function ServerEventsProvider({
  children,
  url = '/api/sse',
  autoConnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 3000,
}: ServerEventsProviderProps): React.ReactElement {
  const sseClientRef = useRef<SSEClient | null>(null);
  const pendingListenersRef = useRef<PendingListener[]>([]);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [error, setError] = useState<Error | null>(null);

  /**
   * 建立 SSE 连接
   */
  const connect = useCallback(() => {
    if (!autoConnect) return;

    // 关闭现有连接
    if (sseClientRef.current) {
      sseClientRef.current.close();
    }

    setConnectionState('connecting');
    setError(null);

    console.log(`[ServerEventsProvider] Connecting to SSE: ${url}`);

    try {
      const client = callSSE({
        url,
        maxReconnectAttempts,
        reconnectDelay,
        onOpen: () => {
          console.log('[ServerEventsProvider] SSE connected');
          setConnectionState('connected');
          setError(null);

          // 处理队列中等待的监听器
          if (pendingListenersRef.current.length > 0) {
            console.log(`[ServerEventsProvider] Processing ${pendingListenersRef.current.length} pending listeners`);
            pendingListenersRef.current.forEach(({ eventName, listener }) => {
              client.addEventListener(eventName, listener);
            });
            pendingListenersRef.current = [];
          }
        },
        onError: (err) => {
          console.error('[ServerEventsProvider] SSE error:', err);
          setConnectionState('error');
          setError(err instanceof Error ? err : new Error('SSE connection error'));
        },
        onClose: () => {
          console.log('[ServerEventsProvider] SSE disconnected');
          setConnectionState('disconnected');
          // 注意：不在这里清空 pendingListeners，因为重连时还需要它们
        },
      });

      sseClientRef.current = client;
    } catch (err) {
      setConnectionState('error');
      setError(err instanceof Error ? err : new Error('Failed to create SSE connection'));
    }
  }, [autoConnect, url, maxReconnectAttempts, reconnectDelay]);

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  /**
   * 添加事件监听器
   */
  const addEventListener = useCallback(<T,>(eventName: string, listener: SSEEventListener<T>) => {
    console.log(`[ServerEventsProvider] addEventListener called: ${eventName}, client exists: ${!!sseClientRef.current}`);

    // 如果 client 已准备好，直接添加监听器
    if (sseClientRef.current) {
      sseClientRef.current.addEventListener(eventName, listener);
      return;
    }

    // 如果 client 尚未准备好，加入队列等待连接建立后处理
    console.log(`[ServerEventsProvider] Queuing listener for '${eventName}' (client not ready)`);
    pendingListenersRef.current.push({ eventName, listener: listener as SSEEventListener<unknown> });
  }, []);

  /**
   * 移除事件监听器
   */
  const removeEventListener = useCallback(<T,>(eventName: string, listener: SSEEventListener<T>) => {
    // 如果 client 已存在，直接移除监听器
    if (sseClientRef.current) {
      sseClientRef.current.removeEventListener(eventName, listener);
      return;
    }

    // 如果 client 不存在，从队列中移除对应的监听器
    pendingListenersRef.current = pendingListenersRef.current.filter(
      (item) => item.eventName !== eventName || item.listener !== listener
    );
  }, []);

  // 组件挂载时建立连接
  useEffect(() => {
    connect();

    return () => {
      sseClientRef.current?.close();
      sseClientRef.current = null;
    };
  }, [connect]);

  const value: ServerEventsContextValue = {
    sseClient: sseClientRef.current,
    connectionState,
    error,
    reconnect,
    addEventListener,
    removeEventListener,
  };

  return (
    <ServerEventsContext.Provider value={value}>
      {children}
    </ServerEventsContext.Provider>
  );
}

/**
 * SSE 连接状态指示器组件
 */
export function ConnectionStatus(): React.ReactElement {
  const { connectionState } = useServerEvents();

  const statusConfig = {
    connecting: { color: '#f59e0b', text: '连接中...' },
    connected: { color: '#10b981', text: '已连接' },
    disconnected: { color: '#6b7280', text: '已断开' },
    error: { color: '#ef4444', text: '连接错误' },
  };

  const config = statusConfig[connectionState];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: config.color,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.color,
          animation: connectionState === 'connecting' ? 'pulse 1.5s infinite' : undefined,
        }}
      />
      {config.text}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
}
