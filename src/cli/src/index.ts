import { Command } from 'commander';
import { init } from './commands/init.js';
import { server } from './commands/server.js';
import { start } from './commands/start.js';
import { stop } from './commands/stop.js';
import { status } from './commands/status.js';
import { daemon } from './commands/daemon.js';
import { up } from './commands/up.js';
import { down } from './commands/down.js';
import { VALID_ROLES } from '../../core/constants.js';

const program = new Command();

program
  .name('minions')
  .version('0.2.0')
  .description('Claude Minions - AI agent orchestration');

program
  .command('init')
  .description('Initialize a new minions workspace')
  .action(init);

program
  .command('server')
  .description('Start the minions server')
  .action(server);

program
  .command('daemon')
  .description('Start the daemon for autonomous agent communication')
  .action(daemon);

program
  .command('up')
  .description('Start server and daemon')
  .action(up);

program
  .command('down')
  .description('Stop server and daemon')
  .action(down);

program
  .command('start <role>')
  .description(`Start an agent with the given role (${VALID_ROLES.join(', ')})`)
  .action(start);

program
  .command('stop <role>')
  .description('Stop a running agent by role')
  .action(stop);

program
  .command('status')
  .description('Show status of all agents')
  .action(status);

program.parse();
