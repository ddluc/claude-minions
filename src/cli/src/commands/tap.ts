import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { spawnSync } from 'node:child_process';
import WebSocket from 'ws';
import { VALID_ROLES, DEFAULT_PORT } from '../../../core/constants.js';
import type { AgentRole } from '../../../core/types.js';
import type { ChatControlMessage } from '../../../core/messages.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { cloneRepo, configureRepo, ensureLabels, parseGitUrl } from '../lib/git.js';
import { buildClaudeMd } from '../lib/templates.js';

/**
 * Send a chat_control message over a WebSocket connection.
 */
function sendControl(ws: WebSocket, action: 'pause' | 'resume', role: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const message: ChatControlMessage = {
      type: 'chat_control',
      action,
      role,
      timestamp: new Date().toISOString(),
    };
    ws.send(JSON.stringify(message), (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Open a WebSocket connection and wait for it to be ready.
 * Returns null if the server is not reachable.
 */
function connectWebSocket(url: string): Promise<WebSocket | null> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.terminate();
      resolve(null);
    }, 3000);

    ws.on('open', () => {
      clearTimeout(timeout);
      resolve(ws);
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

export async function tap(role: string): Promise<void> {
  // Validate role
  if (!VALID_ROLES.includes(role as AgentRole)) {
    console.error(chalk.red(`Invalid role: ${role}`));
    console.error(chalk.dim(`Valid roles: ${VALID_ROLES.join(', ')}`));
    process.exit(1);
  }
  const agentRole = role as AgentRole;

  // Find workspace and load settings
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);

  // Verify role is enabled
  if (!settings.roles[agentRole]) {
    console.error(chalk.red(`Role "${role}" is not enabled in minions.json`));
    console.error(chalk.dim('Enabled roles: ' + Object.keys(settings.roles).join(', ')));
    process.exit(1);
  }

  const roleDir = path.join(workspaceRoot, '.minions', role);
  fs.ensureDirSync(roleDir);

  // Copy SSH key into the role directory so the minion has local access
  let sshKeyPath: string | undefined;
  if (settings.ssh) {
    const sourceSshKey = path.resolve(workspaceRoot, settings.ssh);
    const localSshKey = path.join(roleDir, 'ssh_key');
    fs.copyFileSync(sourceSshKey, localSshKey);
    fs.chmodSync(localSshKey, 0o600);
    sshKeyPath = localSshKey;
    console.log(chalk.dim(`Copied SSH key into .minions/${role}/`));
  }

  // Determine repos for this role
  const repos = settings.repos;
  const allRoles = Object.keys(settings.roles) as AgentRole[];

  // Clone repos and configure each one individually
  for (const repo of repos) {
    const targetDir = path.join(roleDir, repo.path);
    console.log(chalk.dim(`Checking ${repo.name}...`));

    const cloned = await cloneRepo(repo.url, targetDir, sshKeyPath);
    if (cloned) {
      console.log(chalk.green(`  Cloned ${repo.name} into .minions/${role}/${repo.path}`));
    } else {
      console.log(chalk.dim(`  ${repo.name} already cloned`));
    }

    // Configure SSH key and checkout dev branch inside the repo directory
    try {
      await configureRepo(targetDir, sshKeyPath);
      if (sshKeyPath) {
        console.log(chalk.dim(`  Configured SSH key for ${repo.name}`));
      }
    } catch (err) {
      console.log(chalk.yellow(`  Warning: Could not configure repo ${repo.name}`));
      console.log(chalk.dim(`  ${err}`));
    }

    // Ensure GitHub labels exist on this repo
    try {
      const { owner, repo: repoName } = parseGitUrl(repo.url);
      console.log(chalk.dim(`  Ensuring labels on ${owner}/${repoName}...`));
      await ensureLabels(`${owner}/${repoName}`, allRoles);
    } catch (err) {
      console.log(chalk.yellow(`  Warning: Could not set up labels for ${repo.name}`));
    }
  }

  // Parse .env and inject variables into the spawned process environment
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
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }

  // Regenerate CLAUDE.md so template changes take effect
  fs.writeFileSync(
    path.join(roleDir, 'CLAUDE.md'),
    buildClaudeMd(agentRole, settings.roles[agentRole] || {}, workspaceRoot, repos, !!sshKeyPath),
  );

  // Write PID file for status tracking
  const pidFile = path.join(roleDir, '.pid');
  fs.writeFileSync(pidFile, String(process.pid));
  process.on('exit', () => { try { fs.removeSync(pidFile); } catch {} });

  // Read session ID if it exists
  const sessionFile = path.join(roleDir, '.session-id');
  const sessionId = fs.existsSync(sessionFile)
    ? fs.readFileSync(sessionFile, 'utf-8').trim()
    : null;

  if (sessionId) {
    console.log(chalk.cyan(`Resuming session: ${sessionId}`));
  } else {
    console.log(chalk.cyan('Starting fresh session'));
  }

  // Pause chat via server
  const serverPort = settings.serverPort || DEFAULT_PORT;
  const serverUrl = `ws://localhost:${serverPort}/ws`;

  console.log(chalk.dim(`Connecting to server at ${serverUrl}...`));
  const ws = await connectWebSocket(serverUrl);

  if (ws) {
    try {
      console.log(chalk.yellow(`Pausing chat...`));
      await sendControl(ws, 'pause', role);
    } catch (err) {
      console.log(chalk.yellow(`Warning: Could not pause chat — ${err}`));
    }
    // Close the initial connection — we'll open a fresh one on exit
    ws.close();
  } else {
    console.log(chalk.dim('Server not running — skipping pause'));
  }

  // Build claude CLI arguments
  const claudeArgs: string[] = [];

  if (sessionId) {
    claudeArgs.push('--resume', sessionId);
  }

  if (settings.mode === 'yolo') {
    claudeArgs.push('--dangerously-skip-permissions');
  }

  const roleConfig = settings.roles[agentRole];
  if (roleConfig?.model) {
    claudeArgs.push('--model', roleConfig.model);
  }

  // Launch claude interactively
  console.log(chalk.bold.green(`\nTapping into ${role} agent...`));
  console.log(chalk.dim(`Working directory: ${roleDir}`));
  console.log(chalk.dim(`CLAUDE.md loaded from this directory\n`));

  const result = spawnSync('claude', claudeArgs, {
    cwd: roleDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...envVars },
  });

  // Resume chat via fresh WS connection
  const freshWs = await connectWebSocket(serverUrl);
  if (freshWs) {
    try {
      console.log(chalk.yellow(`Resuming chat...`));
      await sendControl(freshWs, 'resume', role);
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      // Best effort
    }
    freshWs.close();
  } else {
    console.log(chalk.dim('Could not reconnect to server — chat may still be paused'));
  }

  if (result.error) {
    console.error(chalk.red('Failed to start claude CLI'));
    console.error(chalk.dim('Make sure claude is installed: npm install -g @anthropic-ai/claude-code'));
    console.error(chalk.dim(result.error.message));
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}
