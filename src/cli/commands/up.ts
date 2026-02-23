import chalk from 'chalk';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { MinionsServer } from '../../server/MinionsServer.js';
import { daemon } from './daemon.js';
import { DEFAULT_PORT } from '../../core/constants.js';

export async function up(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);

  console.log(chalk.bold('Starting claude-minions workspace...\n'));

  // Workspace prep — synchronous, visible output
  console.log(chalk.bold('Preparing workspace...\n'));
  const workspace = new WorkspaceService(workspaceRoot, settings);
  const hasSshKey = !!settings.ssh;

  workspace.setupAllRoles(hasSshKey);
  for (const role of Object.keys(settings.roles)) {
    console.log(chalk.dim(`  Configured .minions/${role}/`));
  }

  const cloneResults = workspace.cloneAllRepos();
  for (const { role, repoName, cloned } of cloneResults) {
    if (cloned) {
      console.log(chalk.green(`  Cloned ${repoName} into .minions/${role}/${repoName}`));
    } else {
      console.log(chalk.dim(`  ${repoName} already present for ${role}`));
    }
  }

  console.log(chalk.green('\nWorkspace ready.\n'));

  // Start server inline — resolves when listening (HTTP + WebSocket on the same port)
  const port = settings.serverPort || DEFAULT_PORT;
  const srv = new MinionsServer();
  await srv.start(port);

  const roles = Object.keys(settings.roles);
  console.log(chalk.bold.green('\n✓ Minions ready!\n'));
  console.log(chalk.dim('  minions chat          Open group chat'));
  for (const role of roles) {
    console.log(chalk.dim(`  minions tap ${role.padEnd(12)}Tap into ${role} session`));
  }
  console.log(chalk.dim('\nPress Ctrl+C to stop.\n'));

  // Start daemon — blocks until SIGINT/SIGTERM
  await daemon();
}
