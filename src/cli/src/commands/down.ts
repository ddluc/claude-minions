import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import type { AgentRole } from '../../../core/types.js';

export async function down(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const minionsDir = path.join(workspaceRoot, '.minions');

  console.log(chalk.bold('🛑 Stopping claude-minions workspace...\n'));

  let stoppedAny = false;

  // Stop minion sessions
  const enabledRoles = Object.keys(settings.roles) as AgentRole[];
  for (const role of enabledRoles) {
    const rolePidFile = path.join(minionsDir, `${role}.pid`);
    if (fs.existsSync(rolePidFile)) {
      const rolePid = Number(fs.readFileSync(rolePidFile, 'utf-8'));
      try {
        process.kill(rolePid, 'SIGTERM');
        console.log(chalk.green(`✓ Stopped ${role} session (PID: ${rolePid})`));
        stoppedAny = true;
      } catch (err) {
        console.log(chalk.yellow(`⚠ ${role} session not found (PID: ${rolePid})`));
      }
      fs.removeSync(rolePidFile);
    } else {
      console.log(chalk.dim(`${role} session not running`));
    }
  }

  // Stop server
  const serverPidFile = path.join(minionsDir, 'server.pid');
  if (fs.existsSync(serverPidFile)) {
    const serverPid = Number(fs.readFileSync(serverPidFile, 'utf-8'));
    try {
      process.kill(serverPid, 'SIGTERM');
      console.log(chalk.green(`✓ Stopped server (PID: ${serverPid})`));
      stoppedAny = true;
    } catch (err) {
      console.log(chalk.yellow(`⚠ Server not found (PID: ${serverPid})`));
    }
    fs.removeSync(serverPidFile);
  } else {
    console.log(chalk.dim('Server not running'));
  }

  if (stoppedAny) {
    console.log(chalk.bold.green('\n✓ All processes stopped'));
  } else {
    console.log(chalk.dim('\nNo processes were running'));
  }
}
