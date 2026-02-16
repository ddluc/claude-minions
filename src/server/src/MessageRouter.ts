import type { Message } from '../../core/messages.js';
import type { WebSocket } from 'ws';
import { validateMessage } from './schemas.js';

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

      // Route based on message type and 'to' field
      if (message.type === 'chat' && message.to) {
        // Unicast to specific agent
        this.sendToAgent(message.to, message);
      } else {
        // Broadcast to all agents except sender
        this.broadcast(message, senderId);
      }
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

  private sendToAgent(agentRole: string, message: Message) {
    // First try to find agent by specific role (for interactive mode)
    for (const [id, conn] of this.clients.entries()) {
      if (conn.role === agentRole && conn.ws.readyState === 1) { // 1 = OPEN
        conn.ws.send(JSON.stringify(message));
        console.log(`Message sent to ${agentRole} agent`);
        return;
      }
    }

    // If not found, try to send to daemon (for daemon mode)
    for (const [id, conn] of this.clients.entries()) {
      if (conn.role === 'daemon' && conn.ws.readyState === 1) { // 1 = OPEN
        conn.ws.send(JSON.stringify(message));
        console.log(`Message sent to daemon for ${agentRole} role`);
        return;
      }
    }

    console.warn(`Agent with role '${agentRole}' not found, and no daemon connected`);
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
