import { log } from '../lib/logger.js';
import { loadSettings, getWorkspaceRoot } from '../lib/config.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
import { MinionsServer } from '../../server/MinionsServer.js';
import { DaemonCommand } from './daemon.js';
import { DEFAULT_PORT } from '../../core/constants.js';

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

  async run(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    const settings = loadSettings(workspaceRoot);

    this.messages.header();
    this.messages.preparingWorkspace();

    const workspace = new WorkspaceService(workspaceRoot, settings);
    const hasSshKey = !!settings.ssh;

    workspace.setupAllRoles(hasSshKey);
    for (const role of Object.keys(settings.roles)) {
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
    await srv.start(port);

    const roles = Object.keys(settings.roles);
    this.messages.ready(roles, port);

    await new DaemonCommand().run();
  }
}
