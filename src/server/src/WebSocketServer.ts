import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { MessageRouter, type AgentConnection } from './MessageRouter.js';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketServer {
  private wss: WSServer;
  private clients: Map<string, AgentConnection>;
  private router: MessageRouter;

  constructor(server: Server) {
    this.wss = new WSServer({ server, path: '/ws' });
    this.clients = new Map();
    this.router = new MessageRouter(this.clients);

    this.wss.on('connection', (ws) => this.handleConnection(ws));
  }

  private handleConnection(ws: WebSocket) {
    const clientId = uuidv4();

    // Initialize connection with default values
    const connection: AgentConnection = {
      ws,
      role: 'unknown',
      status: 'online',
      connectedAt: new Date().toISOString(),
    };

    this.clients.set(clientId, connection);
    console.log(`Client connected: ${clientId}`);

    // Set up message handler
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Update connection metadata if it's an agent_status message
        if (message.type === 'agent_status') {
          connection.role = message.role;
          connection.status = message.status;
          connection.connectedAt = message.timestamp || connection.connectedAt;
          console.log(`Agent registered: ${message.role} (${clientId})`);
        }

        // Route the message
        this.router.route(message, clientId);
      } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'system',
          content: 'Error processing message',
          timestamp: new Date().toISOString(),
        }));
      }
    });

    // Set up disconnect handler
    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId} (role: ${connection.role})`);
      this.clients.delete(clientId);
    });

    // Set up error handler
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'system',
      content: 'Connected to Minions server',
      timestamp: new Date().toISOString(),
    }));
  }

  getConnectedAgents() {
    return Array.from(this.clients.entries()).map(([id, conn]) => ({
      id,
      role: conn.role,
      status: conn.status,
      connectedAt: conn.connectedAt,
    }));
  }
}
