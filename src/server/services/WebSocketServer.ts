import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { ChatBroadcaster, type ClientConnection } from './ChatBroadcaster.js';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketServer {
  private wss: WSServer;
  private clients: Map<string, ClientConnection>;
  private broadcaster: ChatBroadcaster;

  constructor(server: Server) {
    this.wss = new WSServer({ server, path: '/ws' });
    this.clients = new Map();
    this.broadcaster = new ChatBroadcaster(this.clients);

    this.wss.on('connection', (ws) => this.handleConnection(ws));
  }

  getChatHistory(limit?: number) {
    return this.broadcaster.getHistory(limit);
  }

  private handleConnection(ws: WebSocket) {
    const clientId = uuidv4();

    const connection: ClientConnection = {
      ws,
      connectedAt: new Date().toISOString(),
    };

    this.clients.set(clientId, connection);
    console.log(`Client connected: ${clientId}`);

    ws.on('message', (data) => {
      try {
        const rawData = data.toString();
        console.log(`Received message from ${clientId}: ${rawData.substring(0, 200)}`);
        this.broadcaster.handle(JSON.parse(rawData), clientId);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error handling message from ${clientId}:`, errorMsg);
        ws.send(JSON.stringify({
          type: 'system',
          content: `Error processing message: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        }));
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    });

    ws.send(JSON.stringify({
      type: 'system',
      content: 'Connected to Minions server',
      timestamp: new Date().toISOString(),
    }));
  }
}
