import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';

export async function up(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const minionsDir = path.join(workspaceRoot, '.minions');

  fs.ensureDirSync(minionsDir);

  console.log(chalk.bold('🚀 Starting claude-minions server...\n'));

  // Check if server is already running
  const serverPidFile = path.join(minionsDir, 'server.pid');
  if (fs.existsSync(serverPidFile)) {
    const serverPid = Number(fs.readFileSync(serverPidFile, 'utf-8'));
    try {
      process.kill(serverPid, 0); // Check if process exists
      console.log(chalk.yellow('⚠ Server already running (PID: ' + serverPid + ')'));
      console.log(chalk.dim('  Run `minions down` first to stop it\n'));
      return;
    } catch {
      // Process doesn't exist, clean up stale PID file
      fs.removeSync(serverPidFile);
    }
  }

  // Start WebSocket server
  const port = parseInt(process.env.SERVER_PORT ?? '3000');
  console.log(`Starting WebSocket server on port ${port}...`);

  const binPath = path.join(workspaceRoot, 'bin', 'minions.ts');
  const serverProcess = spawn('tsx', [binPath, 'server'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: workspaceRoot,
    env: process.env,
  });

  const serverLogFile = path.join(minionsDir, 'server.log');
  const serverLogStream = fs.createWriteStream(serverLogFile, { flags: 'a' });

  if (serverProcess.stdout) {
    serverProcess.stdout.pipe(serverLogStream);
  }
  if (serverProcess.stderr) {
    serverProcess.stderr.pipe(serverLogStream);
  }

  serverProcess.unref();

  fs.writeFileSync(serverPidFile, String(serverProcess.pid));
  console.log(chalk.green(`✓ Server started (PID: ${serverProcess.pid})`));

  console.log(chalk.dim(`\nLogs: tail -f ${serverLogFile}`));
  console.log(chalk.dim(`\nStart an agent: minions start <role>`));
  console.log(chalk.dim(`Stop the server: minions down\n`));
}
