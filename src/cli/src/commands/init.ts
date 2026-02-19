import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { VALID_ROLES, DEFAULT_PERMISSIONS } from '../../../core/constants.js';
import type { AgentRole, PermissionConfig, Repo, RoleConfig, Settings } from '../../../core/types.js';
import { loadSettings } from '../lib/config.js';
import { generateConnectMd, buildClaudeMd } from '../lib/templates.js';
import { resolvePermissions, writePermissionsFile } from '../lib/permissions.js';

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
    console.log(chalk.green('\nCreated minions.json\n'));
  }

  // Create .minions/ directory structure and CLAUDE.md templates
  const roles = Object.keys(settings.roles) as AgentRole[];
  for (const role of roles) {
    fs.ensureDirSync(path.join(minionsDir, role));
    fs.writeFileSync(
      path.join(minionsDir, role, 'CLAUDE.md'),
      buildClaudeMd(role, settings.roles[role] || {}, cwd, settings.repos)
    );
  }
  console.log(chalk.dim(`Created .minions/ directories for: ${roles.join(', ')}`));
  console.log(chalk.dim('Created CLAUDE.md templates for each role'));

  // Write permissions for each role
  for (const role of roles) {
    const resolved = resolvePermissions(settings.permissions, settings.roles[role]?.permissions);
    const roleDir = path.join(minionsDir, role);
    writePermissionsFile(roleDir, resolved);
  }
  console.log(chalk.dim('Created .claude/settings.local.json for each role'));

  // Create connect.md
  fs.writeFileSync(path.join(minionsDir, 'connect.md'), generateConnectMd());
  console.log(chalk.dim('Created .minions/connect.md'));

  // Create .env template if it doesn't exist
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, 'GITHUB_TOKEN=\n');
    console.log(chalk.dim('Created .env template'));
  }

  // Add .minions/ to .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignoreEntries = ['.minions/', '.env', '*.log'];
  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf-8');
    const toAdd = gitignoreEntries.filter(e => !existing.includes(e));
    if (toAdd.length > 0) {
      fs.appendFileSync(gitignorePath, '\n# Minions\n' + toAdd.join('\n') + '\n');
      console.log(chalk.green('Updated .gitignore'));
    }
  } else {
    fs.writeFileSync(gitignorePath, '# Minions\n' + gitignoreEntries.join('\n') + '\n');
    console.log(chalk.green('Created .gitignore'));
  }

  console.log(chalk.bold.green('\nWorkspace initialized\n'));
  console.log(chalk.dim('Next steps:\n'));
  console.log(chalk.dim('1. Start the minions server `minions up`'));
  console.log(chalk.dim('2. Run `minions tap <role>` to connect to an agent'));
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
    'pm':          'PM',
    'cao':         'CAO',
    'fe-engineer': 'FE Engineer',
    'be-engineer': 'BE Engineer',
    'qa':          'QA',
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

  // Prompt for default permissions
  const { useDefaults } = await inquirer.prompt([{
    type: 'confirm',
    name: 'useDefaults',
    message: `Seed with default permissions? (${DEFAULT_PERMISSIONS.allow.join(', ')})`,
    default: true,
  }]);

  const permissions: PermissionConfig | undefined = useDefaults
    ? { allow: [...DEFAULT_PERMISSIONS.allow], deny: [...DEFAULT_PERMISSIONS.deny] }
    : undefined;

  return {
    mode,
    repos,
    roles,
    ...(permissions && { permissions }),
    ...(sshKeyPath && { ssh: sshKeyPath }),
  };
}
