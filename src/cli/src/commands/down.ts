import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getWorkspaceRoot } from '../lib/config.js';

export async function down(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const minionsDir = path.join(workspaceRoot, '.minions');

  console.log(chalk.bold('🛑 Stopping claude-minions workspace...\n'));

  let stoppedAny = false;

  // Stop daemon
  const daemonPidFile = path.join(minionsDir, 'daemon.pid');
  if (fs.existsSync(daemonPidFile)) {
    const daemonPid = Number(fs.readFileSync(daemonPidFile, 'utf-8'));
    try {
      process.kill(daemonPid, 'SIGTERM');
      console.log(chalk.green(`✓ Stopped daemon (PID: ${daemonPid})`));
      fs.removeSync(daemonPidFile);
      stoppedAny = true;
    } catch (err) {
      console.log(chalk.yellow(`⚠ Daemon not found (PID: ${daemonPid})`));
      fs.removeSync(daemonPidFile);
    }
  } else {
    console.log(chalk.dim('Daemon not running'));
  }

  // Stop server
  const serverPidFile = path.join(minionsDir, 'server.pid');
  if (fs.existsSync(serverPidFile)) {
    const serverPid = Number(fs.readFileSync(serverPidFile, 'utf-8'));
    try {
      process.kill(serverPid, 'SIGTERM');
      console.log(chalk.green(`✓ Stopped server (PID: ${serverPid})`));
      fs.removeSync(serverPidFile);
      stoppedAny = true;
    } catch (err) {
      console.log(chalk.yellow(`⚠ Server not found (PID: ${serverPid})`));
      fs.removeSync(serverPidFile);
    }
  } else {
    console.log(chalk.dim('Server not running'));
  }

  if (stoppedAny) {
    console.log(chalk.bold.green('\n✓ All processes stopped'));
  } else {
    console.log(chalk.dim('\nNo processes were running'));
  }
}
