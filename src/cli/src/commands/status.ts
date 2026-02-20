import chalk from 'chalk';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { ProcessManager } from '../services/ProcessManager.js';
import type { AgentRole } from '../../../core/types.js';

export async function status(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const pm = new ProcessManager(workspaceRoot);
  const roles = Object.keys(settings.roles) as AgentRole[];

  console.log(chalk.bold('\nMinions Agent Status\n'));

  for (const role of roles) {
    const roleStatus = pm.getRoleStatus(role);

    if (roleStatus.running) {
      console.log(`  ${chalk.green('●')} ${role.padEnd(14)} ${chalk.green('running')}  (pid ${roleStatus.pid})`);
    } else {
      console.log(`  ${chalk.dim('○')} ${role.padEnd(14)} ${chalk.dim('stopped')}`);
    }
  }

  console.log();
}
