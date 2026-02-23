import WebSocket from 'ws';
import { MessageRouter } from './MessageRouter.js';
import { WorkspaceService } from './WorkspaceService.js';
import { ClaudeRunner } from './ClaudeRunner.js';
import type { AgentRole, Settings } from '../../core/types.js';

export interface ChatDaemonConfig {
  serverUrl: string;
  enabledRoles: AgentRole[];
  maxDepth: number;
  workspace: WorkspaceService;
  runner: ClaudeRunner;
  settings: Settings;
}

export class ChatDaemon {
  private ws: WebSocket | null = null;
  private router: MessageRouter;
  private shouldReconnect = true;
  private readonly reconnectInterval = 5000;
  private readonly config: ChatDaemonConfig;

  constructor(config: ChatDaemonConfig) {
    this.config = config;
    this.router = this.buildRouter();
  }

  private buildRouter(): MessageRouter {
    const { enabledRoles, maxDepth, workspace, runner, settings } = this.config;
    return new MessageRouter({
      enabledRoles,
      maxDepth,
      onProcess: async (role, prompt) => {
        const roleDir = workspace.getRoleDir(role);
        const sessionId = workspace.readSessionId(role);
        if (sessionId) console.log(`[${role}] Resuming session ${sessionId}`);
        const result = await runner.spawnHeadless({
          roleDir,
          prompt,
          sessionId,
          model: settings.roles[role]?.model,
          yolo: settings.mode === 'yolo',
        });
        if (result.sessionId) {
          workspace.writeSessionId(role, result.sessionId);
          console.log(`[${role}] Session ID captured: ${result.sessionId}`);
        }
        return {
          response: result.response,
          sessionId: result.sessionId ?? undefined,
          error: result.error ?? undefined,
        };
      },
      onSend: (msg) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(msg));
        }
      },
    });
  }

  start(): void {
    this.connect();
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
    console.log('Daemon running, monitoring all roles...');
  }

  stop(): void {
    console.log('Shutting down...');
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    process.exit(0);
  }

  private connect(): void {
    this.ws = new WebSocket(this.config.serverUrl);

    this.ws.on('open', () => {
      console.log('[daemon] Connected to server');
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'chat') {
          this.router.route(message);
        }
      } catch (error) {
        console.error('[daemon] Error parsing message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('[daemon] Disconnected from server');
      if (this.shouldReconnect) {
        setTimeout(() => {
          console.log('[daemon] Reconnecting...');
          this.connect();
        }, this.reconnectInterval);
      }
    });

    this.ws.on('error', (error) => {
      console.error('[daemon] WebSocket error:', error.message);
    });
  }
}
