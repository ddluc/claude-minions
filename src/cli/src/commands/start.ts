import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { spawnSync } from 'node:child_process';
import { execa } from 'execa';
import { VALID_ROLES } from '../../../core/constants.js';
import type { AgentRole } from '../../../core/types.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { cloneRepo, ensureLabels, parseGitUrl } from '../lib/git.js';
import { buildClaudeMd } from '../lib/templates.js';

export async function start(role: string): Promise<void> {
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

  // Initialize git repository in the role directory if it doesn't exist
  const gitDir = path.join(roleDir, '.git');
  if (!fs.existsSync(gitDir) && settings.repos.length > 0) {
    console.log(chalk.dim(`Initializing git repository for ${role}...`));
    const mainRepo = settings.repos[0]; // Assuming first repo is the main one

    try {
      // Initialize git repository
      await execa('git', ['init'], { cwd: roleDir });
      await execa('git', ['remote', 'add', 'origin', mainRepo.url], { cwd: roleDir });

      // Configure SSH key if provided
      if (settings.ssh) {
        const sshKeyPath = path.resolve(workspaceRoot, settings.ssh);
        await execa('git', ['config', 'core.sshCommand', `ssh -i ${sshKeyPath} -o IdentitiesOnly=yes`], { cwd: roleDir });
        console.log(chalk.dim(`  Configured SSH key: ${settings.ssh}`));
      }

      await execa('git', ['fetch', 'origin'], { cwd: roleDir });

      // Check out dev branch if it exists, otherwise use default branch
      const { stdout: branches } = await execa('git', ['branch', '-r'], { cwd: roleDir });
      if (branches.includes('origin/dev')) {
        await execa('git', ['checkout', '-b', 'dev', 'origin/dev'], { cwd: roleDir });
        console.log(chalk.green(`  Initialized git repository on dev branch`));
      } else {
        // Checkout default branch (usually main or master)
        const { stdout: defaultBranch } = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: roleDir });
        const branchName = defaultBranch.replace('refs/remotes/origin/', '').trim();
        await execa('git', ['checkout', '-b', branchName, `origin/${branchName}`], { cwd: roleDir });
        console.log(chalk.green(`  Initialized git repository on ${branchName} branch`));
      }
    } catch (err) {
      console.log(chalk.yellow(`  Warning: Could not initialize git repository`));
      console.log(chalk.dim(`  ${err}`));
    }
  }

  // Determine repos for this role (PM gets none, everyone else gets all)
  const repos = agentRole === 'pm' ? [] : settings.repos;
  const allRoles = Object.keys(settings.roles) as AgentRole[];

  // Clone repos
  for (const repo of repos) {
    const targetDir = path.join(roleDir, repo.path);
    console.log(chalk.dim(`Checking ${repo.name}...`));

    const cloned = await cloneRepo(repo.url, targetDir);
    if (cloned) {
      console.log(chalk.green(`  Cloned ${repo.name} into .minions/${role}/${repo.path}`));
    } else {
      console.log(chalk.dim(`  ${repo.name} already cloned`));
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
    buildClaudeMd(agentRole, settings.roles[agentRole] || {}, workspaceRoot, repos),
  );

  // Write PID file for status tracking
  const pidFile = path.join(roleDir, '.pid');
  fs.writeFileSync(pidFile, String(process.pid));
  process.on('exit', () => { try { fs.removeSync(pidFile); } catch {} });

  // Build claude CLI arguments
  const claudeArgs: string[] = [];
  if (settings.mode === 'yolo') {
    claudeArgs.push('--dangerously-skip-permissions');
  }

  // Launch claude
  console.log(chalk.bold.green(`\nStarting ${role} agent...`));
  console.log(chalk.dim(`Working directory: ${roleDir}`));
  console.log(chalk.dim(`CLAUDE.md loaded from this directory\n`));

  const result = spawnSync('claude', claudeArgs, {
    cwd: roleDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...envVars },
  });

  if (result.error) {
    console.error(chalk.red('Failed to start claude CLI'));
    console.error(chalk.dim('Make sure claude is installed: npm install -g @anthropic-ai/claude-code'));
    console.error(chalk.dim(result.error.message));
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}