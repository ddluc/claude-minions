import { log } from '../lib/logger.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { checkClaudeVersion } from '../lib/utils.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { ChatDaemon } from '../services/ChatDaemon.js';
import { ClaudeRunner } from '../services/ClaudeRunner.js';
import { MinionsServer } from '../../server/MinionsServer.js';
import { DEFAULT_PORT } from '../../core/constants.js';
import { getEnabledRoles } from '../../core/settings.js';

/**
 * Starts the Minions server and daemon — prepares workspaces, clones repos, and begins routing messages.
 */
export class UpCommand {
  messages = {
    header: () => {
      log.info('Starting claude-minions workspace...\n');
    },
    preparingWorkspace: () => {
      log.info('Preparing workspace...\n');
    },
    roleConfigured: (role: string) => {
      log.indent(2).dim(`Configured .minions/${role}/`);
    },
    repoCloned: (role: string, repoName: string) => {
      log.indent(2).success(`Cloned ${repoName} into .minions/${role}/${repoName}`);
    },
    repoExists: (role: string, repoName: string) => {
      log.indent(2).dim(`${repoName} already present for ${role}`);
    },
    workspaceReady: () => {
      log.success('\nWorkspace ready.\n');
    },
    ready: (roles: string[], port: number) => {
      log.success('\n✓ Minions ready!\n');
      log.indent(2).dim('minions chat          Open group chat');
      for (const role of roles) {
        log.indent(2).dim(`minions tap ${role.padEnd(12)}Tap into ${role} session`);
      }
      log.dim('\nPress Ctrl+C to stop.\n');
    },
  };

  /**
   * Set up all roles, clone repos, start the HTTP/WebSocket server, and launch the daemon.
   */
  async run(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    const settings = loadSettings(workspaceRoot);

    this.messages.header();
    const versionWarning = checkClaudeVersion();
    if (versionWarning) {
      log.warn(versionWarning);
    }
    this.messages.preparingWorkspace();

    const workspace = new WorkspaceService(workspaceRoot, settings);
    const hasSshKey = !!settings.ssh;

    const enabledRoles = getEnabledRoles(settings);

    workspace.setupAllRoles(hasSshKey);
    for (const role of enabledRoles) {
      this.messages.roleConfigured(role);
    }

    const cloneResults = workspace.cloneAllRepos();
    for (const { role, repoName, cloned } of cloneResults) {
      if (cloned) {
        this.messages.repoCloned(role, repoName);
      } else {
        this.messages.repoExists(role, repoName);
      }
    }

    this.messages.workspaceReady();

    const port = settings.serverPort || DEFAULT_PORT;
    const srv = new MinionsServer();
    if (versionWarning) {
      srv.addStartupWarning(versionWarning);
    }
    await srv.start(port);

    this.messages.ready(enabledRoles, port);

    const daemon = new ChatDaemon({
      serverUrl: `ws://localhost:${port}/ws`,
      enabledRoles,
      maxDepth: 5,
      workspace,
      runner: new ClaudeRunner(),
      settings,
    });
    daemon.start();
  }
}
