import { parseMentions } from '../lib/utils.js';
import type { ChatMessage } from '../../../core/messages.js';
import type { AgentRole } from '../../../core/types.js';

export interface ProcessResult {
  response: string;
  sessionId?: string;
  error?: string;
}

export interface MessageRouterOptions {
  enabledRoles: AgentRole[];
  maxDepth: number;
  onProcess: (role: AgentRole, prompt: string) => ProcessResult;
  onSend: (msg: ChatMessage) => void;
}

interface QueuedItem {
  msg: ChatMessage;
  depth: number;
}

export class MessageRouter {
  private enabledRoles: Set<AgentRole>;
  private maxDepth: number;
  private onProcess: MessageRouterOptions['onProcess'];
  private onSend: MessageRouterOptions['onSend'];

  private queues = new Map<AgentRole, QueuedItem[]>();
  private processing = new Map<AgentRole, boolean>();

  constructor(options: MessageRouterOptions) {
    this.enabledRoles = new Set(options.enabledRoles);
    this.maxDepth = options.maxDepth;
    this.onProcess = options.onProcess;
    this.onSend = options.onSend;
  }

  /**
   * Entry point for incoming messages. Parses @mentions and enqueues to each
   * mentioned role that is enabled.
   */
  route(msg: ChatMessage): void {
    const mentions = parseMentions(msg.content);

    if (mentions.size === 0) {
      console.log(`No @mentions in message from ${msg.from} — skipping`);
      return;
    }

    for (const mention of mentions) {
      const role = mention as AgentRole;
      if (!this.enabledRoles.has(role)) {
        console.log(`Warning: Skipping disabled role: ${role}`);
        continue;
      }
      console.log(`[${role}] Mentioned by ${msg.from}`);
      this.enqueue(role, msg, 0);
    }
  }

  isProcessing(role: AgentRole): boolean {
    return this.processing.get(role) ?? false;
  }

  getQueueSize(role: AgentRole): number {
    return this.queues.get(role)?.length ?? 0;
  }

  private enqueue(role: AgentRole, msg: ChatMessage, depth: number): void {
    if (!this.queues.has(role)) {
      this.queues.set(role, []);
      this.processing.set(role, false);
    }
    this.queues.get(role)!.push({ msg, depth });
    this.processQueue(role);
  }

  private async processQueue(role: AgentRole): Promise<void> {
    if (this.processing.get(role)) return;

    const queue = this.queues.get(role);
    if (!queue || queue.length === 0) return;

    this.processing.set(role, true);

    while (queue.length > 0) {
      const { msg, depth } = queue.shift()!;

      if (depth >= this.maxDepth) {
        console.log(`[${role}] Max routing depth (${this.maxDepth}) reached — dropping message`);
        continue;
      }

      const prompt = `Message from ${msg.from}: ${msg.content}`;
      console.log(`[${role}] Processing message (depth=${depth}, ${queue.length} remaining in queue)`);

      try {
        const result = this.onProcess(role, prompt);

        if (result.error) {
          console.log(`[${role}] ${result.error}`);
          this.onSend({
            type: 'chat',
            from: role,
            content: `❌ ${result.error}`,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        console.log(`[${role}] Response generated (${result.response.length} chars)`);

        const responseMsg: ChatMessage = {
          type: 'chat',
          from: role,
          content: result.response,
          timestamp: new Date().toISOString(),
        };
        this.onSend(responseMsg);

        // Re-route @mentions in the response (agent-to-agent), skip self
        const responseMentions = parseMentions(result.response);
        for (const mention of responseMentions) {
          const targetRole = mention as AgentRole;
          if (targetRole === role) continue;
          if (!this.enabledRoles.has(targetRole)) continue;
          console.log(`[${role}] Response @mentions ${targetRole} — routing (depth=${depth + 1})`);
          this.enqueue(targetRole, responseMsg, depth + 1);
        }

        console.log(`[${role}] Response sent`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[${role}] Unexpected error: ${errorMsg}`);
        this.onSend({
          type: 'chat',
          from: role,
          content: `❌ Unexpected error: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.processing.set(role, false);
  }
}
