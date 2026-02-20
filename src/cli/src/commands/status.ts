import chalk from 'chalk';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';

export async function status(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const roles = Object.keys(settings.roles);

  console.log(chalk.bold('\nMinions Agent Status\n'));

  for (const role of roles) {
    console.log(`  ${chalk.dim('○')} ${role}`);
  }

  console.log();
}
