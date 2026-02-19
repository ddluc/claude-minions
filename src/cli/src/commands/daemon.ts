import path from 'path';
import fs from 'fs-extra';
import { spawnSync } from 'child_process';
import { DaemonWebSocketClient } from '../agent/DaemonWebSocketClient.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import type { Message, ChatMessage, DaemonControlMessage } from '../../../core/messages.js';
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
  const pausedRoles = new Set<AgentRole>();

  // Handle incoming messages
  wsClient.on('message', async (msg: Message) => {
    // Handle daemon control messages (pause/unpause)
    if (msg.type === 'daemon_control') {
      const controlMsg = msg as DaemonControlMessage;
      const role = controlMsg.role as AgentRole;

      if (controlMsg.action === 'pause') {
        pausedRoles.add(role);
        console.log(`[${role}] Paused`);
        wsClient.sendMessage({
          type: 'agent_status',
          role,
          status: 'paused',
          timestamp: new Date().toISOString(),
        });
      } else if (controlMsg.action === 'unpause') {
        pausedRoles.delete(role);
        console.log(`[${role}] Unpaused`);
        wsClient.sendMessage({
          type: 'agent_status',
          role,
          status: 'online',
          timestamp: new Date().toISOString(),
        });
        // Resume processing any queued messages
        processRoleQueue(role);
      }
      return;
    }

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
    if (pausedRoles.has(role)) return; // Role is paused
    if (processingFlags.get(role)) return; // Already processing

    const queue = messageQueues.get(role);
    if (!queue || queue.length === 0) return;

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

        // Load session ID for conversation continuity
        const sessionIdPath = path.join(roleDir, '.session-id');
        let sessionId: string | null = null;
        if (fs.existsSync(sessionIdPath)) {
          sessionId = fs.readFileSync(sessionIdPath, 'utf-8').trim();
        }

        // Build Claude args with session persistence
        const claudeArgs = ['-p', '--output-format', 'json', '--model', model];
        if (settings.mode === 'yolo') {
          claudeArgs.push('--dangerously-skip-permissions');
        }
        if (sessionId) {
          claudeArgs.push('--resume', sessionId);
          console.log(`[${role}] Resuming session ${sessionId}`);
        }
        claudeArgs.push(prompt);

        const result = spawnSync('claude', claudeArgs, {
          cwd: roleDir,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          env: {
            ...process.env,
          },
        });

        if (result.error) {
          const errorMsg = `Error spawning Claude: ${result.error.message}`;
          console.log(`[${role}] ${errorMsg}`);
          wsClient.sendMessage({
            type: 'chat',
            from: role,
            to: msg.from,
            content: `❌ ${errorMsg}`,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        if (result.status !== 0) {
          const errorMsg = `Claude exited with code ${result.status}\nStderr: ${result.stderr}\nStdout: ${result.stdout}`;
          console.log(`[${role}] Claude exited with code ${result.status}`);
          console.log(`[${role}] stderr: ${result.stderr}`);
          console.log(`[${role}] stdout: ${result.stdout}`);
          wsClient.sendMessage({
            type: 'chat',
            from: role,
            to: msg.from,
            content: `❌ ${errorMsg}`,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        // Parse JSON response with fallback to plain text
        let response: string;
        let newSessionId: string | null = null;

        try {
          const parsed = JSON.parse(result.stdout);
          response = parsed.result || '';
          newSessionId = parsed.session_id || null;
        } catch {
          response = result.stdout.trim();
        }

        // Persist session ID for future conversation continuity
        if (newSessionId) {
          fs.writeFileSync(sessionIdPath, newSessionId);
          console.log(`[${role}] Session ID captured: ${newSessionId}`);
        }

        console.log(`[${role}] Response generated (${response.length} chars)`);

        wsClient.sendMessage({
          type: 'chat',
          from: role,
          to: msg.from,
          content: response,
          timestamp: new Date().toISOString(),
        });

        console.log(`[${role}] Response sent to ${msg.from}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[${role}] Unexpected error: ${errorMsg}`);
        wsClient.sendMessage({
          type: 'chat',
          from: role,
          to: msg.from,
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
