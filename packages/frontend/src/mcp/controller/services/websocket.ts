import { MCPWebSocketMessage } from '../types';

class MCPWebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: MCPWebSocketMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private apiUrl: string) {}

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.apiUrl);
    
    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers(true);
    };

    this.socket.onclose = () => {
      this.notifyConnectionHandlers(false);
      this.attemptReconnect();
    };

    this.socket.onmessage = (event) => {
      try {
        const message: MCPWebSocketMessage = JSON.parse(event.data);
        this.notifyMessageHandlers(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.notifyMessageHandlers({
        type: 'error',
        payload: 'WebSocket connection error'
      });
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onMessage(handler: (message: MCPWebSocketMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  private notifyMessageHandlers(message: MCPWebSocketMessage) {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  send(message: MCPWebSocketMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }
}

export const createWebSocketService = (apiUrl: string) => new MCPWebSocketService(apiUrl); 