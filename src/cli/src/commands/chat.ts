import path from 'path';
import fs from 'fs-extra';
import readline from 'readline';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { ChatService } from '../services/ChatService.js';
import { MessageRouter } from '../services/MessageRouter.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { ClaudeRunner } from '../services/ClaudeRunner.js';
import type { AgentRole } from '../../../core/types.js';
import { DEFAULT_PORT } from '../../../core/constants.js';

export async function chat(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);

  // Redirect daemon processing logs to file so they don't pollute the chat terminal
  const logFile = path.join(workspaceRoot, '.minions', 'daemon.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log = (...args: any[]) => logStream.write(`[${new Date().toISOString()}] ${args.join(' ')}\n`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => logStream.write(`[${new Date().toISOString()}] ERROR: ${args.join(' ')}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const chatService = new ChatService(
    `ws://localhost:${settings.serverPort || DEFAULT_PORT}/ws`,
    () => rl.prompt(),
  );

  const workspace = new WorkspaceService(workspaceRoot, settings);
  const runner = new ClaudeRunner();
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
    onSend: (msg) => chatService.sendMessage(msg),
  });

  chatService.on('message', (msg) => {
    if (msg.type === 'chat') router.route(msg);
  });

  chatService.connect();

  rl.on('line', (input) => {
    const trimmed = input.trim();
    if (trimmed) chatService.send(trimmed);
    else rl.prompt();
  });

  rl.on('close', () => {
    chatService.disconnect();
    process.exit(0);
  });
}
