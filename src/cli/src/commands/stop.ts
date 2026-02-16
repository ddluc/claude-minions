import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { VALID_ROLES } from '../../../core/constants.js';
import type { AgentRole } from '../../../core/types.js';
import { getWorkspaceRoot } from '../lib/config.js';

export async function stop(role: string): Promise<void> {
  if (!VALID_ROLES.includes(role as AgentRole)) {
    console.error(chalk.red(`Invalid role: ${role}`));
    console.error(chalk.dim(`Valid roles: ${VALID_ROLES.join(', ')}`));
    process.exit(1);
  }

  const workspaceRoot = getWorkspaceRoot();
  const pidFile = path.join(workspaceRoot, '.minions', role, '.pid');

  if (!fs.existsSync(pidFile)) {
    console.log(chalk.yellow(`No running agent found for role: ${role}`));
    return;
  }

  const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);

  try {
    process.kill(pid, 'SIGTERM');
    console.log(chalk.green(`Sent SIGTERM to ${role} agent (pid ${pid})`));
  } catch (err: any) {
    if (err.code === 'ESRCH') {
      console.log(chalk.yellow(`Process ${pid} not found (already stopped)`));
    } else {
      console.error(chalk.red(`Failed to stop ${role}: ${err.message}`));
    }
  }

  fs.removeSync(pidFile);
}
