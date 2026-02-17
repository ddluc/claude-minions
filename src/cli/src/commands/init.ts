import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { VALID_ROLES } from '../../../core/constants.js';
import type { AgentRole, Repo, RoleConfig, Settings } from '../../../core/types.js';
import { loadSettings } from '../lib/config.js';
import { buildAgentPrompt, buildConnectFile } from '../lib/prompts.js';

export async function init(): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'minions.json');
  const minionsDir = path.join(cwd, '.minions');

  let settings: Settings;

  if (fs.existsSync(configPath)) {
    // Config exists — use it
    console.log(chalk.dim('Found existing minions.json, setting up workspace from config...\n'));
    settings = loadSettings(cwd);
  } else {
    // No config — run interactive setup
    console.log(chalk.bold('\nClaude Minions - Workspace Setup\n'));
    settings = await promptForSettings();
    fs.writeJSONSync(configPath, settings, { spaces: 2 });
    console.log(chalk.green('\n  Created minions.json'));
  }

  // Create .minions/ directory structure and copy scripts into each role dir
  const roles = Object.keys(settings.roles) as AgentRole[];
  const wsShSource = new URL('../../ws.sh', import.meta.url).pathname;
  for (const role of roles) {
    const roleDir = path.join(minionsDir, role);
    fs.ensureDirSync(roleDir);
    fs.writeFileSync(
      path.join(roleDir, 'CLAUDE.md'),
      buildAgentPrompt(role, settings.roles[role] || {}, cwd, settings.repos)
    );
    fs.writeFileSync(
      path.join(roleDir, 'connect.md'),
      buildConnectFile(role, settings.repos)
    );
    fs.copyFileSync(wsShSource, path.join(roleDir, 'ws.sh'));
    fs.chmodSync(path.join(roleDir, 'ws.sh'), 0o755);
  }
  console.log(chalk.green(`  Created .minions/ directories for: ${roles.join(', ')}`));
  console.log(chalk.green('  Created CLAUDE.md templates for each role'));
  console.log(chalk.green('  Copied ws.sh into each role directory'));

  // Create .env template if it doesn't exist
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, 'GITHUB_TOKEN=\n');
    console.log(chalk.green('  Created .env template'));
  }

  // Add .minions/ to .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignoreEntries = ['.minions/', '.env', '*.log'];
  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf-8');
    const toAdd = gitignoreEntries.filter(e => !existing.includes(e));
    if (toAdd.length > 0) {
      fs.appendFileSync(gitignorePath, '\n# Minions\n' + toAdd.join('\n') + '\n');
      console.log(chalk.green('  Updated .gitignore'));
    }
  } else {
    fs.writeFileSync(gitignorePath, '# Minions\n' + gitignoreEntries.join('\n') + '\n');
    console.log(chalk.green('  Created .gitignore'));
  }

  console.log(chalk.bold.green('\nWorkspace initialized!'));
  console.log(chalk.dim('Next steps:'));
  console.log(chalk.dim('  1. Add your GITHUB_TOKEN to .env'));
  console.log(chalk.dim('  2. Run `minions start <role>` to start an agent'));
}

async function promptForSettings(): Promise<Settings> {
  // Prompt for mode
  const { mode } = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: 'Agent permission mode:',
    choices: [
      { name: 'Ask  - Agents prompt before tool use (recommended for local dev)', value: 'ask' },
      { name: 'YOLO - Agents auto-approve all actions (for EC2/autonomous)', value: 'yolo' },
    ],
  }]);

  // Prompt for repos
  const repos: Repo[] = [];
  let addMore = true;

  while (addMore) {
    console.log(chalk.dim(`\nAdding repo ${repos.length + 1}:`));

    const repo = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Repo name (e.g. frontend):' },
      { type: 'input', name: 'url', message: 'Git URL (e.g. git@github.com:user/repo.git):' },
      { type: 'input', name: 'path', message: 'Local path name:', default: (answers: { name: string }) => answers.name },
    ]);

    repos.push({
      name: repo.name,
      url: repo.url,
      path: repo.path,
    });

    const { another } = await inquirer.prompt([{
      type: 'confirm',
      name: 'another',
      message: 'Add another repo?',
      default: false,
    }]);
    addMore = another;
  }

  // Prompt for team roles
  const ROLE_DESCRIPTIONS: Record<string, string> = {
    'pm':          'PM           - Monitors issues, tracks project status',
    'cao':         'CAO          - Technical architect, task breakdown, delegation',
    'fe-engineer': 'FE Engineer  - Implements UI/frontend features',
    'be-engineer': 'BE Engineer  - Implements APIs, backend logic',
    'qa':          'QA           - Verifies code changes, runs dev servers',
  };

  const { selectedRoles } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedRoles',
    message: 'Select team roles:',
    choices: VALID_ROLES.map(role => ({
      name: ROLE_DESCRIPTIONS[role],
      value: role,
      checked: true,
    })),
    validate: (answer: string[]) => answer.length > 0 || 'You must select at least one role.',
  }]);

  // Build roles config object with recommended models
  const RECOMMENDED_MODELS: Record<AgentRole, 'opus' | 'sonnet' | 'haiku'> = {
    'cao': 'opus',          // Architecture and planning needs deep reasoning
    'pm': 'sonnet',         // Balanced for coordination and triage
    'fe-engineer': 'sonnet', // Balanced for implementation
    'be-engineer': 'sonnet', // Balanced for implementation
    'qa': 'haiku',          // Faster execution for testing
  };

  const roles: Partial<Record<AgentRole, RoleConfig>> = {};
  for (const role of selectedRoles) {
    roles[role as AgentRole] = {
      model: RECOMMENDED_MODELS[role as AgentRole],
    };
  }

  // Prompt for SSH key path (optional)
  const { sshKeyPath } = await inquirer.prompt([{
    type: 'input',
    name: 'sshKeyPath',
    message: 'SSH key path for git operations (optional):',
    default: '',
  }]);

  return {
    mode,
    repos,
    roles,
    ...(sshKeyPath && { ssh: sshKeyPath }),
  };
}
