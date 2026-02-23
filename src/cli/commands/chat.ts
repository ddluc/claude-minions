import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { ChatClient } from '../services/ChatClient.js';
import { DEFAULT_PORT } from '../../core/constants.js';

/**
 * Opens the interactive group chat client.
 */
export class ChatCommand {
  /**
   * Load settings and start the ChatClient WebSocket connection.
   */
  run(): void {
    const workspaceRoot = getWorkspaceRoot();
    const settings = loadSettings(workspaceRoot);
    const serverUrl = `ws://localhost:${settings.serverPort || DEFAULT_PORT}/ws`;

    const client = new ChatClient(serverUrl);
    client.start();
  }
}
