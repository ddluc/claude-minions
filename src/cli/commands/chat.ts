import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { log } from '../lib/logger.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { colorRole } from '../lib/utils.js';
import { DEFAULT_PORT } from '../../core/constants.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
marked.use(markedTerminal() as any);

export class ChatCommand {
  private renderMarkdown(content: string): string {
    return (marked.parse(content) as string).trimEnd();
  }

  private separator(): void {
    console.log(chalk.dim('─'.repeat(60)));
  }

  messages = {
    connected: () => {
      log.dim('Connected to minions chat. Type @role to message agents. Ctrl+C to exit.\n');
    },
    agentMessage: (from: string, time: string, content: string) => {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      this.separator();
      console.log(`${colorRole(from)} ${chalk.dim(`(${time})`)}`);
      console.log(this.renderMarkdown(content));
      console.log();
    },
    systemMessage: (content: string) => {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(chalk.dim.italic(`  [system] ${content}`));
    },
    connectionError: (error: Error) => {
      log.error(`Connection error: ${error.message}`);
      log.dim('Is the server running? Try: minions up');
    },
    disconnected: () => {
      log.dim('\nDisconnected from server.');
    },
    userEcho: (time: string, content: string, lineCount: number) => {
      readline.moveCursor(process.stdout, 0, -lineCount);
      readline.clearScreenDown(process.stdout);
      this.separator();
      console.log(`${chalk.bold.white('you')} ${chalk.dim(`(${time})`)}`);
      console.log(content);
      console.log();
    },
  };

  async run(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    const settings = loadSettings(workspaceRoot);
    const serverUrl = `ws://localhost:${settings.serverPort || DEFAULT_PORT}/ws`;

    const ws = new WebSocket(serverUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    ws.on('open', () => {
      this.messages.connected();
      rl.prompt();
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'chat' && msg.from !== 'user') {
          const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
          this.messages.agentMessage(msg.from, time, msg.content);
          rl.prompt();
        }

        if (msg.type === 'system') {
          this.messages.systemMessage(msg.content);
          rl.prompt();
        }
      } catch {
        // Ignore unparseable messages
      }
    });

    ws.on('error', (error) => {
      this.messages.connectionError(error);
      process.exit(1);
    });

    ws.on('close', () => {
      this.messages.disconnected();
      process.exit(0);
    });

    const PASTE_DEBOUNCE_MS = 50;
    let pasteBuffer: string[] = [];
    let pasteTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPasteBuffer = () => {
      const lines = pasteBuffer.splice(0);
      const content = lines.join('\n');

      ws.send(JSON.stringify({
        type: 'chat',
        from: 'user',
        content,
        timestamp: new Date().toISOString(),
      }));

      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      this.messages.userEcho(time, content, lines.length);
      rl.prompt();
    };

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
}
