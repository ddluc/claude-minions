import chalk from 'chalk';
import path from 'path';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { resolvePermissions, writePermissionsFile } from '../lib/permissions.js';
import type { AgentRole } from '../../../core/types.js';

export async function permissionsUpdate(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const minionsDir = path.join(workspaceRoot, '.minions');

  const roles = Object.keys(settings.roles) as AgentRole[];

  if (roles.length === 0) {
    console.log(chalk.yellow('No roles configured in minions.json'));
    return;
  }

  console.log(chalk.bold('Updating permissions...\n'));

  for (const role of roles) {
    const resolved = resolvePermissions(settings.permissions, settings.roles[role]?.permissions);
    const roleDir = path.join(minionsDir, role);
    writePermissionsFile(roleDir, resolved);

    console.log(chalk.green(`  ${role}:`));
    console.log(chalk.dim(`    allow: ${resolved.allow.join(', ')}`));
    if (resolved.deny.length > 0) {
      console.log(chalk.dim(`    deny:  ${resolved.deny.join(', ')}`));
    }
  }

  console.log(chalk.bold.green('\nPermissions updated for all roles.'));
}
