import type { Message } from '../../core/messages.js';
import type { WebSocket } from 'ws';
import { validateMessage } from './schemas.js';

export interface ClientConnection {
  ws: WebSocket;
  connectedAt: string;
}

export class MessageRouter {
  private paused = false;

  constructor(private clients: Map<string, ClientConnection>) {}

  route(rawMessage: unknown, senderId: string) {
    try {
      const message = validateMessage(rawMessage);

      if (message.type === 'chat_control') {
        if (message.action === 'pause') {
          this.paused = true;
          console.log('Chat paused — agent tapped into interactive mode');
          this.broadcastAll({
            type: 'system',
            content: `@${message.role} is now in interactive mode — chat is temporarily paused`,
            timestamp: new Date().toISOString(),
          });
        } else if (message.action === 'resume') {
          this.paused = false;
          console.log('Chat resumed');
          this.broadcastAll({
            type: 'system',
            content: `@${message.role} has exited interactive mode — chat resumed`,
            timestamp: new Date().toISOString(),
          });
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
