import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { log } from '../lib/logger.js';
import { VALID_ROLES, DEFAULT_PERMISSIONS } from '../../core/constants.js';
import type { AgentRole, PermissionConfig, Repo, RoleConfig, Settings } from '../../core/types.js';
import { loadSettings } from '../lib/config.js';
import { WorkspaceService } from '../services/WorkspaceService.js';

/**
 * Interactive workspace initializer — creates minions.json and sets up .minions/ directories.
 */
export class InitCommand {
  messages = {
    foundConfig: () => {
      log.dim('Found existing minions.json, setting up workspace from config...\n');
    },
    setupHeader: () => {
      log.info('\nClaude Minions - Workspace Setup\n');
    },
    createdConfig: () => {
      log.success('\nCreated minions.json\n');
    },
    addingRepo: (n: number) => {
      log.dim(`\nAdding repo ${n}:`);
    },
    dirsCreated: (roles: string[]) => {
      log.dim(`Created .minions/ directories for: ${roles.join(', ')}`);
    },
    envTemplateCreated: () => {
      log.dim('Created .env template');
    },
    gitignoreUpdated: () => {
      log.success('Updated .gitignore');
    },
    initialized: () => {
      log.success('\nWorkspace initialized\n');
      log.dim('Next steps:\n');
      log.dim('1. Start the minions server `minions up`');
      log.dim('2. Run `minions tap <role>` to connect to an agent');
    },
  };

  /**
   * Walk the user through mode, repos, roles, SSH, and permissions via interactive prompts.
   */
  private async promptForSettings(): Promise<Settings> {
    const { mode } = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: 'Agent permission mode:',
      choices: [
        { name: 'Ask  - Agents prompt before tool use (recommended for local dev)', value: 'ask' },
        { name: 'YOLO - Agents auto-approve all actions (for EC2/autonomous)', value: 'yolo' },
      ],
    }]);

    const repos: Repo[] = [];
    let addMore = true;

    while (addMore) {
      this.messages.addingRepo(repos.length + 1);

      const repo = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Repo name (e.g. frontend):' },
        { type: 'input', name: 'url', message: 'Git URL (e.g. git@github.com:user/repo.git):' },
        { type: 'input', name: 'path', message: 'Local path name:', default: (answers: { name: string }) => answers.name },
      ]);

      repos.push({ name: repo.name, url: repo.url, path: repo.path });

      const { another } = await inquirer.prompt([{
        type: 'confirm',
        name: 'another',
        message: 'Add another repo?',
        default: false,
      }]);
      addMore = another;
    }

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

    const RECOMMENDED_MODELS: Record<AgentRole, 'opus' | 'sonnet' | 'haiku'> = {
      'cao': 'opus',
      'pm': 'sonnet',
      'fe-engineer': 'sonnet',
      'be-engineer': 'sonnet',
      'qa': 'haiku',
    };

    const roles: Partial<Record<AgentRole, RoleConfig>> = {};
    for (const role of selectedRoles) {
      roles[role as AgentRole] = { model: RECOMMENDED_MODELS[role as AgentRole] };
    }

    const { sshKeyPath } = await inquirer.prompt([{
      type: 'input',
      name: 'sshKeyPath',
      message: 'SSH key path for git operations (optional):',
      default: '',
    }]);

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

  private dryRun = false;

  /**
   * Run action if not in dry-run mode, otherwise log what would happen.
   */
  private execute(action: () => void, dryRunMessage: string): void {
    if (this.dryRun) {
      log.dim(`[dry-run] ${dryRunMessage}`);
    } else {
      action();
    }
  }

  /**
   * Run init: load existing config or prompt for new one, then create workspace directories.
   */
  async run(options: { dryRun?: boolean } = {}): Promise<void> {
    this.dryRun = options.dryRun ?? false;
    const cwd = process.cwd();
    const configPath = path.join(cwd, 'minions.json');

    if (this.dryRun) {
      log.dim('[dry-run] No files will be written.\n');
    }

    let settings: Settings;

    if (!this.dryRun && fs.existsSync(configPath)) {
      this.messages.foundConfig();
      settings = loadSettings(cwd);
    } else {
      this.messages.setupHeader();
      settings = await this.promptForSettings();
      this.execute(
        () => { fs.writeJSONSync(configPath, settings, { spaces: 2 }); this.messages.createdConfig(); },
        'Would create minions.json'
      );
    }

    const workspace = new WorkspaceService(cwd, settings);
    const roles = Object.keys(settings.roles) as AgentRole[];

    this.execute(
      () => { for (const role of roles) workspace.ensureRoleDir(role as AgentRole); this.messages.dirsCreated(roles); },
      `Would create .minions/ directories for: ${roles.join(', ')}`
    );

    this.execute(
      () => { if (workspace.ensureEnvTemplate()) this.messages.envTemplateCreated(); },
      'Would create .env template'
    );

    this.execute(
      () => { if (workspace.ensureGitignore()) this.messages.gitignoreUpdated(); },
      'Would update .gitignore'
    );

    this.messages.initialized();
  }
}
