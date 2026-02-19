import type { Message } from '../../core/messages.js';
import type { WebSocket } from 'ws';
import type { AgentStatus } from '../../core/types.js';
import { validateMessage } from './schemas.js';

export interface AgentConnection {
  ws: WebSocket;
  role: string;
  status: AgentStatus;
  connectedAt: string;
}

export class MessageRouter {
  constructor(private clients: Map<string, AgentConnection>) {}

  route(rawMessage: unknown, senderId: string) {
    try {
      const message = validateMessage(rawMessage);

      if (message.type === 'daemon_control') {
        // Send control messages directly to daemon
        this.sendToDaemon(message);
      } else {
        // Group chat: broadcast everything to all clients except sender
        this.broadcast(message, senderId);
      }
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

  private sendToDaemon(message: Message) {
    for (const [id, conn] of this.clients.entries()) {
      if (conn.role === 'daemon' && conn.ws.readyState === 1) {
        conn.ws.send(JSON.stringify(message));
        console.log('Control message sent to daemon');
        return;
      }
    }
    console.warn('Daemon not connected - cannot route daemon_control message');
  }

  private broadcast(message: Message, excludeId: string) {
    for (const [id, conn] of this.clients.entries()) {
      if (id !== excludeId && conn.ws.readyState === 1) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  }
}
