import path from 'path';
import fs from 'fs-extra';
import { DaemonWebSocketClient } from '../services/DaemonWebSocketClient.js';
import { MessageRouter } from '../services/MessageRouter.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { ClaudeRunner } from '../services/ClaudeRunner.js';
import type { Message } from '../../core/messages.js';
import type { AgentRole } from '../../core/types.js';
import { DEFAULT_PORT } from '../../core/constants.js';

function setupDaemonLogging(logFile: string) {
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ${args.join(' ')}\n`);
    originalLog(...args);
  };

  console.error = (...args: any[]) => {
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ERROR: ${args.join(' ')}\n`);
    originalError(...args);
  };
}

export async function daemon(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const workspace = new WorkspaceService(workspaceRoot, settings);
  const runner = new ClaudeRunner();
  const logFile = path.join(workspaceRoot, '.minions', 'daemon.log');

  setupDaemonLogging(logFile);
  console.log('Starting multi-role daemon...');

  const serverUrl = `ws://localhost:${settings.serverPort || DEFAULT_PORT}/ws`;
  const wsClient = new DaemonWebSocketClient(serverUrl);
  wsClient.connect();

  const router = new MessageRouter({
    enabledRoles: Object.keys(settings.roles) as AgentRole[],
    maxDepth: 5,
    onProcess: async (role, prompt) => {
      const roleDir = workspace.getRoleDir(role);
      const sessionId = workspace.readSessionId(role);
      if (sessionId) console.log(`[${role}] Resuming session ${sessionId}`);
      const result = await runner.spawnHeadless({
        roleDir,
        prompt,
        sessionId,
        model: settings.roles[role]?.model,
        yolo: settings.mode === 'yolo',
      });
      if (result.sessionId) {
        workspace.writeSessionId(role, result.sessionId);
        console.log(`[${role}] Session ID captured: ${result.sessionId}`);
      }
      return {
        response: result.response,
        sessionId: result.sessionId ?? undefined,
        error: result.error ?? undefined,
      };
    },
    onSend: (msg) => wsClient.sendMessage(msg),
  });

  wsClient.on('message', (msg: Message) => {
    if (msg.type === 'chat') router.route(msg);
  });

  process.on('SIGTERM', () => { console.log('Shutting down...'); wsClient.disconnect(); process.exit(0); });
  process.on('SIGINT',  () => { console.log('Shutting down...'); wsClient.disconnect(); process.exit(0); });

  console.log('Daemon running, monitoring all roles...');
}
