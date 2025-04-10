/**
 * WebSocket service for MCP controller.
 * Handles real-time communication with MCP server via AWS API Gateway WebSocket API.
 */
export class MCPWebSocket {
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: any) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private wsUrl: string) {}

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.wsUrl);
    
    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.notifyHandlers({ type: 'connection', status: 'connected' });
    };

    this.socket.onclose = () => {
      this.notifyHandlers({ type: 'connection', status: 'disconnected' });
      this.attemptReconnect();
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.notifyHandlers(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.notifyHandlers({
        type: 'error',
        error: 'WebSocket connection error'
      });
    };
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  /**
   * Add message handler
   */
  onMessage(handler: (message: any) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }

  /**
   * Notify all message handlers
   */
  private notifyHandlers(message: any): void {
    this.messageHandlers.forEach(handler => handler(message));
  }
} 