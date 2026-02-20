/**
 * SSE Client Library for claude-viewer
 * Provides type-safe EventSource connection with automatic reconnection
 */

/**
 * Configuration options for the SSE client
 */
export interface CallSSEOptions {
  /** The URL to connect to (default: '/api/sse') */
  url?: string;
  /** Maximum number of reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Callback when connection is established */
  onOpen?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when connection is closed */
  onClose?: () => void;
}

/**
 * SSE Client interface for event management
 */
export interface SSEClient {
  /**
   * Add an event listener for a specific event type
   * @param eventName - The name of the event to listen for
   * @param listener - Callback function to handle the event
   */
  addEventListener<T>(eventName: string, listener: (event: T) => void): void;

  /**
   * Remove an event listener for a specific event type
   * @param eventName - The name of the event
   * @param listener - The callback function to remove
   */
  removeEventListener<T>(eventName: string, listener: (event: T) => void): void;

  /**
   * Close the SSE connection and clean up resources
   */
  close(): void;
}

/**
 * Internal listener storage type
 */
type ListenerSet = Set<(event: unknown) => void>;

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<Omit<CallSSEOptions, 'onOpen' | 'onError' | 'onClose'>> = {
  url: '/api/sse',
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
};

/**
 * Maximum delay between reconnection attempts (5 minutes)
 */
const MAX_RECONNECT_DELAY = 5 * 60 * 1000;

/**
 * Creates an SSE client with automatic reconnection support
 * @param options - Configuration options
 * @returns SSEClient instance
 */
export function callSSE(options: CallSSEOptions = {}): SSEClient {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { url, maxReconnectAttempts, reconnectDelay, onOpen, onError, onClose } = config;

  // Map to store event listeners by event name
  const listeners = new Map<string, ListenerSet>();

  // Set to store event types that need to be registered once EventSource is ready
  const pendingEventTypes = new Set<string>();

  // Connection state
  let eventSource: EventSource | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isClosed = false;

  /**
   * Calculate reconnection delay with exponential backoff
   * @returns Delay in milliseconds
   */
  function getReconnectDelay(): number {
    const delay = reconnectDelay * Math.pow(2, reconnectAttempt);
    return Math.min(delay, MAX_RECONNECT_DELAY);
  }

  /**
   * Parse event data, attempting JSON parsing
   * @param data - Raw event data
   * @returns Parsed data
   */
  function parseEventData(data: string): unknown {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  /**
   * Notify all listeners for a specific event
   * @param eventName - Name of the event
   * @param data - Event data
   */
  function notifyListeners(eventName: string, data: unknown): void {
    const eventListeners = listeners.get(eventName);
    // console.log(`[SSE Client] notifyListeners called for '${eventName}', listeners exist: ${!!eventListeners}, count: ${eventListeners?.size || 0}`);
    if (eventListeners) {
      // console.log(`[SSE Client] Notifying ${eventListeners.size} listener(s) for event '${eventName}':`, data);
      eventListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for '${eventName}':`, error);
        }
      });
    }
  }

  /**
   * Set up event handlers for the EventSource
   */
  function setupEventHandlers(): void {
    if (!eventSource) {
      return;
    }

    // Handle connection open
    eventSource.onopen = () => {
      // console.log('[SSE Client] EventSource opened, processing pending event types:', pendingEventTypes.size);
      reconnectAttempt = 0;

      // Register any pending event types that were added before connection was ready
      pendingEventTypes.forEach((eventName) => {
        registerEventSourceListener(eventName);
      });
      pendingEventTypes.clear();

      onOpen?.();
    };

    // Handle messages - route to appropriate listeners
    eventSource.onmessage = (event: MessageEvent) => {
      const data = parseEventData(event.data);
      notifyListeners('message', data);
    };

    // Handle named events
    eventSource.addEventListener('message', (event: MessageEvent) => {
      const data = parseEventData(event.data);
      notifyListeners('message', data);
    });

    // Handle errors and reconnection
    eventSource.onerror = (error: Event) => {
      const errorInstance = new Error('SSE connection error');
      onError?.(errorInstance);

      if (isClosed) {
        return;
      }

      // Attempt reconnection if not exceeded max attempts
      if (reconnectAttempt < maxReconnectAttempts) {
        reconnectAttempt++;
        const delay = getReconnectDelay();

        reconnectTimer = setTimeout(() => {
          connect();
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
        onClose?.();
      }
    };
  }

  /**
   * Establish the EventSource connection
   */
  function connect(): void {
    if (isClosed) {
      return;
    }

    try {
      eventSource = new EventSource(url);
      setupEventHandlers();
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Failed to create EventSource');
      onError?.(errorInstance);

      // Attempt reconnection on connection failure
      if (reconnectAttempt < maxReconnectAttempts && !isClosed) {
        reconnectAttempt++;
        const delay = getReconnectDelay();

        reconnectTimer = setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }

  /**
   * Register a dynamic event listener on the EventSource
   * @param eventName - Name of the event to listen for
   */
  function registerEventSourceListener(eventName: string): void {
    if (eventName === 'message') {
      return;
    }

    // If EventSource is not ready yet, queue the event type for later registration
    if (!eventSource) {
      // console.log(`[SSE Client] Queueing event type: ${eventName}`);
      pendingEventTypes.add(eventName);
      return;
    }

    // If EventSource is already connected, register immediately
    // Otherwise queue it to be processed when connection opens
    if (eventSource.readyState === EventSource.OPEN) {
      // console.log(`[SSE Client] EventSource already open, registering event type: ${eventName}`);
      eventSource.addEventListener(eventName, (event: MessageEvent) => {
        // console.log(`[SSE Client] Received event: ${eventName}`, event.data);
        const data = parseEventData(event.data);
        notifyListeners(eventName, data);
      });
    } else {
      // console.log(`[SSE Client] EventSource not open yet (readyState: ${eventSource.readyState}), queueing event type: ${eventName}`);
      pendingEventTypes.add(eventName);
    }
  }

  // Initialize connection
  connect();

  return {
    addEventListener<T>(eventName: string, listener: (event: T) => void): void {
      if (isClosed) {
        console.warn('Cannot add listener: SSE client is closed');
        return;
      }

      // console.log(`[SSE Client] addEventListener called for: ${eventName}, eventSource exists: ${!!eventSource}`);

      let eventListeners = listeners.get(eventName);
      if (!eventListeners) {
        eventListeners = new Set();
        listeners.set(eventName, eventListeners);

        // Register this event type with the EventSource if it's not the default message event
        registerEventSourceListener(eventName);
      }

      eventListeners.add(listener as (event: unknown) => void);
      // console.log(`[SSE Client] Listener added for: ${eventName}, total listeners: ${eventListeners.size}`);
    },

    removeEventListener<T>(eventName: string, listener: (event: T) => void): void {
      const eventListeners = listeners.get(eventName);
      if (eventListeners) {
        eventListeners.delete(listener as (event: unknown) => void);

        // Clean up empty listener sets
        if (eventListeners.size === 0) {
          listeners.delete(eventName);
        }
      }
    },

    close(): void {
      isClosed = true;

      // Clear any pending reconnection timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      // Close the EventSource connection
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Clear all listeners
      listeners.clear();

      onClose?.();
    },
  };
}

export default callSSE;
