export type ConnectionState = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
export type WebSocketListener = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<WebSocketListener>> = new Map();
  private state: ConnectionState = 'DISCONNECTED';
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private retryCount: number = 0;
  private maxRetries: number = 10;
  private reconnectTimer: any = null;
  private activeChannels: Set<string> = new Set(['network']);

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
    this.url = `${protocol}//${host}/api/ws`;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = localStorage.getItem('healthnet_token');
    const connectUrl = token ? `${this.url}?token=${encodeURIComponent(token)}` : this.url;

    this.setState(this.retryCount > 0 ? 'RECONNECTING' : 'DISCONNECTED');

    try {
      this.ws = new WebSocket(connectUrl);

      this.ws.onopen = () => {
        this.retryCount = 0;
        this.setState('CONNECTED');
        console.log('[HealthNet WebSocket] Connected to real-time event bus.');

        // Re-subscribe active channels if any
        this.activeChannels.forEach((ch) => {
          this.sendAction('subscribe', { channel: ch });
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const evName = payload.event || payload.type;
          const evData = payload.data !== undefined ? payload.data : payload;

          if (evName) {
            this.emit(evName, evData);
            this.emit('*', payload);
          }
        } catch (err) {
          console.debug('[HealthNet WebSocket] Non-JSON message received:', event.data);
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[HealthNet WebSocket] Connection warning/error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.warn('[HealthNet WebSocket] Could not establish connection:', e);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.ws = null;
    this.setState(this.retryCount < this.maxRetries ? 'RECONNECTING' : 'DISCONNECTED');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.retryCount < this.maxRetries) {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 16s
      const delay = Math.min(16000, Math.pow(2, this.retryCount) * 1000);
      this.retryCount++;
      console.log(`[HealthNet WebSocket] Reconnecting in ${delay / 1000}s (Attempt ${this.retryCount}/${this.maxRetries})...`);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    } else {
      console.warn('[HealthNet WebSocket] Reconnection paused after maximum attempts.');
      this.setState('DISCONNECTED');
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.retryCount = this.maxRetries;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('DISCONNECTED');
  }

  public subscribe(eventType: string, callback: WebSocketListener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public subscribeChannel(channel: string) {
    this.activeChannels.add(channel);
    this.sendAction('subscribe', { channel });
  }

  public unsubscribeChannel(channel: string) {
    this.activeChannels.delete(channel);
    this.sendAction('unsubscribe', { channel });
  }

  private sendAction(action: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, ...payload }));
    }
  }

  public onStateChange(callback: (state: ConnectionState) => void) {
    this.stateListeners.add(callback);
    callback(this.state);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'CONNECTED';
  }

  private setState(newState: ConnectionState) {
    this.state = newState;
    this.stateListeners.forEach((cb) => cb(newState));
  }

  private emit(eventType: string, data: any) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[HealthNet WebSocket] Listener error for ${eventType}:`, e);
        }
      });
    }
  }
}

export const websocketService = new WebSocketService();
export const wsClient = websocketService;
