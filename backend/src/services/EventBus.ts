/**
 * EventBus - 内部事件总线服务
 * 提供类型安全的事件发布/订阅机制
 */

// 内部事件声明接口
export interface InternalEventDeclaration {
  sessionChanged: {
    projectId: string;
    sessionId: string;
  };

  sessionListChanged: {
    projectId: string;
  };

  agentSessionChanged: {
    projectId: string;
    agentSessionId: string;
  };
}

// 监听器类型
type Listener<T> = (data: T) => void | Promise<void>;

/**
 * EventBus 类
 * 管理事件的注册、触发和移除
 */
class EventBus {
  private listenersMap: Map<
    keyof InternalEventDeclaration,
    Set<Listener<unknown>>
  >;

  constructor() {
    this.listenersMap = new Map();
  }

  /**
   * 获取指定事件的监听器集合
   */
  private getListeners<EventName extends keyof InternalEventDeclaration>(
    event: EventName,
  ): Set<Listener<InternalEventDeclaration[EventName]>> {
    if (!this.listenersMap.has(event)) {
      this.listenersMap.set(event, new Set());
    }
    return this.listenersMap.get(event) as Set<
      Listener<InternalEventDeclaration[EventName]>
    >;
  }

  /**
   * 注册事件监听器
   * @param event - 事件名称
   * @param listener - 监听器函数
   */
  on<EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    listener: Listener<InternalEventDeclaration[EventName]>,
  ): void {
    const listeners = this.getListeners(event);
    listeners.add(listener);
  }

  /**
   * 触发事件
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit<EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    data: InternalEventDeclaration[EventName],
  ): void {
    const listeners = this.getListeners(event);

    // 异步执行所有监听器，不阻塞主线程
    void Promise.allSettled(
      Array.from(listeners).map(async (listener) => {
        await listener(data);
      }),
    );
  }

  /**
   * 移除事件监听器
   * @param event - 事件名称
   * @param listener - 监听器函数
   */
  off<EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    listener: Listener<InternalEventDeclaration[EventName]>,
  ): void {
    const listeners = this.getListeners(event);
    listeners.delete(listener);
  }
}

// 导出单例实例
export const eventBus = new EventBus();

// 导出类，便于测试和扩展
export { EventBus };
