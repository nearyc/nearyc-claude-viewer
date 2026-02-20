/**
 * SSE Client Library - Server-Sent Events 客户端库
 *
 * 提供类型安全的 SSE 连接管理和事件监听功能
 *
 * @example
 * ```tsx
 * // 在应用入口添加 Provider
 * <ServerEventsProvider url="/api/sse">
 *   <SSEEventListeners />
 *   <App />
 * </ServerEventsProvider>
 *
 * // 在组件中使用 hook 监听事件
 * useServerEventListener(sseClient, 'sessionChanged', (event) => {
 *   console.log('Session changed:', event);
 * });
 * ```
 */

// Core
export { callSSE } from './callSSE';
export type {
  SSEClient,
  SSEEventListener,
  CallSSEOptions,
} from './callSSE';

// Provider
export {
  ServerEventsProvider,
  useServerEvents,
  useSSEClient,
  ConnectionStatus,
} from './components/ServerEventsProvider';
export type { ServerEventsProviderProps } from './components/ServerEventsProvider';

// Event Listeners Component
export { SSEEventListeners, SSE_EVENTS } from './components/SSEEventListeners';

// Hooks
export {
  useServerEventListener,
  useServerEventListeners,
} from './hooks/useServerEventListener';
export type { UseServerEventListenerOptions } from './hooks/useServerEventListener';
