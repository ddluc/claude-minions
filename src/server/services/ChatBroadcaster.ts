import type { ChatMessage, Message } from '../../core/messages.js';
import type { WebSocket } from 'ws';
import { validateMessage } from '../util/schemas.js';

const MAX_HISTORY = 100;

export interface ClientConnection {
  ws: WebSocket;
  connectedAt: string;
}

/**
 * Central message handler: validates messages, manages pause/resume state for tap sessions,
 * stores chat history, and broadcasts to connected clients.
 */
export class ChatBroadcaster {
  private tapped = new Set<string>();
  private chatHistory: ChatMessage[] = [];

  private get paused(): boolean {
    return this.tapped.size > 0;
  }

  constructor(private clients: Map<string, ClientConnection>) {}

  /**
   * Return the most recent chat messages, capped to the requested limit.
   */
  getHistory(limit: number = 10): ChatMessage[] {
    const capped = Math.min(Math.max(limit, 1), MAX_HISTORY);
    return this.chatHistory.slice(-capped);
  }

  /**
   * Process an incoming message: handle control messages, enforce pause state,
   * store chat history, and broadcast to other clients.
   */
  handle(rawMessage: unknown, senderId: string) {
    try {
      const message = validateMessage(rawMessage);

      if (message.type === 'chat_control') {
        if (message.action === 'pause') {
          this.tapped.add(message.role);
          console.log(`Chat paused — @${message.role} tapped into interactive mode (${this.tapped.size} active)`);
          this.broadcastAll({
            type: 'system',
            content: `@${message.role} is now in interactive mode — chat is paused (${this.tapped.size} active tap session${this.tapped.size === 1 ? '' : 's'})`,
            timestamp: new Date().toISOString(),
          });
        } else if (message.action === 'resume') {
          this.tapped.delete(message.role);
          if (!this.paused) {
            console.log('Chat resumed — all tap sessions ended');
            this.broadcastAll({
              type: 'system',
              content: `@${message.role} has exited interactive mode — chat resumed`,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.log(`@${message.role} exited tap — ${this.tapped.size} session(s) still active`);
            this.broadcastAll({
              type: 'system',
              content: `@${message.role} has exited interactive mode — chat still paused (${this.tapped.size} remaining tap session${this.tapped.size === 1 ? '' : 's'})`,
              timestamp: new Date().toISOString(),
            });
          }
        }
        return;
      }

      // When paused, reject chat messages with a system response
      if (this.paused && message.type === 'chat') {
        const senderConn = this.clients.get(senderId);
        if (senderConn) {
          senderConn.ws.send(JSON.stringify({
            type: 'system',
            content: 'Chat is temporarily paused — an agent is in interactive mode',
            timestamp: new Date().toISOString(),
          }));
        }
        return;
      }

      // Store chat messages in history
      if (message.type === 'chat') {
        this.chatHistory.push(message);
        if (this.chatHistory.length > MAX_HISTORY) {
          this.chatHistory.shift();
        }
      }

      // Group chat: broadcast everything to all clients except sender
      this.broadcast(message, senderId);
    } catch (error) {
      console.error('Invalid message:', error);
      const senderConn = this.clients.get(senderId);
      if (senderConn) {
        senderConn.ws.send(JSON.stringify({
          type: 'system',
          content: `Invalid message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        }));
      }
    }
  }

  /**
   * Send a message to all connected clients except the sender.
   */
  private broadcast(message: Message, excludeId: string) {
    for (const [id, conn] of this.clients.entries()) {
      if (id !== excludeId && conn.ws.readyState === 1) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Send a message to all connected clients, including the sender.
   */
  private broadcastAll(message: Message) {
    for (const [, conn] of this.clients.entries()) {
      if (conn.ws.readyState === 1) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  }
}
