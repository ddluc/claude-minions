import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { WorkspaceService } from '../WorkspaceService.js';
import type { Settings } from '../../../core/types.js';

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    mode: 'ask',
    repos: [],
    roles: {
      'be-engineer': { model: 'sonnet' },
      'cao': { model: 'opus' },
    },
    ...overrides,
  };
}

describe('WorkspaceService', () => {
  let tmpDir: string;
  let ws: WorkspaceService;
  let settings: Settings;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-test-'));
    fs.ensureDirSync(path.join(tmpDir, '.minions'));
    settings = makeSettings();
    ws = new WorkspaceService(tmpDir, settings);
  });

  afterEach(() => {
    fs.removeSync(tmpDir);
  });

  describe('ensureRoleDir', () => {
    it('creates the role directory', () => {
      ws.ensureRoleDir('be-engineer');
      expect(fs.existsSync(path.join(tmpDir, '.minions', 'be-engineer'))).toBe(true);
    });

    it('is idempotent', () => {
      ws.ensureRoleDir('be-engineer');
      ws.ensureRoleDir('be-engineer');
      expect(fs.existsSync(path.join(tmpDir, '.minions', 'be-engineer'))).toBe(true);
    });
  });

  describe('writeClaudeMd', () => {
    it('writes CLAUDE.md for a role', () => {
      ws.ensureRoleDir('be-engineer');
      ws.writeClaudeMd('be-engineer');
      const content = fs.readFileSync(path.join(tmpDir, '.minions', 'be-engineer', 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('Backend Engineer');
    });

    it('injects concrete working directory path', () => {
      ws.ensureRoleDir('be-engineer');
      ws.writeClaudeMd('be-engineer');
      const content = fs.readFileSync(path.join(tmpDir, '.minions', 'be-engineer', 'CLAUDE.md'), 'utf-8');
      const expectedRoleDir = path.join(tmpDir, '.minions', 'be-engineer');
      expect(content).toContain(`\`${expectedRoleDir}\``);
      expect(content).toContain(`\`${tmpDir}\``);
    });

    it('does not contain vague placeholder after path injection', () => {
      ws.ensureRoleDir('be-engineer');
      ws.writeClaudeMd('be-engineer');
      const content = fs.readFileSync(path.join(tmpDir, '.minions', 'be-engineer', 'CLAUDE.md'), 'utf-8');
      expect(content).not.toContain('specific path will be set when the agent starts');
    });
  });

  describe('writeRolePermissions', () => {
    it('writes permissions file for a role', () => {
      ws.ensureRoleDir('be-engineer');
      ws.writeRolePermissions('be-engineer');
      const settingsPath = path.join(tmpDir, '.minions', 'be-engineer', '.claude', 'settings.local.json');
      expect(fs.existsSync(settingsPath)).toBe(true);
      const content = fs.readJsonSync(settingsPath);
      expect(content.permissions.allow).toContain('Read');
    });
  });

  describe('setupRole', () => {
    it('creates dir, CLAUDE.md, and permissions in one call', () => {
      ws.setupRole('be-engineer');
      const roleDir = path.join(tmpDir, '.minions', 'be-engineer');
      expect(fs.existsSync(roleDir)).toBe(true);
      expect(fs.existsSync(path.join(roleDir, 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(roleDir, '.claude', 'settings.local.json'))).toBe(true);
    });
  });

  describe('setupAllRoles', () => {
    it('sets up all enabled roles', () => {
      ws.setupAllRoles();
      expect(fs.existsSync(path.join(tmpDir, '.minions', 'be-engineer', 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.minions', 'cao', 'CLAUDE.md'))).toBe(true);
    });
  });

  describe('copySshKey', () => {
    it('returns undefined when no SSH key configured', () => {
      expect(ws.copySshKey('be-engineer')).toBeUndefined();
    });

    it('copies SSH key into role directory', () => {
      const sshKeyPath = path.join(tmpDir, 'my_ssh_key');
      fs.writeFileSync(sshKeyPath, 'fake-key-content');
      const sshSettings = makeSettings({ ssh: sshKeyPath });
      const sshWs = new WorkspaceService(tmpDir, sshSettings);
      sshWs.ensureRoleDir('be-engineer');
      const localPath = sshWs.copySshKey('be-engineer');
      expect(localPath).toBe(path.join(tmpDir, '.minions', 'be-engineer', 'ssh_key'));
      expect(fs.readFileSync(localPath!, 'utf-8')).toBe('fake-key-content');
    });
  });

  describe('loadEnvVars', () => {
    it('returns empty object when no .env exists', () => {
      expect(ws.loadEnvVars()).toEqual({});
    });

    it('parses .env file', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'KEY=value\nOTHER=test\n');
      expect(ws.loadEnvVars()).toEqual({ KEY: 'value', OTHER: 'test' });
    });
  });

  describe('ensureEnvTemplate', () => {
    it('creates .env template when missing', () => {
      expect(ws.ensureEnvTemplate()).toBe(true);
      expect(fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8')).toContain('GITHUB_TOKEN=');
    });

    it('does not overwrite existing .env', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'MY_KEY=value');
      expect(ws.ensureEnvTemplate()).toBe(false);
      expect(fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8')).toBe('MY_KEY=value');
    });
  });

  describe('ensureGitignore', () => {
    it('creates .gitignore when missing', () => {
      expect(ws.ensureGitignore()).toBe(true);
      const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(content).toContain('.minions/');
      expect(content).toContain('.env');
      expect(content).toContain('*.log');
    });

    it('appends missing entries to existing .gitignore', () => {
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n');
      expect(ws.ensureGitignore()).toBe(true);
      const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.minions/');
    });

    it('returns false when all entries already present', () => {
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.minions/\n.env\n*.log\n');
      expect(ws.ensureGitignore()).toBe(false);
    });
  });

  describe('readSessionId / writeSessionId', () => {
    beforeEach(() => {
      ws.ensureRoleDir('be-engineer');
    });

    it('returns null when no session exists', () => {
      expect(ws.readSessionId('be-engineer')).toBeNull();
    });

    it('writes and reads session ID', () => {
      ws.writeSessionId('be-engineer', 'abc-123');
      expect(ws.readSessionId('be-engineer')).toBe('abc-123');
    });

    it('trims whitespace from session ID', () => {
      const sessionFile = path.join(tmpDir, '.minions', 'be-engineer', '.session-id');
      fs.writeFileSync(sessionFile, '  abc-123  \n');
      expect(ws.readSessionId('be-engineer')).toBe('abc-123');
    });

    it('returns null for empty session file', () => {
      const sessionFile = path.join(tmpDir, '.minions', 'be-engineer', '.session-id');
      fs.writeFileSync(sessionFile, '   \n');
      expect(ws.readSessionId('be-engineer')).toBeNull();
    });
  });

  describe('getRoleDir', () => {
    it('returns the correct path', () => {
      expect(ws.getRoleDir('be-engineer')).toBe(path.join(tmpDir, '.minions', 'be-engineer'));
    });
  });
});
