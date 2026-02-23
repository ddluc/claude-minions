import WebSocket from 'ws';
import type { Message } from '../../core/messages.js';

export class ChatDaemon {
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
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as Message;
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
      this.ws.close();
      this.ws = null;
    }
  }
}
