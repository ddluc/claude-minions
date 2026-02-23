import path from 'path';
import fs from 'fs-extra';
import { ChatDaemon } from '../services/ChatDaemon.js';
import { MessageRouter } from '../services/MessageRouter.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { ClaudeRunner } from '../services/ClaudeRunner.js';
import type { Message } from '../../core/messages.js';
import { DEFAULT_PORT } from '../../core/constants.js';
import { getEnabledRoles } from '../../core/settings.js';

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

export class DaemonCommand {
  messages = {
    starting: () => {
      console.log('Starting multi-role daemon...');
    },
    resumingSession: (role: string, sessionId: string) => {
      console.log(`[${role}] Resuming session ${sessionId}`);
    },
    sessionCaptured: (role: string, sessionId: string) => {
      console.log(`[${role}] Session ID captured: ${sessionId}`);
    },
    running: () => {
      console.log('Daemon running, monitoring all roles...');
    },
    shuttingDown: () => {
      console.log('Shutting down...');
    },
  };

  async run(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    const settings = loadSettings(workspaceRoot);
    const workspace = new WorkspaceService(workspaceRoot, settings);
    const runner = new ClaudeRunner();
    const logFile = path.join(workspaceRoot, '.minions', 'daemon.log');

    setupDaemonLogging(logFile);
    this.messages.starting();

    const serverUrl = `ws://localhost:${settings.serverPort || DEFAULT_PORT}/ws`;
    const wsClient = new ChatDaemon(serverUrl);
    wsClient.connect();

    const router = new MessageRouter({
      enabledRoles: getEnabledRoles(settings),
      maxDepth: 5,
      onProcess: async (role, prompt) => {
        const roleDir = workspace.getRoleDir(role);
        const sessionId = workspace.readSessionId(role);
        if (sessionId) this.messages.resumingSession(role, sessionId);
        const result = await runner.spawnHeadless({
          roleDir,
          prompt,
          sessionId,
          model: settings.roles[role]?.model,
          yolo: settings.mode === 'yolo',
        });
        if (result.sessionId) {
          workspace.writeSessionId(role, result.sessionId);
          this.messages.sessionCaptured(role, result.sessionId);
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

    process.on('SIGTERM', () => { this.messages.shuttingDown(); wsClient.disconnect(); process.exit(0); });
    process.on('SIGINT',  () => { this.messages.shuttingDown(); wsClient.disconnect(); process.exit(0); });

    this.messages.running();
  }
}
