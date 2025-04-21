import { WebSocketService, WebSocketOptions } from '../../lib/websocket';
import { fetchAuthSession } from 'aws-amplify/auth';

// --- Simple Browser-Friendly Event Emitter ---
class SimpleEventEmitter {
    private listeners: { [eventName: string]: Function[] } = {};

    on(eventName: string, listener: Function): () => void {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(listener);

        // Return an unsubscribe function
        return () => {
            this.listeners[eventName] = this.listeners[eventName].filter(l => l !== listener);
            if (this.listeners[eventName].length === 0) {
                delete this.listeners[eventName]; // Clean up empty arrays
            }
        };
    }

    emit(eventName: string, ...args: any[]): void {
        if (this.listeners[eventName]) {
            // Copy listeners array in case one listener unsubscribes another
            const currentListeners = [...this.listeners[eventName]];
            currentListeners.forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in listener for event "${eventName}":`, error);
                }
            });
        }
    }

    removeAllListeners(eventName?: string): void {
        if (eventName) {
            delete this.listeners[eventName];
        } else {
            this.listeners = {};
        }
    }
}
// --- End SimpleEventEmitter ---

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Manages the raw WebSocket connection lifecycle, authentication, and events.
 */
export class WebSocketConnection extends SimpleEventEmitter {
    private websocket: WebSocketService | null = null;
    private options: WebSocketOptions | null = null;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private isConnecting: boolean = false;
    private url: string;

    constructor(url: string) {
        super();
        this.url = url;
    }

    public getStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    public isConnected(): boolean {
        return this.connectionStatus === 'connected' && !!this.websocket?.isConnected();
    }

    private setStatus(status: ConnectionStatus): void {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.emit('connectionChange', status);
        }
    }

    private async getAuthToken(): Promise<string | null> {
        try {
            const session = await fetchAuthSession();
            return session.tokens?.idToken?.toString() || null;
        } catch (error) {
            console.error('Error getting auth token:', error);
            this.emit('error', new Error('Failed to get authentication token.'));
            return null;
        }
    }

    public async connect(): Promise<void> {
        if (this.isConnected() || this.isConnecting) {
            console.warn('WebSocket connection attempt ignored: Already connected or connecting.');
            return;
        }

        this.isConnecting = true;
        this.setStatus('connecting');
        this.emit('statusUpdate', 'Attempting to connect...');

        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('Authentication failed: No token available.');
            }

            if (this.websocket) {
                this.websocket.disconnect();
            }

            this.options = { url: this.url, token };
            this.websocket = new WebSocketService(this.options);

            this.websocket.onConnectionChange((isConnected) => {
                const newStatus = isConnected ? 'connected' : 'disconnected';
                this.setStatus(newStatus);
                if (!isConnected) {
                    console.log('WebSocket disconnected.');
                    this.emit('statusUpdate', 'Disconnected.');
                }
                else {
                    console.log('WebSocket connected.');
                    this.emit('statusUpdate', 'Connected.');
                }
            });

            this.websocket.onMessage((message) => {
                this.emit('message', message);
            });

            await this.websocket.connect();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.setStatus('disconnected');
            this.emit('error', error instanceof Error ? error : new Error('WebSocket connection failed'));
            throw error;
        } finally {
            this.isConnecting = false;
        }
    }

    public disconnect(): void {
        if (this.websocket) {
            this.websocket.disconnect();
            this.websocket = null;
            console.log('WebSocket explicitly disconnected.');
        } else {
            console.warn('Disconnect called but no active WebSocket connection.');
        }
        this.setStatus('disconnected');
        this.isConnecting = false;
        this.removeAllListeners();
    }

    public sendMessage(message: any): void {
        if (!this.isConnected() || !this.websocket) {
            console.error('Cannot send message: WebSocket not connected.');
            throw new Error('WebSocket not connected.');
        }
        try {
            this.websocket.sendMessage(message);
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            this.emit('error', new Error('Failed to send message'));
            throw error;
        }
    }
} 