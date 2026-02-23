import type { ChatMessage, Message } from '../../core/messages.js';
import type { WebSocket } from 'ws';
import { validateMessage } from '../util/schemas.js';

const MAX_HISTORY = 100;

export interface ClientConnection {
  ws: WebSocket;
  connectedAt: string;
}

export class ChatBroadcaster {
  private pausedRoles = new Set<string>();
  private chatHistory: ChatMessage[] = [];

  constructor(private clients: Map<string, ClientConnection>) {}

  getHistory(limit: number = 10): ChatMessage[] {
    const capped = Math.min(Math.max(limit, 1), MAX_HISTORY);
    return this.chatHistory.slice(-capped);
  }

  handle(rawMessage: unknown, senderId: string) {
    try {
      const message = validateMessage(rawMessage);

      if (message.type === 'chat_control') {
        if (message.action === 'pause') {
          this.pausedRoles.add(message.role);
          console.log(`Chat paused — @${message.role} tapped into interactive mode (${this.pausedRoles.size} active)`);
          this.broadcastAll({
            type: 'system',
            content: `@${message.role} is now in interactive mode — chat is paused (${this.pausedRoles.size} active tap session${this.pausedRoles.size === 1 ? '' : 's'})`,
            timestamp: new Date().toISOString(),
          });
        } else if (message.action === 'resume') {
          this.pausedRoles.delete(message.role);
          if (this.pausedRoles.size === 0) {
            console.log('Chat resumed — all tap sessions ended');
            this.broadcastAll({
              type: 'system',
              content: `@${message.role} has exited interactive mode — chat resumed`,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.log(`@${message.role} exited tap — ${this.pausedRoles.size} session(s) still active`);
            this.broadcastAll({
              type: 'system',
              content: `@${message.role} has exited interactive mode — chat still paused (${this.pausedRoles.size} remaining tap session${this.pausedRoles.size === 1 ? '' : 's'})`,
              timestamp: new Date().toISOString(),
            });
          }
        }
        return;
      }

      // When paused, reject chat messages with a system response
      if (this.pausedRoles.size > 0 && message.type === 'chat') {
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

  private broadcast(message: Message, excludeId: string) {
    for (const [id, conn] of this.clients.entries()) {
      if (id !== excludeId && conn.ws.readyState === 1) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  }

  private broadcastAll(message: Message) {
    for (const [, conn] of this.clients.entries()) {
      if (conn.ws.readyState === 1) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  }
}
