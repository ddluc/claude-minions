import WebSocket from 'ws';
import type { Message } from '../../../core/messages.js';

export class AgentWebSocketClient {
  private ws: WebSocket | null = null;
  private role: string;
  private serverUrl: string;
  private reconnectInterval: number = 5000;
  private shouldReconnect: boolean = true;

  constructor(role: string, serverUrl: string = 'ws://localhost:3000/ws') {
    this.role = role;
    this.serverUrl = serverUrl;
  }

  connect() {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      console.log(`[${this.role}] Connected to server`);
      this.sendStatus('online');
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error(`[${this.role}] Error parsing message:`, error);
      }
    });

    this.ws.on('close', () => {
      console.log(`[${this.role}] Disconnected from server`);
      if (this.shouldReconnect) {
        this.reconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error(`[${this.role}] WebSocket error:`, error.message);
    });
  }

  private reconnect() {
    setTimeout(() => {
      console.log(`[${this.role}] Reconnecting...`);
      this.connect();
    }, this.reconnectInterval);
  }

  sendMessage(message: Message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn(`[${this.role}] Cannot send message - not connected`);
    }
  }

  sendChat(to: string | undefined, content: string) {
    this.sendMessage({
      type: 'chat',
      from: this.role,
      to,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  sendStatus(status: 'online' | 'offline' | 'working', currentBranch?: string) {
    this.sendMessage({
      type: 'agent_status',
      role: this.role,
      status,
      currentBranch,
      timestamp: new Date().toISOString(),
    });
  }

  private handleMessage(message: Message) {
    // Handle incoming messages
    // For now, just log them
    console.log(`[${this.role}] Received message:`, JSON.stringify(message, null, 2));
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.sendStatus('offline');
      this.ws.close();
      this.ws = null;
    }
  }
}
