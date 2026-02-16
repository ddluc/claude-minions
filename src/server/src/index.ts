import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from './WebSocketServer.js';

export class MinionsServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer(this.server);

    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Get connected agents
    this.app.get('/api/agents', (req, res) => {
      const agents = this.wss.getConnectedAgents();
      res.json({ agents });
    });
  }

  start(port: number) {
    this.server.listen(port, () => {
      console.log(`Minions server running on port ${port}`);
      console.log(`WebSocket endpoint: ws://localhost:${port}/ws`);
      console.log(`API endpoints:`);
      console.log(`  - GET http://localhost:${port}/api/health`);
      console.log(`  - GET http://localhost:${port}/api/agents`);
    });
  }
}
