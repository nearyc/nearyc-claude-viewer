/**
 * useServerEventListener - Server-Sent Events 监听器 Hook
 * 提供类型安全的事件监听功能，支持单事件和多事件监听
 */

import { useEffect, useRef } from 'react';
import { SSEClient } from '../callSSE';

/**
 * useServerEventListener 选项
 */
export interface UseServerEventListenerOptions {
  /** 是否启用监听器，默认为 true */
  enabled?: boolean;
}

/**
 * 为单个 SSE 事件添加类型安全的监听器
 *
 * @param sseClient - SSE 客户端实例
 * @param eventName - 事件名称
 * @param listener - 事件处理函数
 * @param options - 可选配置
 *
 * @example
 * ```typescript
 * useServerEventListener(sseClient, 'sessionChanged', (event) => {
 *   console.log('Session:', event.sessionId);
 * });
 * ```
 */
export function useServerEventListener<T>(
  sseClient: SSEClient | null,
  eventName: string,
  listener: (event: T) => void,
  options?: UseServerEventListenerOptions
): void {
  const { enabled = true } = options ?? {};

  // 使用 useRef 保持监听器引用的稳定性
  // 这样即使 listener 函数在渲染间变化，也不会导致重复添加/移除监听器
  const listenerRef = useRef(listener);

  // 同步最新的 listener 到 ref
  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(() => {
    // 跳过条件：客户端为空或未启用
    if (!sseClient || !enabled) {
      return;
    }

    // 包装监听器，确保始终调用最新的 listener
    const wrappedListener = (event: T): void => {
      listenerRef.current(event);
    };

    // 添加事件监听器
    sseClient.addEventListener(eventName, wrappedListener);

    // 清理函数：组件卸载或依赖变化时移除监听器
    return () => {
      sseClient.removeEventListener(eventName, wrappedListener);
    };
  }, [sseClient, eventName, enabled]);
}

/**
 * 为多个 SSE 事件同时添加类型安全的监听器
 *
 * @param sseClient - SSE 客户端实例
 * @param listeners - 事件名称到处理函数的映射对象
 *
 * @example
 * ```typescript
 * useServerEventListeners(sseClient, {
 *   sessionChanged: (e) => console.log('Session:', e),
 *   sessionListChanged: (e) => console.log('List:', e),
 * });
 * ```
 */
export function useServerEventListeners<T extends Record<string, unknown>>(
  sseClient: SSEClient | null,
  listeners: { [K in keyof T]: (event: T[K]) => void }
): void {
  // 使用 useRef 保持监听器映射的稳定性
  const listenersRef = useRef(listeners);

  // 同步最新的 listeners 到 ref
  useEffect(() => {
    listenersRef.current = listeners;
  }, [listeners]);

  useEffect(() => {
    // 跳过条件：客户端为空
    if (!sseClient) {
      return;
    }

    // 获取所有事件名称
    const eventNames = Object.keys(listeners) as Array<keyof T>;

    // 为每个事件创建包装监听器
    const wrappedListeners = new Map<keyof T, (event: T[keyof T]) => void>();

    eventNames.forEach((eventName) => {
      const wrappedListener = (event: T[keyof T]): void => {
        listenersRef.current[eventName](event);
      };
      wrappedListeners.set(eventName, wrappedListener);
      sseClient.addEventListener(eventName as string, wrappedListener);
    });

    // 清理函数：移除所有监听器
    return () => {
      eventNames.forEach((eventName) => {
        const wrappedListener = wrappedListeners.get(eventName);
        if (wrappedListener) {
          sseClient.removeEventListener(eventName as string, wrappedListener);
        }
      });
    };
  }, [sseClient, listeners]);
}
