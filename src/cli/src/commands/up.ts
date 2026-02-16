import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import type { AgentRole } from '../../../core/types.js';

export async function up(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const minionsDir = path.join(workspaceRoot, '.minions');

  fs.ensureDirSync(minionsDir);

  console.log(chalk.bold('🚀 Starting claude-minions workspace...\n'));

  // Check if server is already running
  const serverPidFile = path.join(minionsDir, 'server.pid');
  if (fs.existsSync(serverPidFile)) {
    const serverPid = Number(fs.readFileSync(serverPidFile, 'utf-8'));
    try {
      process.kill(serverPid, 0); // Check if process exists
      console.log(chalk.yellow('⚠ Server already running (PID: ' + serverPid + ')'));
      console.log(chalk.dim('  Run `minions down` first to stop existing processes\n'));
      return;
    } catch {
      // Process doesn't exist, clean up stale PID file
      fs.removeSync(serverPidFile);
    }
  }

  // Start WebSocket server
  const serverPort = settings.serverPort || 3000;
  console.log(`Starting WebSocket server on port ${serverPort}...`);

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

  // Wait for server to be ready
  console.log(chalk.dim('  Waiting for server to initialize...'));
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Spawn one long-running Claude session per enabled role
  const enabledRoles = Object.keys(settings.roles) as AgentRole[];
  console.log(`\nStarting minion sessions for roles: ${enabledRoles.join(', ')}...`);

  // Parse .env and inject variables into spawned process environments
  const envSource = path.join(workspaceRoot, '.env');
  const envVars: Record<string, string> = {};
  if (fs.existsSync(envSource)) {
    const envContent = fs.readFileSync(envSource, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }

  for (const role of enabledRoles) {
    const roleDir = path.join(minionsDir, role);

    if (!fs.existsSync(roleDir)) {
      console.log(chalk.yellow(`⚠ Role directory not found for ${role} - run 'minions start ${role}' first to set up`));
      continue;
    }

    // Build claude CLI arguments
    const claudeArgs: string[] = [];

    if (settings.mode === 'yolo') {
      claudeArgs.push('--dangerously-skip-permissions');
    }

    const roleConfig = settings.roles[role];
    if (roleConfig?.model) {
      claudeArgs.push('--model', roleConfig.model);
    }

    // Initial prompt to start the WebSocket listener
    claudeArgs.push('-p', 'Run ws_listen to start monitoring for messages. After processing each message, call ws_listen again to continue listening.');

    const roleLogFile = path.join(minionsDir, `${role}.log`);
    const roleLogStream = fs.createWriteStream(roleLogFile, { flags: 'a' });

    const roleProcess = spawn('claude', claudeArgs, {
      cwd: roleDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...envVars, MINION_ROLE: role },
    });

    if (roleProcess.stdout) {
      roleProcess.stdout.pipe(roleLogStream);
    }
    if (roleProcess.stderr) {
      roleProcess.stderr.pipe(roleLogStream);
    }

    roleProcess.unref();

    const rolePidFile = path.join(minionsDir, `${role}.pid`);
    fs.writeFileSync(rolePidFile, String(roleProcess.pid));
    console.log(chalk.green(`✓ ${role} session started (PID: ${roleProcess.pid})`));
  }

  console.log(chalk.bold.green('\n✓ All processes started!\n'));
  console.log(chalk.dim('Logs:'));
  console.log(chalk.dim(`  Server: tail -f ${path.join(minionsDir, 'server.log')}`));
  for (const role of enabledRoles) {
    console.log(chalk.dim(`  ${role}: tail -f ${path.join(minionsDir, `${role}.log`)}`));
  }
  console.log(chalk.dim('\nTest with WebSocket:'));
  console.log(chalk.dim('  wscat -c ws://localhost:' + serverPort + '/ws'));
  console.log(chalk.dim('  {"type":"chat","from":"test","to":"cao","content":"what is 2+2?","timestamp":"' + new Date().toISOString() + '"}'));
  console.log(chalk.dim('\nStop the workspace:'));
  console.log(chalk.dim('  minions down\n'));
}
