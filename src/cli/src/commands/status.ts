import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import type { AgentRole } from '../../../core/types.js';

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function status(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const roles = Object.keys(settings.roles) as AgentRole[];

  console.log(chalk.bold('\nMinions Agent Status\n'));

  for (const role of roles) {
    const pidFile = path.join(workspaceRoot, '.minions', role, '.pid');

    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
      if (isProcessRunning(pid)) {
        console.log(`  ${chalk.green('●')} ${role.padEnd(14)} ${chalk.green('running')}  (pid ${pid})`);
      } else {
        console.log(`  ${chalk.red('●')} ${role.padEnd(14)} ${chalk.red('stopped')}  (stale pid file)`);
        fs.removeSync(pidFile);
      }
    } else {
      console.log(`  ${chalk.dim('○')} ${role.padEnd(14)} ${chalk.dim('stopped')}`);
    }
  }

  console.log();
}
