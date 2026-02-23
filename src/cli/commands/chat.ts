import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { colorRole } from '../lib/utils.js';
import { DEFAULT_PORT } from '../../core/constants.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
marked.use(markedTerminal() as any);

function renderMarkdown(content: string): string {
  return (marked.parse(content) as string).trimEnd();
}

function separator(): void {
  console.log(chalk.dim('─'.repeat(60)));
}

export async function chat(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const serverUrl = `ws://localhost:${settings.serverPort || DEFAULT_PORT}/ws`;

  const ws = new WebSocket(serverUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  ws.on('open', () => {
    console.log(chalk.dim('Connected to minions chat. Type @role to message agents. Ctrl+C to exit.\n'));
    rl.prompt();
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'chat' && msg.from !== 'user') {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
        separator();
        console.log(`${colorRole(msg.from)} ${chalk.dim(`(${time})`)}`);
        console.log(renderMarkdown(msg.content));
        console.log();

        rl.prompt();
      }

      if (msg.type === 'system') {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.log(chalk.dim.italic(`  [system] ${msg.content}`));
        rl.prompt();
      }
    } catch (error) {
      // Ignore unparseable messages
    }
  });

  ws.on('error', (error) => {
    console.error(chalk.red(`Connection error: ${error.message}`));
    console.error(chalk.dim('Is the server running? Try: minions up'));
    process.exit(1);
  });

  ws.on('close', () => {
    console.log(chalk.dim('\nDisconnected from server.'));
    process.exit(0);
  });

  // Buffer lines from rapid paste events and combine into one message
  const PASTE_DEBOUNCE_MS = 50;
  let pasteBuffer: string[] = [];
  let pasteTimer: ReturnType<typeof setTimeout> | null = null;

  function flushPasteBuffer(): void {
    const lines = pasteBuffer.splice(0);
    const content = lines.join('\n');

    ws.send(JSON.stringify({
      type: 'chat',
      from: 'user',
      content,
      timestamp: new Date().toISOString(),
    }));

    // Clear buffered readline input lines, then echo formatted
    readline.moveCursor(process.stdout, 0, -lines.length);
    readline.clearScreenDown(process.stdout);
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    separator();
    console.log(`${chalk.bold.white('you')} ${chalk.dim(`(${time})`)}`);
    console.log(content);
    console.log();

    rl.prompt();
  }

  rl.on('line', (input) => {
    const trimmed = input.trim();
    if (trimmed) {
      pasteBuffer.push(trimmed);
      if (pasteTimer) clearTimeout(pasteTimer);
      pasteTimer = setTimeout(flushPasteBuffer, PASTE_DEBOUNCE_MS);
    } else {
      rl.prompt();
    }
  });

  rl.on('close', () => {
    ws.close();
    process.exit(0);
  });
}
