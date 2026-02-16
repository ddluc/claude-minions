import path from 'path';
import fs from 'fs-extra';
import { spawnSync } from 'child_process';
import { DaemonWebSocketClient } from '../agent/DaemonWebSocketClient.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import type { Message, ChatMessage } from '../../../core/messages.js';
import type { AgentRole } from '../../../core/types.js';

// Setup logging to file
function setupDaemonLogging(logFile: string) {
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${args.join(' ')}\n`;
    logStream.write(message);
    originalLog(...args);
  };

  console.error = (...args: any[]) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ERROR: ${args.join(' ')}\n`;
    logStream.write(message);
    originalError(...args);
  };
}

export async function daemon(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const logFile = path.join(workspaceRoot, '.minions', 'daemon.log');

  // Setup logging
  setupDaemonLogging(logFile);
  console.log('Starting multi-role daemon...');

  // Connect to WebSocket server
  const serverUrl = `ws://localhost:${settings.serverPort || 3000}/ws`;
  const wsClient = new DaemonWebSocketClient(serverUrl);
  wsClient.connect();

  // Message queue per role (for concurrent message handling)
  const messageQueues = new Map<AgentRole, ChatMessage[]>();
  const processingFlags = new Map<AgentRole, boolean>();

  // Handle incoming messages
  wsClient.on('message', async (msg: Message) => {
    if (msg.type !== 'chat') return;

    const targetRole = msg.to as AgentRole;

    if (!settings.roles[targetRole]) {
      console.log(`Warning: Received message for disabled role: ${targetRole}`);
      return;
    }

    console.log(`[${targetRole}] Received message from ${msg.from}`);

    // Add to role-specific queue
    if (!messageQueues.has(targetRole)) {
      messageQueues.set(targetRole, []);
      processingFlags.set(targetRole, false);
    }
    messageQueues.get(targetRole)!.push(msg);

    // Process queue for this role
    processRoleQueue(targetRole);
  });

  async function processRoleQueue(role: AgentRole): Promise<void> {
    if (processingFlags.get(role)) return; // Already processing

    const queue = messageQueues.get(role)!;
    if (queue.length === 0) return;

    processingFlags.set(role, true);

    while (queue.length > 0) {
      const msg = queue.shift()!;

      try {
        const roleDir = path.join(workspaceRoot, '.minions', role);

        // Build prompt
        const prompt = `Message from ${msg.from}: ${msg.content}`;

        console.log(`[${role}] Processing message (${queue.length} remaining in queue)`);

        // Get model from settings
        const model = settings.roles[role]?.model || 'sonnet';

        // Spawn Claude in print mode (NO session ID yet)
        const claudeArgs = [
          '-p',
          '--dangerously-skip-permissions',
          '--model', model,
          prompt
        ];

        const result = spawnSync('claude', claudeArgs, {
          cwd: roleDir,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        if (result.error) {
          console.log(`[${role}] Error: ${result.error.message}`);
          continue;
        }

        if (result.status !== 0) {
          console.log(`[${role}] Claude exited with code ${result.status}`);
          console.log(`[${role}] stderr: ${result.stderr}`);
          continue;
        }

        const response = result.stdout.trim();
        console.log(`[${role}] Response generated (${response.length} chars)`);

        // Send response back (NO conversation persistence yet)
        wsClient.sendMessage({
          type: 'chat',
          from: role,
          to: msg.from,
          content: response,
          timestamp: new Date().toISOString(),
        });

        console.log(`[${role}] Response sent to ${msg.from}`);

      } catch (error) {
        console.log(`[${role}] Error: ${error}`);
      }
    }

    processingFlags.set(role, false);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    wsClient.disconnect();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Shutting down...');
    wsClient.disconnect();
    process.exit(0);
  });

  console.log('Daemon running, monitoring all roles...');
}
