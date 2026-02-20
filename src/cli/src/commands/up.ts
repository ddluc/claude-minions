import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { ProcessManager } from '../services/ProcessManager.js';
import { WorkspaceService } from '../services/WorkspaceService.js';

export async function up(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const minionsDir = path.join(workspaceRoot, '.minions');
  const pm = new ProcessManager(workspaceRoot);

  fs.ensureDirSync(minionsDir);

  console.log(chalk.bold('Starting claude-minions workspace...\n'));

  // Check if server is already running
  const serverStatus = pm.getStatus('server');
  if (serverStatus.running) {
    console.log(chalk.yellow('⚠ Server already running (PID: ' + serverStatus.pid + ')'));
    console.log(chalk.dim('  Run `minions down` first to stop existing processes\n'));
    return;
  }

  // Workspace prep — synchronous, visible output
  console.log(chalk.bold('Preparing workspace...\n'));
  const workspace = new WorkspaceService(workspaceRoot, settings);
  const hasSshKey = !!settings.ssh;

  workspace.setupAllRoles(hasSshKey);
  for (const role of Object.keys(settings.roles)) {
    console.log(chalk.dim(`  Configured .minions/${role}/`));
  }

  const cloneResults = await workspace.cloneAllRepos();
  for (const { role, repoName, cloned } of cloneResults) {
    if (cloned) {
      console.log(chalk.green(`  Cloned ${repoName} into .minions/${role}/${repoName}`));
    } else {
      console.log(chalk.dim(`  ${repoName} already present for ${role}`));
    }
  }

  const labelResults = await workspace.ensureGitHubLabels();
  for (const repoPath of labelResults) {
    console.log(chalk.dim(`  Labels verified on ${repoPath}`));
  }

  console.log(chalk.green('\nWorkspace ready.\n'));

  // Start WebSocket server
  console.log(`Starting WebSocket server on port ${settings.serverPort || 3000}...`);

  // Use tsx to run the bin script
  const binPath = path.join(workspaceRoot, 'bin', 'minions.ts');
  const serverProcess = spawn('tsx', [binPath, 'server'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: workspaceRoot,
    env: process.env, // Pass through environment variables
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

  pm.writePid('server', serverProcess.pid!);
  console.log(chalk.green(`✓ Server started (PID: ${serverProcess.pid})`));

  // Wait for server to be ready
  console.log(chalk.dim('  Waiting for server to initialize...'));
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get enabled roles
  const enabledRoles = Object.keys(settings.roles);
  console.log(`\nStarting daemon (handles all roles: ${enabledRoles.join(', ')})...`);

  // Start daemon
  const daemonProcess = spawn('tsx', [binPath, 'daemon'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: workspaceRoot,
    env: process.env, // Pass through environment variables
  });

  const daemonLogFile = path.join(minionsDir, 'daemon.log');
  const daemonLogStream = fs.createWriteStream(daemonLogFile, { flags: 'a' });

  if (daemonProcess.stdout) {
    daemonProcess.stdout.pipe(daemonLogStream);
  }
  if (daemonProcess.stderr) {
    daemonProcess.stderr.pipe(daemonLogStream);
  }

  daemonProcess.unref();

  pm.writePid('daemon', daemonProcess.pid!);
  console.log(chalk.green(`✓ Daemon started (PID: ${daemonProcess.pid})`));

  console.log(chalk.bold.green('\n✓ All processes started!\n'));
  console.log(chalk.dim('Logs:'));
  console.log(chalk.dim(`  Server: tail -f ${serverLogFile}`));
  console.log(chalk.dim(`  Daemon: tail -f ${daemonLogFile}`));
  console.log(chalk.dim('\nTest the daemon:'));
  console.log(chalk.dim('  wscat -c ws://localhost:' + (settings.serverPort || 3000) + '/ws'));
  console.log(chalk.dim('  {"type":"chat","from":"test","to":"cao","content":"what is 2+2?","timestamp":"' + new Date().toISOString() + '"}'));
  console.log(chalk.dim('\nStop the workspace:'));
  console.log(chalk.dim('  minions down\n'));
}
