import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageRouter } from '../MessageRouter.js';
import type { ProcessResult } from '../MessageRouter.js';
import type { ChatMessage } from '../../../../core/messages.js';
import type { AgentRole } from '../../../../core/types.js';

function makeMsg(content: string, from = 'user'): ChatMessage {
  return { type: 'chat', from, content, timestamp: new Date().toISOString() };
}

function makeRouter(overrides?: {
  enabledRoles?: AgentRole[];
  maxDepth?: number;
  onProcess?: (role: AgentRole, prompt: string) => Promise<ProcessResult>;
  onSend?: (msg: ChatMessage) => void;
}) {
  const onProcess = overrides?.onProcess ?? vi.fn().mockResolvedValue({ response: 'ok', error: undefined });
  const onSend = overrides?.onSend ?? vi.fn();
  const router = new MessageRouter({
    enabledRoles: overrides?.enabledRoles ?? ['cao', 'be-engineer', 'pm', 'qa', 'fe-engineer'],
    maxDepth: overrides?.maxDepth ?? 5,
    onProcess,
    onSend,
  });
  return { router, onProcess, onSend };
}

// Helper to wait for all pending microtasks/promises to settle
function flush() {
  return new Promise(resolve => setTimeout(resolve, 10));
}

describe('MessageRouter', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('single @mention — calls onProcess for that role', async () => {
    const { router, onProcess } = makeRouter();
    router.route(makeMsg('hey @cao what is 2+2?'));
    await flush();
    expect(onProcess).toHaveBeenCalledOnce();
    expect(onProcess).toHaveBeenCalledWith('cao', expect.stringContaining('2+2'));
  });

  it('multiple @mentions — each role gets its own queue entry', async () => {
    const { router, onProcess } = makeRouter();
    router.route(makeMsg('@cao and @be-engineer please review this'));
    await flush();
    expect(onProcess).toHaveBeenCalledTimes(2);
    const roles = (onProcess as ReturnType<typeof vi.fn>).mock.calls.map((c: any[]) => c[0]);
    expect(roles).toContain('cao');
    expect(roles).toContain('be-engineer');
  });

  it('no @mentions — message is ignored, onProcess not called', async () => {
    const { router, onProcess } = makeRouter();
    router.route(makeMsg('just a message with no mentions'));
    await flush();
    expect(onProcess).not.toHaveBeenCalled();
  });

  it('disabled role — message skipped, onProcess not called', async () => {
    const { router, onProcess } = makeRouter({ enabledRoles: ['cao'] });
    router.route(makeMsg('@be-engineer do something'));
    await flush();
    expect(onProcess).not.toHaveBeenCalled();
  });

  it('depth limit — message dropped at maxDepth', async () => {
    const onProcessChain = vi.fn()
      .mockResolvedValueOnce({ response: 'hi @be-engineer' })
      .mockResolvedValueOnce({ response: 'hi @pm' })
      .mockResolvedValue({ response: 'done' });
    const onSend = vi.fn();
    const chainRouter = new MessageRouter({
      enabledRoles: ['cao', 'be-engineer', 'pm'],
      maxDepth: 2,
      onProcess: onProcessChain,
      onSend,
    });
    chainRouter.route(makeMsg('@cao start the chain'));
    await flush();
    expect(onProcessChain).toHaveBeenCalledTimes(2);
    const calledRoles = onProcessChain.mock.calls.map((c: any[]) => c[0]);
    expect(calledRoles).toContain('cao');
    expect(calledRoles).toContain('be-engineer');
    expect(calledRoles).not.toContain('pm');
  });

  it('response re-routing — @mentions in response trigger enqueue at depth + 1', async () => {
    const onProcess = vi.fn()
      .mockResolvedValueOnce({ response: 'hey @be-engineer do this' })
      .mockResolvedValueOnce({ response: 'done' });
    const onSend = vi.fn();
    const router = new MessageRouter({
      enabledRoles: ['cao', 'be-engineer'],
      maxDepth: 5,
      onProcess,
      onSend,
    });
    router.route(makeMsg('@cao please help'));
    await flush();
    expect(onProcess).toHaveBeenCalledTimes(2);
    expect(onProcess.mock.calls[0][0]).toBe('cao');
    expect(onProcess.mock.calls[1][0]).toBe('be-engineer');
  });

  it('self-mention in response — not re-routed', async () => {
    const onProcess = vi.fn().mockResolvedValue({ response: '@cao here is my answer' });
    const { router } = makeRouter({ onProcess });
    router.route(makeMsg('@cao what do you think?'));
    await flush();
    expect(onProcess).toHaveBeenCalledOnce();
  });

  it('error from onProcess — error message sent via onSend, queue continues', async () => {
    const onProcess = vi.fn()
      .mockResolvedValueOnce({ response: '', error: 'Claude CLI not found' })
      .mockResolvedValueOnce({ response: 'all good' });
    const onSend = vi.fn();
    const router = new MessageRouter({
      enabledRoles: ['cao'],
      maxDepth: 5,
      onProcess,
      onSend,
    });
    router.route(makeMsg('@cao first message'));
    await flush();
    router.route(makeMsg('@cao second message'));
    await flush();
    expect(onProcess).toHaveBeenCalledTimes(2);
    const errorMsg = (onSend as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0].content.includes('❌')
    );
    expect(errorMsg).toBeDefined();
  });

  it('batching — multiple queued messages sent as one onProcess call', async () => {
    // Block the queue on the first call so messages 2+3 pile up, then release
    let unblock!: () => void;
    const blocked = new Promise<void>(res => { unblock = res; });

    const onProcess = vi.fn()
      .mockImplementationOnce(async () => {
        await blocked;
        return { response: 'batch response' };
      })
      .mockResolvedValue({ response: 'ok' });

    const { router } = makeRouter({ onProcess, enabledRoles: ['cao'] });

    // Route first message — this starts processing and blocks
    router.route(makeMsg('@cao message one'));
    // Queue two more while first is in flight
    router.route(makeMsg('@cao message two'));
    router.route(makeMsg('@cao message three'));

    // Unblock the first call
    unblock();
    await flush();

    // First call: single message. Second call: batch of 2.
    expect(onProcess).toHaveBeenCalledTimes(2);
    const secondCallPrompt = onProcess.mock.calls[1][1] as string;
    expect(secondCallPrompt).toContain('2 new messages');
    expect(secondCallPrompt).toContain('message two');
    expect(secondCallPrompt).toContain('message three');
  });

  it('batching — single queued message uses simple prompt format', async () => {
    const onProcess = vi.fn().mockResolvedValue({ response: 'ok' });
    const { router } = makeRouter({ onProcess });
    router.route(makeMsg('@cao just one message'));
    await flush();
    const prompt = onProcess.mock.calls[0][1] as string;
    // Single message uses "Message from X: Y" format, not numbered list
    expect(prompt).toMatch(/^Message from/);
    expect(prompt).not.toContain('new messages');
  });

  it('queue isolation — processing one role does not block another', async () => {
    const processingOrder: AgentRole[] = [];
    const onProcess = vi.fn().mockImplementation((role: AgentRole) => {
      processingOrder.push(role);
      return Promise.resolve({ response: 'ok' });
    });
    const { router } = makeRouter({ onProcess });
    router.route(makeMsg('@cao hello'));
    router.route(makeMsg('@be-engineer hello'));
    await flush();
    expect(processingOrder).toContain('cao');
    expect(processingOrder).toContain('be-engineer');
  });

  it('onSend called with response message after successful processing', async () => {
    const { router, onSend } = makeRouter({
      onProcess: vi.fn().mockResolvedValue({ response: 'here is my answer' }),
    });
    router.route(makeMsg('@cao tell me something'));
    await flush();
    const sentMsg = (onSend as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0].content === 'here is my answer'
    );
    expect(sentMsg).toBeDefined();
    expect(sentMsg![0].from).toBe('cao');
    expect(sentMsg![0].type).toBe('chat');
  });

  it('isProcessing returns false after queue drains', async () => {
    const { router } = makeRouter({
      onProcess: vi.fn().mockResolvedValue({ response: 'done' }),
    });
    expect(router.isProcessing('cao' as AgentRole)).toBe(false);
    router.route(makeMsg('@cao hello'));
    await flush();
    expect(router.isProcessing('cao' as AgentRole)).toBe(false);
  });

  it('getQueueSize returns correct count', () => {
    const { router } = makeRouter({
      onProcess: vi.fn().mockResolvedValue({ response: 'ok' }),
    });
    expect(router.getQueueSize('cao' as AgentRole)).toBe(0);
  });
});
