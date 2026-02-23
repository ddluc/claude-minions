import chalk from 'chalk';
import { log } from '../lib/logger.js';
import { VALID_ROLES, DEFAULT_PORT } from '../../core/constants.js';
import type { AgentRole } from '../../core/types.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { getEnabledRoles } from '../../core/settings.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { ClaudeRunner } from '../services/ClaudeRunner.js';
import { ChatController } from '../services/ChatController.js';

export class TapCommand {
  messages = {
    invalidRole: (role: string) => {
      log.error(`Invalid role: ${role}`);
      log.dim(`Valid roles: ${VALID_ROLES.join(', ')}`);
    },
    roleNotEnabled: (role: string, enabledRoles: string[]) => {
      log.error(`Role "${role}" is not enabled in minions.json`);
      log.dim('Enabled roles: ' + enabledRoles.join(', '));
    },
    serverNotRunning: () => {
      log.error('Server not running. Run `minions up` first.');
    },
    resumingSession: (sessionId: string) => {
      console.log(chalk.cyan(`Resuming session: ${sessionId}`));
    },
    freshSession: () => {
      console.log(chalk.cyan('Starting fresh session'));
    },
    connectingToServer: (port: number) => {
      log.dim(`Connecting to server at ws://localhost:${port}/ws...`);
    },
    chatPaused: () => {
      log.warn('Pausing chat...');
    },
    skippingPause: () => {
      log.dim('Server not running — skipping pause');
    },
    tappingIn: (role: string, roleDir: string) => {
      log.success(`\nTapping into ${role} agent...`);
      log.dim(`Working directory: ${roleDir}`);
      log.dim(`CLAUDE.md loaded from this directory\n`);
    },
    claudeStartFailed: (err: unknown) => {
      log.error('Failed to start claude CLI');
      log.dim('Make sure claude is installed: curl -fsSL https://claude.ai/install.sh | bash');
      log.dim(err instanceof Error ? err.message : String(err));
    },
    chatResumed: () => {
      log.warn('Resuming chat...');
    },
    resumeFailed: () => {
      log.dim('Could not reconnect to server — chat may still be paused');
    },
  };

  async run(role: string): Promise<void> {
    if (!VALID_ROLES.includes(role as AgentRole)) {
      this.messages.invalidRole(role);
      process.exit(1);
    }
    const agentRole = role as AgentRole;

    const workspaceRoot = getWorkspaceRoot();
    const settings = loadSettings(workspaceRoot);
    const enabledRoles = getEnabledRoles(settings);

    if (!enabledRoles.includes(agentRole)) {
      this.messages.roleNotEnabled(role, enabledRoles);
      process.exit(1);
    }

    const serverPort = settings.serverPort || DEFAULT_PORT;
    try {
      const res = await fetch(`http://localhost:${serverPort}/api/health`);
      if (!res.ok) throw new Error('unhealthy');
    } catch {
      this.messages.serverNotRunning();
      process.exit(1);
    }

    const workspace = new WorkspaceService(workspaceRoot, settings);
    const roleDir = workspace.getRoleDir(agentRole);
    const envVars = workspace.loadEnvVars();
    const sessionId = workspace.readSessionId(agentRole);

    if (sessionId) {
      this.messages.resumingSession(sessionId);
    } else {
      this.messages.freshSession();
    }

    const chatController = new ChatController(serverPort);

    this.messages.connectingToServer(serverPort);
    const paused = await chatController.pause(role);
    if (paused) {
      this.messages.chatPaused();
    } else {
      this.messages.skippingPause();
    }

    this.messages.tappingIn(role, roleDir);

    const runner = new ClaudeRunner();
    let exitCode: number;

    try {
      exitCode = runner.spawnInteractive({
        roleDir,
        sessionId,
        model: settings.roles[agentRole]?.model,
        yolo: settings.mode === 'yolo',
        envVars,
      });
    } catch (err) {
      await chatController.resume(role);
      this.messages.claudeStartFailed(err);
      process.exit(1);
    }

    const resumed = await chatController.resume(role);
    if (resumed) {
      this.messages.chatResumed();
      await new Promise((resolve) => setTimeout(resolve, 200));
    } else {
      this.messages.resumeFailed();
    }

    process.exit(exitCode);
  }
}
