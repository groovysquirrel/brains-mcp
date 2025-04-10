export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface WebSocketOptions {
  url: string;
  token?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: any) => void;
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];
  private connectionHandlers: ((isConnected: boolean) => void)[] = [];
  private reconnectTimeout: number = 2000;
  private reconnectAttempt: number = 0;
  private maxReconnectAttempts: number = 5;
  private token: string | undefined;
  private url: string;

  constructor(options: WebSocketOptions) {
    this.url = options.url;
    this.token = options.token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Append token as query parameter if available
        const wsUrl = this.token 
          ? `${this.url}${this.url.includes('?') ? '&' : '?'}token=${this.token}`
          : this.url;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempt = 0;
          this.notifyConnectionHandlers(true);
          resolve();
        };
        
        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.notifyConnectionHandlers(false);
          this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.notifyMessageHandlers(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      this.reconnectAttempt++;
      console.log(`Attempting to reconnect (${this.reconnectAttempt}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnect handled by onclose
        });
      }, this.reconnectTimeout);
      
      // Exponential backoff
      this.reconnectTimeout = Math.min(30000, this.reconnectTimeout * 1.5);
    } else {
      console.error('Maximum reconnection attempts reached.');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  sendMessage(action: string, data: any = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }
    
    // Format message according to the expected backend format
    const message = { action, data };
    
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  onMessage(handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: (isConnected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  private notifyMessageHandlers(message: WebSocketMessage) {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyConnectionHandlers(isConnected: boolean) {
    this.connectionHandlers.forEach(handler => handler(isConnected));
  }

  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  updateToken(token: string) {
    this.token = token;
  }
} 