import chalk from 'chalk';
import { VALID_ROLES, DEFAULT_PORT } from '../../../core/constants.js';
import type { AgentRole } from '../../../core/types.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { ClaudeRunner } from '../services/ClaudeRunner.js';
import { ChatControlClient } from '../services/ChatControlClient.js';

export async function tap(role: string): Promise<void> {
  // Validate role
  if (!VALID_ROLES.includes(role as AgentRole)) {
    console.error(chalk.red(`Invalid role: ${role}`));
    console.error(chalk.dim(`Valid roles: ${VALID_ROLES.join(', ')}`));
    process.exit(1);
  }
  const agentRole = role as AgentRole;

  // Find workspace and load settings
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);

  // Verify role is enabled
  if (!settings.roles[agentRole]) {
    console.error(chalk.red(`Role "${role}" is not enabled in minions.json`));
    console.error(chalk.dim('Enabled roles: ' + Object.keys(settings.roles).join(', ')));
    process.exit(1);
  }

  // Guard: server must be running before tapping in
  const serverPort = settings.serverPort || DEFAULT_PORT;
  try {
    const res = await fetch(`http://localhost:${serverPort}/api/health`);
    if (!res.ok) throw new Error('unhealthy');
  } catch {
    console.error(chalk.red('Server not running. Run `minions up` first.'));
    process.exit(1);
  }

  const workspace = new WorkspaceService(workspaceRoot, settings);
  const roleDir = workspace.getRoleDir(agentRole);

  // Load .env variables for the spawned process environment
  const envVars = workspace.loadEnvVars();

  // Read session ID if it exists
  const sessionId = workspace.readSessionId(agentRole);

  if (sessionId) {
    console.log(chalk.cyan(`Resuming session: ${sessionId}`));
  } else {
    console.log(chalk.cyan('Starting fresh session'));
  }

  // Pause chat via server
  const chatControl = new ChatControlClient(serverPort);

  console.log(chalk.dim(`Connecting to server at ws://localhost:${serverPort}/ws...`));
  const paused = await chatControl.pause(role);
  if (paused) {
    console.log(chalk.yellow(`Pausing chat...`));
  } else {
    console.log(chalk.dim('Server not running — skipping pause'));
  }

  // Launch claude interactively
  console.log(chalk.bold.green(`\nTapping into ${role} agent...`));
  console.log(chalk.dim(`Working directory: ${roleDir}`));
  console.log(chalk.dim(`CLAUDE.md loaded from this directory\n`));

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
    await chatControl.resume(role);
    console.error(chalk.red('Failed to start claude CLI'));
    console.error(chalk.dim('Make sure claude is installed: curl -fsSL https://claude.ai/install.sh | bash'));
    console.error(chalk.dim(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }

  // Resume chat
  const resumed = await chatControl.resume(role);
  if (resumed) {
    console.log(chalk.yellow(`Resuming chat...`));
    await new Promise((resolve) => setTimeout(resolve, 200));
  } else {
    console.log(chalk.dim('Could not reconnect to server — chat may still be paused'));
  }

  process.exit(exitCode);
}
