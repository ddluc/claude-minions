import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatController } from '../ChatController.js';

// Mock the ws module
vi.mock('ws', () => {
  return { default: vi.fn() };
});

import WebSocket from 'ws';
const MockWebSocket = vi.mocked(WebSocket);

function makeMockWs(opts: {
  openImmediately?: boolean;
  errorImmediately?: boolean;
  sendError?: Error;
}) {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};
  const ws = {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
      // Trigger events asynchronously after all handlers are registered
      if (event === 'open' && opts.openImmediately) {
        setImmediate(() => handler());
      }
      if (event === 'error' && opts.errorImmediately) {
        setImmediate(() => handler(new Error('connection refused')));
      }
    }),
    send: vi.fn((_data: string, cb: (err?: Error) => void) => {
      setImmediate(() => cb(opts.sendError));
    }),
    terminate: vi.fn(),
    close: vi.fn(),
  };
  return ws;
}

describe('ChatController', () => {
  let controller: ChatController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ChatController(3000);
  });

  describe('pause()', () => {
    it('returns true when connection succeeds and message sends', async () => {
      const mockWs = makeMockWs({ openImmediately: true });
      MockWebSocket.mockImplementation(() => mockWs as any);

      const result = await controller.pause('be-engineer');

      expect(result).toBe(true);
      expect(mockWs.send).toHaveBeenCalledOnce();
      const sent = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sent.type).toBe('chat_control');
      expect(sent.action).toBe('pause');
      expect(sent.role).toBe('be-engineer');
      expect(mockWs.close).toHaveBeenCalledOnce();
    });

    it('returns false when server is not reachable', async () => {
      const mockWs = makeMockWs({ errorImmediately: true });
      MockWebSocket.mockImplementation(() => mockWs as any);

      const result = await controller.pause('be-engineer');

      expect(result).toBe(false);
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('returns false when send fails', async () => {
      const mockWs = makeMockWs({ openImmediately: true, sendError: new Error('send failed') });
      MockWebSocket.mockImplementation(() => mockWs as any);

      const result = await controller.pause('be-engineer');

      expect(result).toBe(false);
      expect(mockWs.close).toHaveBeenCalledOnce();
    });

    it('uses correct server port in WebSocket URL', async () => {
      const mockWs = makeMockWs({ openImmediately: true });
      MockWebSocket.mockImplementation(() => mockWs as any);
      const customController = new ChatController(4567);

      await customController.pause('be-engineer');

      expect(MockWebSocket).toHaveBeenCalledWith('ws://localhost:4567/ws');
    });
  });

  describe('resume()', () => {
    it('returns true when connection succeeds and message sends', async () => {
      const mockWs = makeMockWs({ openImmediately: true });
      MockWebSocket.mockImplementation(() => mockWs as any);

      const result = await controller.resume('be-engineer');

      expect(result).toBe(true);
      expect(mockWs.send).toHaveBeenCalledOnce();
      const sent = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sent.type).toBe('chat_control');
      expect(sent.action).toBe('resume');
      expect(sent.role).toBe('be-engineer');
      expect(mockWs.close).toHaveBeenCalledOnce();
    });

    it('returns false when server is not reachable', async () => {
      const mockWs = makeMockWs({ errorImmediately: true });
      MockWebSocket.mockImplementation(() => mockWs as any);

      const result = await controller.resume('be-engineer');

      expect(result).toBe(false);
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('returns false when send fails', async () => {
      const mockWs = makeMockWs({ openImmediately: true, sendError: new Error('send failed') });
      MockWebSocket.mockImplementation(() => mockWs as any);

      const result = await controller.resume('be-engineer');

      expect(result).toBe(false);
    });
  });

  describe('connection timeout', () => {
    it('returns false when connection times out', async () => {
      vi.useFakeTimers();
      // WebSocket that never opens or errors
      const ws = {
        on: vi.fn(),
        terminate: vi.fn(),
        close: vi.fn(),
        send: vi.fn(),
      };
      MockWebSocket.mockImplementation(() => ws as any);

      const pausePromise = controller.pause('be-engineer');
      vi.advanceTimersByTime(3001);
      const result = await pausePromise;

      expect(result).toBe(false);
      expect(ws.terminate).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });
  });
});
