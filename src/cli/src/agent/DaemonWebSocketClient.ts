import WebSocket from 'ws';
import type { Message } from '../../../core/messages.js';

export class DaemonWebSocketClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private reconnectInterval: number = 5000;
  private shouldReconnect: boolean = true;
  private messageHandlers: ((msg: Message) => void)[] = [];

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  connect(): void {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      console.log('[daemon] Connected to server');
      // Identify as daemon role
      this.sendMessage({
        type: 'agent_status',
        role: 'daemon',
        status: 'online',
        timestamp: new Date().toISOString(),
      });
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as Message;
        // Handle chat and daemon control messages
        if (message.type === 'chat') {
          this.messageHandlers.forEach(handler => handler(message));
        }
      } catch (error) {
        console.error('[daemon] Error parsing message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('[daemon] Disconnected from server');
      if (this.shouldReconnect) {
        this.reconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error('[daemon] WebSocket error:', error.message);
    });
  }

  private reconnect(): void {
    setTimeout(() => {
      console.log('[daemon] Reconnecting...');
      this.connect();
    }, this.reconnectInterval);
  }

  on(event: 'message', handler: (msg: Message) => void): void {
    if (event === 'message') {
      this.messageHandlers.push(handler);
    }
  }

  sendMessage(message: Message): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[daemon] Cannot send message - not connected');
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.sendMessage({
        type: 'agent_status',
        role: 'daemon',
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
      this.ws.close();
      this.ws = null;
    }
  }
}
