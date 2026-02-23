import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { log } from '../lib/logger.js';
import { colorRole } from '../lib/utils.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
marked.use(markedTerminal() as any);

/**
 * WebSocket client for interactive group chat with markdown rendering.
 */
export class ChatClient {
  private ws: WebSocket;
  private rl: readline.Interface;

  constructor(private serverUrl: string) {
    this.ws = new WebSocket(serverUrl);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.rl.setPrompt(chalk.bold.white('you') + chalk.dim(' > '));
  }

  /**
   * Render markdown content as formatted terminal output.
   */
  private renderMarkdown(content: string): string {
    return (marked.parse(content) as string).trimEnd();
  }

  /**
   * Print a dim horizontal rule to visually separate messages.
   */
  private separator(): void {
    console.log(chalk.dim('─'.repeat(60)));
  }

  /**
   * Display an agent's chat message with role label and timestamp.
   */
  private agentMessage(from: string, time: string, content: string): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    this.separator();
    console.log(`${colorRole(from)} ${chalk.dim(`(${time})`)}`);
    console.log(this.renderMarkdown(content));
    console.log();
  }

  /**
   * Open WebSocket connection and start the readline input loop.
   */
  start(): void {
    this.ws.on('open', () => {
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
          const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
          this.agentMessage('system', time, msg.content);
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
        const timestamp = new Date().toISOString();
        this.ws.send(JSON.stringify({ type: 'chat', from: 'user', content: trimmed, timestamp }));
      }
      console.log();
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.ws.close();
      process.exit(0);
    });
  }

  /**
   * Close readline and WebSocket connections.
   */
  disconnect(): void {
    this.rl.close();
    this.ws.close();
  }
}
