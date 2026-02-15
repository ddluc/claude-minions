import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { VALID_ROLES } from '../../../core/constants.js';
import type { Repo, Settings } from '../../../core/types.js';
import { generateConnectMd } from '../lib/templates.js';

export async function init(): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'minions.json');
  const minionsDir = path.join(cwd, '.minions');

  // Check if already initialized
  if (fs.existsSync(configPath)) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'minions.json already exists. Overwrite?',
      default: false,
    }]);
    if (!overwrite) {
      console.log(chalk.yellow('Init cancelled.'));
      return;
    }
  }

  console.log(chalk.bold('\nClaude Minions - Workspace Setup\n'));

  // Prompt for mode
  const { mode } = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: 'Agent permission mode:',
    choices: [
      { name: 'ask  - Agents prompt before tool use (recommended for local dev)', value: 'ask' },
      { name: 'yolo - Agents auto-approve all actions (for EC2/autonomous)', value: 'yolo' },
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

  // Write minions.json
  const settings: Settings = { mode, repos };
  fs.writeJSONSync(configPath, settings, { spaces: 2 });
  console.log(chalk.green('\n  Created minions.json'));

  // Create .minions/ directory structure
  for (const role of VALID_ROLES) {
    fs.ensureDirSync(path.join(minionsDir, role, 'tasks'));
  }
  console.log(chalk.green('  Created .minions/ agent directories'));

  // Create connect.md
  fs.writeFileSync(path.join(minionsDir, 'connect.md'), generateConnectMd());
  console.log(chalk.green('  Created .minions/connect.md'));

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
  console.log(chalk.dim('  2. Run `minions server` to start the server'));
  console.log(chalk.dim('  3. Run `minions start <role>` to start an agent'));
}
