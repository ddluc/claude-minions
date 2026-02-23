import 'dotenv/config';
import { Command } from 'commander';
import { InitCommand } from './commands/init.js';
import { ChatCommand } from './commands/chat.js';
import { UpCommand } from './commands/up.js';
import { TapCommand } from './commands/tap.js';
import { VALID_ROLES } from '../core/constants.js';

const program = new Command();

program
  .name('minions')
  .version('0.2.0')
  .description('Claude Minions - AI agent orchestration');

program
  .command('init')
  .description('Initialize a new minions workspace')
  .option('--dry-run', 'Run prompts without writing any files')
  .action((opts) => new InitCommand().run({ dryRun: opts.dryRun }));

program
  .command('up')
  .description('Start server and daemon (foreground — Ctrl+C to stop)')
  .action(() => new UpCommand().run());

program
  .command('tap <role>')
  .description(`Tap into an agent's session interactively (${VALID_ROLES.join(', ')})`)
  .action((role) => new TapCommand().run(role));

program
  .command('chat')
  .description('Open interactive chat with agents')
  .action(() => new ChatCommand().run());

program.parse();
