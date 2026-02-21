import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { colorRole } from '../lib/utils.js';
import type { Message } from '../../../core/messages.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
marked.use(markedTerminal() as any);

export class ChatCLIClient {
  private ws: WebSocket | null = null;
  private reconnectInterval = 5000;
  private shouldReconnect = true;
  private messageHandlers: ((msg: Message) => void)[] = [];

  constructor(
    private serverUrl: string,
    private reprompt: () => void,
  ) {}

  connect(): void {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      this.print(chalk.dim('Connected to minions chat. Type @role to message agents. Ctrl+C to exit.\n\n'));
      this.reprompt();
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as Message;
        this.messageHandlers.forEach(h => h(msg));
        this.renderMessage(msg);
      } catch {}
    });

    this.ws.on('close', () => {
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      } else {
        this.print(chalk.dim('\nDisconnected from server.\n'));
        process.exit(0);
      }
    });

    this.ws.on('error', (error) => {
      this.print(chalk.red(`Connection error: ${error.message}\n`));
      this.print(chalk.dim('Is the server running? Try: minions up\n'));
      process.exit(1);
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  listen(rl: readline.Interface): void {
    rl.on('line', (input) => {
      const trimmed = input.trim();
      if (!trimmed) { this.reprompt(); return; }
      this.send(trimmed);
    });
  }

  on(event: 'message', handler: (msg: Message) => void): void {
    this.messageHandlers.push(handler);
  }

  send(content: string): void {
    this.sendMessage({
      type: 'chat',
      from: 'user',
      content,
      timestamp: new Date().toISOString(),
    } as Message);

    // Clear the readline input line, then echo formatted
    readline.moveCursor(process.stdout, 0, -1);
    readline.clearLine(process.stdout, 0);
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.separator();
    this.print(`${chalk.bold.white('you')} ${chalk.dim(`(${time})`)}\n`);
    this.print(`${content}\n\n`);
    this.reprompt();
  }

  sendMessage(msg: Message): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private renderMessage(msg: Message): void {
    if (msg.type === 'chat' && msg.from !== 'user') {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
      this.separator();
      this.print(`${colorRole(msg.from)} ${chalk.dim(`(${time})`)}\n`);
      this.print(`${this.renderMarkdown(msg.content)}\n\n`);
      this.reprompt();
    }

    if (msg.type === 'system') {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      this.print(chalk.dim.italic(`  [system] ${msg.content}\n`));
      this.reprompt();
    }
  }

  private renderMarkdown(content: string): string {
    return (marked.parse(content) as string).trimEnd();
  }

  private separator(): void {
    this.print(chalk.dim('─'.repeat(60)) + '\n');
  }

  // Write directly to stdout, bypassing any console.log redirects
  private print(text: string): void {
    process.stdout.write(text);
  }
}
