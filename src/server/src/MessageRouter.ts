import type { Message } from '../../core/messages.js';
import type { WebSocket } from 'ws';
import { validateMessage } from './schemas.js';
import { VALID_ROLES } from '../../core/constants.js';

export interface AgentConnection {
  ws: WebSocket;
  role: string;
  status: 'online' | 'offline' | 'working';
  connectedAt: string;
}

export class MessageRouter {
  constructor(private clients: Map<string, AgentConnection>) {}

  route(rawMessage: unknown, senderId: string) {
    try {
      // Validate message
      const message = validateMessage(rawMessage);

      // Broadcast to all connected agents except sender
      this.broadcast(message, senderId);
    } catch (error) {
      console.error('Invalid message:', error);
      // Send error back to sender
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
    // Send to all connected clients except sender
    for (const [id, conn] of this.clients.entries()) {
      if (id !== excludeId && conn.ws.readyState === 1) { // 1 = OPEN
        conn.ws.send(JSON.stringify(message));
      }
    }
  }
}
