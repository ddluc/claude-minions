import WebSocket from 'ws';
import type { ChatControlMessage } from '../../core/messages.js';

/**
 * Sends pause/resume control messages to the server to coordinate tap sessions with group chat.
 */
export class ChatController {
  private serverPort: number;

  constructor(serverPort: number) {
    this.serverPort = serverPort;
  }

  /**
   * Pause chat routing for a role. Returns true if the server acknowledged.
   */
  async pause(role: string): Promise<boolean> {
    const ws = await this.connect();
    if (!ws) return false;
    try {
      await this.sendControl(ws, 'pause', role);
      return true;
    } catch {
      return false;
    } finally {
      ws.close();
    }
  }

  /**
   * Resume chat routing for a role. Returns true if the server acknowledged.
   */
  async resume(role: string): Promise<boolean> {
    const ws = await this.connect();
    if (!ws) return false;
    try {
      await this.sendControl(ws, 'resume', role);
      return true;
    } catch {
      return false;
    } finally {
      ws.close();
    }
  }

  /**
   * Open a short-lived WebSocket connection to the server with a timeout.
   */
  private connect(timeout = 3000): Promise<WebSocket | null> {
    return new Promise((resolve) => {
      const url = `ws://localhost:${this.serverPort}/ws`;
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.terminate();
        resolve(null);
      }, timeout);

      ws.on('open', () => {
        clearTimeout(timer);
        resolve(ws);
      });

      ws.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  }

  /**
   * Send a chat control message (pause or resume) over an open WebSocket.
   */
  private sendControl(ws: WebSocket, action: 'pause' | 'resume', role: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const message: ChatControlMessage = {
        type: 'chat_control',
        action,
        role,
        timestamp: new Date().toISOString(),
      };
      ws.send(JSON.stringify(message), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
