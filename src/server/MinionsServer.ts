import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from './services/WebSocketServer.js';

/**
 * HTTP + WebSocket server that hosts the chat API and real-time message transport.
 */
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

  /**
   * Register HTTP routes: health check and chat history.
   */
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

  /**
   * Register a warning to display to chat clients on connect.
   */
  addStartupWarning(warning: string): void {
    this.wss.addStartupWarning(warning);
  }

  /**
   * Start listening on the given port.
   */
  start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`Minions server running on port ${port}`);
        console.log(`WebSocket endpoint: ws://localhost:${port}/ws`);
        console.log(`API: GET http://localhost:${port}/api/health`);
        console.log(`API: GET http://localhost:${port}/api/chat/history`);
        resolve();
      });
    });
  }
}
