import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { serverCommand } from './commands/server.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import { VALID_ROLES } from '../../core/constants.js';

const program = new Command();

program
  .name('minions')
  .version('0.2.0')
  .description('Claude Minions - AI agent orchestration');

program
  .command('init')
  .description('Initialize a new minions workspace')
  .action(initCommand);

program
  .command('server')
  .description('Start the minions server')
  .action(serverCommand);

program
  .command('start <role>')
  .description(`Start an agent with the given role (${VALID_ROLES.join(', ')})`)
  .action(startCommand);

program
  .command('stop <role>')
  .description('Stop a running agent by role')
  .action(stopCommand);

program
  .command('status')
  .description('Show status of all agents')
  .action(statusCommand);

program.parse();
