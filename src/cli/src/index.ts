import 'dotenv/config';
import { Command } from 'commander';
import { init } from './commands/init.js';
import { server } from './commands/server.js';
import { status } from './commands/status.js';
import { daemon } from './commands/daemon.js';
import { chat } from './commands/chat.js';
import { up } from './commands/up.js';
import { down } from './commands/down.js';
import { permissionsUpdate } from './commands/permissions.js';
import { tap } from './commands/tap.js';
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
  .command('up')
  .description('Start server and daemon')
  .action(up);

program
  .command('down')
  .description('Stop server and daemon')
  .action(down);

program
  .command('tap <role>')
  .description(`Tap into an agent's session interactively (${VALID_ROLES.join(', ')})`)
  .action(tap);

program
  .command('chat')
  .description('Open interactive chat with agents')
  .action(chat);

program
  .command('status')
  .description('Show status of all agents')
  .action(status);

const permissions = program
  .command('permissions')
  .description('Manage agent permissions');

permissions
  .command('update')
  .description('Re-apply permissions from minions.json to all roles')
  .action(permissionsUpdate);

// Internal commands used by `up` — hidden from help output
program
  .command('server', { hidden: true })
  .description('Start the minions server')
  .action(server);

program
  .command('daemon', { hidden: true })
  .description('Start the daemon for autonomous agent communication')
  .action(daemon);

program.parse();
