import { describe, it, expect } from 'vitest';
import { ClaudeRunner } from '../ClaudeRunner.js';

describe('ClaudeRunner', () => {
  const runner = new ClaudeRunner();

  describe('buildArgs', () => {
    it('returns empty array with no options', () => {
      expect(runner.buildArgs({})).toEqual([]);
    });

    it('adds --resume when sessionId is provided', () => {
      const args = runner.buildArgs({ sessionId: 'abc-123' });
      expect(args).toEqual(['--resume', 'abc-123']);
    });

    it('skips --resume when sessionId is null', () => {
      const args = runner.buildArgs({ sessionId: null });
      expect(args).toEqual([]);
    });

    it('adds --model when model is provided', () => {
      const args = runner.buildArgs({ model: 'opus' });
      expect(args).toEqual(['--model', 'opus']);
    });

    it('adds --dangerously-skip-permissions when yolo is true', () => {
      const args = runner.buildArgs({ yolo: true });
      expect(args).toEqual(['--dangerously-skip-permissions']);
    });

    it('does not add yolo flag when false', () => {
      const args = runner.buildArgs({ yolo: false });
      expect(args).toEqual([]);
    });

    it('adds -p and --output-format for json output', () => {
      const args = runner.buildArgs({ outputFormat: 'json' });
      expect(args).toEqual(['-p', '--output-format', 'json']);
    });

    it('appends prompt as last argument', () => {
      const args = runner.buildArgs({ prompt: 'hello world' });
      expect(args).toEqual(['hello world']);
    });

    it('builds full headless args correctly', () => {
      const args = runner.buildArgs({
        sessionId: 'sess-1',
        model: 'sonnet',
        yolo: true,
        outputFormat: 'json',
        prompt: 'do something',
      });
      expect(args).toEqual([
        '-p', '--output-format', 'json',
        '--model', 'sonnet',
        '--dangerously-skip-permissions',
        '--resume', 'sess-1',
        'do something',
      ]);
    });

    it('builds interactive args correctly (no outputFormat, no prompt)', () => {
      const args = runner.buildArgs({
        sessionId: 'sess-1',
        model: 'opus',
        yolo: false,
      });
      expect(args).toEqual([
        '--model', 'opus',
        '--resume', 'sess-1',
      ]);
    });
  });

  describe('parseHeadlessOutput', () => {
    it('parses valid JSON with result and session_id', () => {
      const output = JSON.stringify({
        result: 'Hello from Claude',
        session_id: 'new-sess-123',
      });
      expect(runner.parseHeadlessOutput(output)).toEqual({
        response: 'Hello from Claude',
        sessionId: 'new-sess-123',
        error: null,
      });
    });

    it('handles JSON with result but no session_id', () => {
      const output = JSON.stringify({ result: 'response text' });
      expect(runner.parseHeadlessOutput(output)).toEqual({
        response: 'response text',
        sessionId: null,
        error: null,
      });
    });

    it('handles JSON with empty result', () => {
      const output = JSON.stringify({ result: '', session_id: 'sess' });
      expect(runner.parseHeadlessOutput(output)).toEqual({
        response: '',
        sessionId: 'sess',
        error: null,
      });
    });

    it('falls back to plain text for invalid JSON', () => {
      expect(runner.parseHeadlessOutput('plain text response')).toEqual({
        response: 'plain text response',
        sessionId: null,
        error: null,
      });
    });

    it('trims whitespace in plain text fallback', () => {
      expect(runner.parseHeadlessOutput('  text with spaces  \n')).toEqual({
        response: 'text with spaces',
        sessionId: null,
        error: null,
      });
    });

    it('handles empty string', () => {
      expect(runner.parseHeadlessOutput('')).toEqual({
        response: '',
        sessionId: null,
        error: null,
      });
    });
  });
});
