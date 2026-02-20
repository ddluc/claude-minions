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
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    this.app.get('/api/chat/history', (req, res) => {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
      const messages = this.wss.getChatHistory(limit);
      res.json({ messages });
    });
  }

  start(port: number) {
    this.server.listen(port, () => {
      console.log(`Minions server running on port ${port}`);
      console.log(`WebSocket endpoint: ws://localhost:${port}/ws`);
      console.log(`API: GET http://localhost:${port}/api/health`);
      console.log(`API: GET http://localhost:${port}/api/chat/history`);
    });
  }
}
