import 'dotenv/config';
import { Command } from 'commander';
import { init } from './commands/init.js';
import { chat } from './commands/chat.js';
import { up } from './commands/up.js';
import { tap } from './commands/tap.js';
import { VALID_ROLES } from '../core/constants.js';

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
  .description('Start server and daemon (foreground — Ctrl+C to stop)')
  .action(up);

program
  .command('tap <role>')
  .description(`Tap into an agent's session interactively (${VALID_ROLES.join(', ')})`)
  .action(tap);

program
  .command('chat')
  .description('Open interactive chat with agents')
  .action(chat);

program.parse();
