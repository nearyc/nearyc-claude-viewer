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
export function ServerEventsProvider({
  children,
  url = '/api/sse',
  autoConnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 3000,
}: ServerEventsProviderProps): React.ReactElement {
  const sseClientRef = useRef<SSEClient | null>(null);
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

    try {
      const client = callSSE({
        url,
        maxReconnectAttempts,
        reconnectDelay,
        onOpen: () => {
          setConnectionState('connected');
          setError(null);
        },
        onError: (err) => {
          setConnectionState('error');
          setError(err instanceof Error ? err : new Error('SSE connection error'));
        },
        onClose: () => {
          setConnectionState('disconnected');
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
    sseClientRef.current?.addEventListener(eventName, listener);
  }, []);

  /**
   * 移除事件监听器
   */
  const removeEventListener = useCallback(<T,>(eventName: string, listener: SSEEventListener<T>) => {
    sseClientRef.current?.removeEventListener(eventName, listener);
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
