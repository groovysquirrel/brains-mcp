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

  public sendMessage(message: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    try {
      // Ensure message has required fields
      const formattedMessage = {
        type: message.type || 'default',
        data: {
          ...message.data,
          timestamp: new Date().toISOString(),
          source: 'frontend'
        }
      };

      console.log('Sending WebSocket message:', formattedMessage); // Debug log
      this.socket.send(JSON.stringify(formattedMessage));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
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