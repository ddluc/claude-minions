import chalk from 'chalk';
import { MinionsServer } from '../../../server/src/index.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';

export async function server(): Promise<void> {
  try {
    const port = parseInt(process.env.SERVER_PORT ?? '3000');
    const srv = new MinionsServer();

    console.log(chalk.green(`Starting Minions server on port ${port}...`));
    srv.start(port);
  } catch (error) {
    console.error(chalk.red('Failed to start server:'));
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
