import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { log } from '../lib/logger.js';
import { colorRole } from '../lib/utils.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
marked.use(markedTerminal() as any);

export class ChatClient {
  private ws: WebSocket;
  private rl: readline.Interface;

  constructor(private serverUrl: string) {
    this.ws = new WebSocket(serverUrl);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private renderMarkdown(content: string): string {
    return (marked.parse(content) as string).trimEnd();
  }

  private separator(): void {
    console.log(chalk.dim('─'.repeat(60)));
  }

  private agentMessage(from: string, time: string, content: string): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    this.separator();
    console.log(`${colorRole(from)} ${chalk.dim(`(${time})`)}`);
    console.log(this.renderMarkdown(content));
    console.log();
  }

  private systemMessage(content: string): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    console.log(chalk.dim.italic(`[system] ${content} \n`));
  }

  private userEcho(time: string, content: string): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    this.separator();
    console.log(`${chalk.bold.white('you')} ${chalk.dim(`(${time})`)}`);
    console.log(content);
    console.log();
  }

  start(): void {
    this.ws.on('open', () => {
      log.dim('Connected to minions chat. Type @role to message agents. Ctrl+C to exit.\n');
      this.rl.prompt();
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'chat' && msg.from !== 'user') {
          const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
          this.agentMessage(msg.from, time, msg.content);
          this.rl.prompt();
        }

        if (msg.type === 'system') {
          this.systemMessage(msg.content);
          this.rl.prompt();
        }
      } catch {
        // Ignore unparseable messages
      }
    });

    this.ws.on('error', (error: Error) => {
      log.error(`Connection error: ${error.message}`);
      log.dim('Is the server running? Try: minions up');
      process.exit(1);
    });

    this.ws.on('close', () => {
      log.dim('\nDisconnected from server.');
      process.exit(0);
    });

    this.rl.on('line', (input) => {
      const trimmed = input.trim();
      if (trimmed) {
        const content = trimmed;
        const timestamp = new Date().toISOString();
        this.ws.send(JSON.stringify({ type: 'chat', from: 'user', content, timestamp }));
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        this.userEcho(time, content);
        this.rl.prompt();
      } else {
        this.rl.prompt();
      }
    });

    this.rl.on('close', () => {
      this.ws.close();
      process.exit(0);
    });
  }

  disconnect(): void {
    this.rl.close();
    this.ws.close();
  }
}
