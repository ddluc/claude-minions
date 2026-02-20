import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ProcessManager } from '../ProcessManager.js';

describe('ProcessManager', () => {
  let tmpDir: string;
  let pm: ProcessManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'));
    fs.ensureDirSync(path.join(tmpDir, '.minions'));
    pm = new ProcessManager(tmpDir);
  });

  afterEach(() => {
    fs.removeSync(tmpDir);
    vi.restoreAllMocks();
  });

  describe('isRunning', () => {
    it('returns true for current process', () => {
      expect(pm.isRunning(process.pid)).toBe(true);
    });

    it('returns false for non-existent PID', () => {
      expect(pm.isRunning(999999)).toBe(false);
    });
  });

  describe('readPid / writePid / removePid', () => {
    it('writes and reads a PID', () => {
      pm.writePid('server', 12345);
      expect(pm.readPid('server')).toBe(12345);
    });

    it('returns null when PID file does not exist', () => {
      expect(pm.readPid('nonexistent')).toBe(null);
    });

    it('returns null for invalid PID file content', () => {
      fs.writeFileSync(path.join(tmpDir, '.minions', 'bad.pid'), 'not-a-number');
      expect(pm.readPid('bad')).toBe(null);
    });

    it('removes PID file', () => {
      pm.writePid('server', 12345);
      pm.removePid('server');
      expect(pm.readPid('server')).toBe(null);
    });

    it('removePid does not throw if file does not exist', () => {
      expect(() => pm.removePid('nonexistent')).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('returns running: true for a live process', () => {
      pm.writePid('server', process.pid);
      const status = pm.getStatus('server');
      expect(status).toEqual({ running: true, pid: process.pid });
    });

    it('returns running: false and cleans stale PID', () => {
      pm.writePid('server', 999999);
      const status = pm.getStatus('server');
      expect(status).toEqual({ running: false, pid: null });
      // PID file should be cleaned up
      expect(pm.readPid('server')).toBe(null);
    });

    it('returns running: false when no PID file exists', () => {
      const status = pm.getStatus('server');
      expect(status).toEqual({ running: false, pid: null });
    });
  });

  describe('kill', () => {
    it('returns false when no PID file exists', () => {
      expect(pm.kill('nonexistent')).toBe(false);
    });

    it('cleans up PID file when process does not exist', () => {
      pm.writePid('server', 999999);
      const result = pm.kill('server');
      expect(result).toBe(false);
      expect(pm.readPid('server')).toBe(null);
    });

    it('calls process.kill with correct signal and cleans PID file', () => {
      pm.writePid('daemon', 12345);
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
      const result = pm.kill('daemon', 'SIGTERM');
      expect(result).toBe(true);
      expect(killSpy).toHaveBeenCalledWith(12345, 'SIGTERM');
      expect(pm.readPid('daemon')).toBe(null);
    });
  });

  describe('writeRolePid / getRoleStatus / removeRolePid', () => {
    beforeEach(() => {
      fs.ensureDirSync(path.join(tmpDir, '.minions', 'be-engineer'));
    });

    it('writes and reads a role PID', () => {
      pm.writeRolePid('be-engineer', process.pid);
      const status = pm.getRoleStatus('be-engineer');
      expect(status).toEqual({ running: true, pid: process.pid });
    });

    it('returns running: false when no role PID file exists', () => {
      const status = pm.getRoleStatus('be-engineer');
      expect(status).toEqual({ running: false, pid: null });
    });

    it('cleans stale role PID files', () => {
      pm.writeRolePid('be-engineer', 999999);
      const status = pm.getRoleStatus('be-engineer');
      expect(status).toEqual({ running: false, pid: null });
      // File should be cleaned up
      expect(fs.existsSync(path.join(tmpDir, '.minions', 'be-engineer', '.pid'))).toBe(false);
    });

    it('removes a role PID file', () => {
      pm.writeRolePid('be-engineer', process.pid);
      pm.removeRolePid('be-engineer');
      const status = pm.getRoleStatus('be-engineer');
      expect(status).toEqual({ running: false, pid: null });
    });
  });
});
