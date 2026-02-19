import type { Message } from '../../core/messages.js';
import type { WebSocket } from 'ws';
import type { AgentStatus } from '../../core/types.js';
import { validateMessage } from './schemas.js';
import { VALID_ROLES } from '../../core/constants.js';

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
      // Validate message
      const message = validateMessage(rawMessage);

      // Route based on message type
      if (message.type === 'daemon_control') {
        // Send control messages directly to daemon
        this.sendToDaemon(message);
      } else if (message.type === 'chat' && message.to) {
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

  private sendToAgent(agentRole: string, message: Message) {
    // Check if target is a valid agent role
    const isAgentRole = VALID_ROLES.includes(agentRole as any);

    if (isAgentRole) {
      // Send to daemon for agent roles
      for (const [id, conn] of this.clients.entries()) {
        if (conn.role === 'daemon' && conn.ws.readyState === 1) { // 1 = OPEN
          conn.ws.send(JSON.stringify(message));
          console.log(`Message sent to daemon for ${agentRole} role`);
          // Also broadcast to all other clients for visibility
          this.broadcast(message, id);
          return;
        }
      }
      console.warn(`Daemon not connected - cannot route message to ${agentRole}`);
    } else {
      // For non-agent targets (like test clients), find direct connection
      for (const [id, conn] of this.clients.entries()) {
        if (conn.role === agentRole && conn.ws.readyState === 1) { // 1 = OPEN
          conn.ws.send(JSON.stringify(message));
          console.log(`Message sent directly to ${agentRole}`);
          // Also broadcast to all other clients for visibility
          this.broadcast(message, id);
          return;
        }
      }
      console.warn(`Client '${agentRole}' not found or not connected`);
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
