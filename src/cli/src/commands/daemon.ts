import path from 'path';
import fs from 'fs-extra';
import { DaemonWebSocketClient } from '../services/DaemonWebSocketClient.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { parseMentions } from '../lib/utils.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { ClaudeRunner } from '../services/ClaudeRunner.js';
import type { Message, ChatMessage } from '../../../core/messages.js';
import type { AgentRole } from '../../../core/types.js';

const MAX_ROUTING_DEPTH = 5;

interface QueuedMessage {
  msg: ChatMessage;
  depth: number;
}

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
  const workspace = new WorkspaceService(workspaceRoot, settings);
  const runner = new ClaudeRunner();
  const logFile = path.join(workspaceRoot, '.minions', 'daemon.log');

  // Setup logging
  setupDaemonLogging(logFile);
  console.log('Starting multi-role daemon...');

  // Connect to WebSocket server
  const serverUrl = `ws://localhost:${settings.serverPort || 3000}/ws`;
  const wsClient = new DaemonWebSocketClient(serverUrl);
  wsClient.connect();

  // Message queue per role (for concurrent message handling)
  const messageQueues = new Map<AgentRole, QueuedMessage[]>();
  const processingFlags = new Map<AgentRole, boolean>();

  function queueForRole(role: AgentRole, msg: ChatMessage, depth: number) {
    if (!settings.roles[role]) {
      console.log(`Warning: Skipping disabled role: ${role}`);
      return;
    }

    if (!messageQueues.has(role)) {
      messageQueues.set(role, []);
      processingFlags.set(role, false);
    }
    messageQueues.get(role)!.push({ msg, depth });
    processRoleQueue(role);
  }

  // Handle incoming messages
  wsClient.on('message', async (msg: Message) => {
    if (msg.type !== 'chat') return;

    // Parse @mentions to determine which roles should respond
    const mentions = parseMentions(msg.content);

    if (mentions.size === 0) {
      console.log(`No @mentions in message from ${msg.from} — skipping`);
      return;
    }

    for (const mentionedRole of mentions) {
      const role = mentionedRole as AgentRole;
      console.log(`[${role}] Mentioned by ${msg.from}`);
      queueForRole(role, msg, 0);
    }
  });

  async function processRoleQueue(role: AgentRole): Promise<void> {
    if (processingFlags.get(role)) return; // Already processing

    const queue = messageQueues.get(role);
    if (!queue || queue.length === 0) return;

    processingFlags.set(role, true);

    while (queue.length > 0) {
      const { msg, depth } = queue.shift()!;

      if (depth >= MAX_ROUTING_DEPTH) {
        console.log(`[${role}] Max routing depth (${MAX_ROUTING_DEPTH}) reached — dropping message`);
        continue;
      }

      try {
        const roleDir = workspace.getRoleDir(role);
        const prompt = `Message from ${msg.from}: ${msg.content}`;

        console.log(`[${role}] Processing message (depth=${depth}, ${queue.length} remaining in queue)`);

        const sessionId = workspace.readSessionId(role);
        if (sessionId) {
          console.log(`[${role}] Resuming session ${sessionId}`);
        }

        const result = runner.spawnHeadless({
          roleDir,
          prompt,
          sessionId,
          model: settings.roles[role]?.model,
          yolo: settings.mode === 'yolo',
        });

        if (result.error) {
          console.log(`[${role}] ${result.error}`);
          wsClient.sendMessage({
            type: 'chat',
            from: role,
            content: `❌ ${result.error}`,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        if (result.sessionId) {
          workspace.writeSessionId(role, result.sessionId);
          console.log(`[${role}] Session ID captured: ${result.sessionId}`);
        }

        const response = result.response;
        console.log(`[${role}] Response generated (${response.length} chars)`);

        // Send response to group chat
        const responseMsg: ChatMessage = {
          type: 'chat',
          from: role,
          content: response,
          timestamp: new Date().toISOString(),
        };
        wsClient.sendMessage(responseMsg);

        // Route response to @mentioned roles (agent-to-agent communication)
        const responseMentions = parseMentions(response);
        for (const mentionedRole of responseMentions) {
          const targetRole = mentionedRole as AgentRole;
          if (targetRole === role) continue; // Don't self-route
          console.log(`[${role}] Response @mentions ${targetRole} — routing (depth=${depth + 1})`);
          queueForRole(targetRole, responseMsg, depth + 1);
        }

        console.log(`[${role}] Response sent`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[${role}] Unexpected error: ${errorMsg}`);
        wsClient.sendMessage({
          type: 'chat',
          from: role,
          content: `❌ Unexpected error: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        });
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
