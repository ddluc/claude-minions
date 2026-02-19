import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';

const ROLE_COLORS: Record<string, (text: string) => string> = {
  'cao': chalk.cyan,
  'pm': chalk.magenta,
  'fe-engineer': chalk.yellow,
  'be-engineer': chalk.green,
  'qa': chalk.blue,
};

function colorRole(role: string): string {
  const colorFn = ROLE_COLORS[role] || chalk.white;
  return colorFn(role);
}

export async function chat(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const settings = loadSettings(workspaceRoot);
  const serverUrl = `ws://localhost:${settings.serverPort || 3000}/ws`;

  const ws = new WebSocket(serverUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'agent_status',
      role: 'user',
      status: 'online',
      timestamp: new Date().toISOString(),
    }));

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
        console.log(`\n${colorRole(msg.from)} (${time}):`);
        console.log(msg.content);
        console.log();

        rl.prompt();
      }

      if (msg.type === 'system') {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.log(chalk.dim(`  [system] ${msg.content}`));
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

  rl.on('line', (input) => {
    const trimmed = input.trim();
    if (trimmed) {
      ws.send(JSON.stringify({
        type: 'chat',
        from: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      }));
    }
    rl.prompt();
  });

  rl.on('close', () => {
    ws.send(JSON.stringify({
      type: 'agent_status',
      role: 'user',
      status: 'offline',
      timestamp: new Date().toISOString(),
    }));
    ws.close();
    process.exit(0);
  });
}
