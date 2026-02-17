import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getWorkspaceRoot } from '../lib/config.js';

export async function down(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const minionsDir = path.join(workspaceRoot, '.minions');

  console.log(chalk.bold('🛑 Stopping claude-minions server...\n'));

  const serverPidFile = path.join(minionsDir, 'server.pid');
  if (fs.existsSync(serverPidFile)) {
    const serverPid = Number(fs.readFileSync(serverPidFile, 'utf-8'));
    try {
      process.kill(serverPid, 'SIGTERM');
      console.log(chalk.green(`✓ Stopped server (PID: ${serverPid})`));
    } catch (err) {
      console.log(chalk.yellow(`⚠ Server not found (PID: ${serverPid})`));
    }
    fs.removeSync(serverPidFile);
  } else {
    console.log(chalk.dim('Server not running'));
  }
}
