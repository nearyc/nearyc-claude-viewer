/**
 * SSEEventListeners - SSE 事件监听组件
 * 监听服务器推送的事件并触发全局刷新
 */

import { useEffect } from 'react';
import { useServerEvents } from './ServerEventsProvider';

// 全局事件名称常量
export const SSE_EVENTS = {
  SESSION_CHANGED: 'sse:sessionChanged',
  SESSION_LIST_CHANGED: 'sse:sessionListChanged',
  AGENT_SESSION_CHANGED: 'sse:agentSessionChanged',
  CONNECT: 'sse:connect',
} as const;

/**
 * 触发全局自定义事件
 */
function emitGlobalEvent<T>(eventName: string, detail: T): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * SSE 事件监听器组件
 * 自动监听 sessionChanged 和 sessionListChanged 事件
 * 通过全局自定义事件通知其他组件刷新数据
 */
export function SSEEventListeners(): null {
  const { addEventListener, removeEventListener } = useServerEvents();

  useEffect(() => {
    // sessionChanged 事件处理 - 单个会话更新
    const handleSessionChanged = (event: { projectId: string; sessionId: string }) => {
      console.log('[SSE] Session changed:', event.sessionId);
      emitGlobalEvent(SSE_EVENTS.SESSION_CHANGED, event);
    };

    // sessionListChanged 事件处理 - 会话列表更新
    const handleSessionListChanged = (event: { projectId: string }) => {
      console.log('[SSE] Session list changed for project:', event.projectId);
      emitGlobalEvent(SSE_EVENTS.SESSION_LIST_CHANGED, event);
    };

    // agentSessionChanged 事件处理 - Agent 会话更新
    const handleAgentSessionChanged = (event: { projectId: string; agentSessionId: string }) => {
      console.log('[SSE] Agent session changed:', event.agentSessionId);
      emitGlobalEvent(SSE_EVENTS.AGENT_SESSION_CHANGED, event);
    };

    // connect 事件处理 - 连接建立
    const handleConnect = (event: { timestamp: string }) => {
      console.log('[SSE] Connected at:', event.timestamp);
      emitGlobalEvent(SSE_EVENTS.CONNECT, event);
    };

    // 注册事件监听器
    addEventListener('sessionChanged', handleSessionChanged);
    addEventListener('sessionListChanged', handleSessionListChanged);
    addEventListener('agentSessionChanged', handleAgentSessionChanged);
    addEventListener('connect', handleConnect);

    // 清理函数
    return () => {
      removeEventListener('sessionChanged', handleSessionChanged);
      removeEventListener('sessionListChanged', handleSessionListChanged);
      removeEventListener('agentSessionChanged', handleAgentSessionChanged);
      removeEventListener('connect', handleConnect);
    };
  }, [addEventListener, removeEventListener]);

  // 此组件不渲染任何内容
  return null;
}
