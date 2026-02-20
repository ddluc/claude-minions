import chalk from 'chalk';
import { getWorkspaceRoot } from '../lib/config.js';
import { ProcessManager } from '../services/ProcessManager.js';

export async function down(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const pm = new ProcessManager(workspaceRoot);

  console.log(chalk.bold('🛑 Stopping claude-minions workspace...\n'));

  let stoppedAny = false;

  // Stop daemon
  const daemonStatus = pm.getStatus('daemon');
  if (daemonStatus.pid !== null) {
    if (pm.kill('daemon')) {
      console.log(chalk.green(`✓ Stopped daemon (PID: ${daemonStatus.pid})`));
      stoppedAny = true;
    } else {
      console.log(chalk.yellow(`⚠ Daemon not found (PID: ${daemonStatus.pid})`));
    }
  } else {
    console.log(chalk.dim('Daemon not running'));
  }

  // Stop server
  const serverStatus = pm.getStatus('server');
  if (serverStatus.pid !== null) {
    if (pm.kill('server')) {
      console.log(chalk.green(`✓ Stopped server (PID: ${serverStatus.pid})`));
      stoppedAny = true;
    } else {
      console.log(chalk.yellow(`⚠ Server not found (PID: ${serverStatus.pid})`));
    }
  } else {
    console.log(chalk.dim('Server not running'));
  }

  if (stoppedAny) {
    console.log(chalk.bold.green('\n✓ All processes stopped'));
  } else {
    console.log(chalk.dim('\nNo processes were running'));
  }
}
