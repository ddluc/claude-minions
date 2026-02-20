import fs from 'fs-extra';
import path from 'path';
import type { AgentRole, Settings } from '../../../core/types.js';
import { buildAgentPrompt } from '../lib/prompts.js';
import { resolvePermissions, writePermissionsFile } from '../lib/permissions.js';
import { parseEnvFile } from '../lib/utils.js';
import { cloneRepo, configureRepo, ensureLabels, parseGitUrl } from '../lib/git.js';

export class WorkspaceService {
  private minionsDir: string;

  constructor(
    private workspaceRoot: string,
    private settings: Settings,
  ) {
    this.minionsDir = path.join(workspaceRoot, '.minions');
  }

  /**
   * Ensure the .minions/<role>/ directory exists.
   */
  ensureRoleDir(role: AgentRole): void {
    fs.ensureDirSync(path.join(this.minionsDir, role));
  }

  /**
   * Generate and write CLAUDE.md for a role.
   */
  writeClaudeMd(role: AgentRole, hasSshKey = false): void {
    const roleConfig = this.settings.roles[role] || {};
    const roleDir = path.join(this.minionsDir, role);
    const content = buildAgentPrompt(role, roleConfig, this.workspaceRoot, this.settings.repos, hasSshKey, roleDir);
    fs.writeFileSync(path.join(roleDir, 'CLAUDE.md'), content);
  }

  /**
   * Resolve and write permissions for a role.
   */
  writeRolePermissions(role: AgentRole): void {
    const resolved = resolvePermissions(this.settings.permissions, this.settings.roles[role]?.permissions);
    const roleDir = path.join(this.minionsDir, role);
    writePermissionsFile(roleDir, resolved);
  }

  /**
   * Idempotent role setup: ensure dir, write CLAUDE.md, write permissions.
   */
  setupRole(role: AgentRole, hasSshKey = false): void {
    this.ensureRoleDir(role);
    this.writeClaudeMd(role, hasSshKey);
    this.writeRolePermissions(role);
  }

  /**
   * Setup all enabled roles. If hasSshKey, also copies the SSH key into each role directory.
   */
  setupAllRoles(hasSshKey = false): void {
    const roles = Object.keys(this.settings.roles) as AgentRole[];
    for (const role of roles) {
      this.setupRole(role, hasSshKey);
      if (hasSshKey) {
        this.copySshKey(role);
      }
    }
  }

  /**
   * Clone and configure repos for all roles. Returns a result per role/repo pair.
   */
  async cloneAllRepos(): Promise<{ role: AgentRole; repoName: string; cloned: boolean }[]> {
    const roles = Object.keys(this.settings.roles) as AgentRole[];
    const results: { role: AgentRole; repoName: string; cloned: boolean }[] = [];

    for (const role of roles) {
      const roleDir = this.getRoleDir(role);
      const sshKeyPath = this.settings.ssh ? path.join(roleDir, 'ssh_key') : undefined;

      for (const repo of this.settings.repos) {
        const targetDir = path.join(roleDir, repo.path);
        const cloned = await cloneRepo(repo.url, targetDir, sshKeyPath);
        try { await configureRepo(targetDir, sshKeyPath); } catch {}
        results.push({ role, repoName: repo.name, cloned });
      }
    }

    return results;
  }

  /**
   * Ensure GitHub labels exist for all configured repos. Returns the repo paths that succeeded.
   */
  async ensureGitHubLabels(): Promise<string[]> {
    const roles = Object.keys(this.settings.roles) as AgentRole[];
    const verified: string[] = [];

    for (const repo of this.settings.repos) {
      try {
        const { owner, repo: repoName } = parseGitUrl(repo.url);
        await ensureLabels(`${owner}/${repoName}`, roles);
        verified.push(`${owner}/${repoName}`);
      } catch {}
    }

    return verified;
  }

  /**
   * Copy SSH key into the role directory. Returns the local path, or undefined if no SSH key configured.
   */
  copySshKey(role: AgentRole): string | undefined {
    if (!this.settings.ssh) return undefined;
    const sourceSshKey = path.resolve(this.workspaceRoot, this.settings.ssh);
    const roleDir = path.join(this.minionsDir, role);
    const localSshKey = path.join(roleDir, 'ssh_key');
    fs.copyFileSync(sourceSshKey, localSshKey);
    fs.chmodSync(localSshKey, 0o600);
    return localSshKey;
  }

  /**
   * Load .env file from workspace root. Returns empty object if no .env exists.
   */
  loadEnvVars(): Record<string, string> {
    const envPath = path.join(this.workspaceRoot, '.env');
    if (!fs.existsSync(envPath)) return {};
    return parseEnvFile(fs.readFileSync(envPath, 'utf-8'));
  }

  /**
   * Create a .env template if one doesn't exist.
   */
  ensureEnvTemplate(): boolean {
    const envPath = path.join(this.workspaceRoot, '.env');
    if (fs.existsSync(envPath)) return false;
    fs.writeFileSync(envPath, 'GITHUB_TOKEN=\n');
    return true;
  }

  /**
   * Add standard entries to .gitignore. Returns true if changes were made.
   */
  ensureGitignore(): boolean {
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    const entries = ['.minions/', '.env', '*.log'];

    if (fs.existsSync(gitignorePath)) {
      const existing = fs.readFileSync(gitignorePath, 'utf-8');
      const toAdd = entries.filter(e => !existing.includes(e));
      if (toAdd.length === 0) return false;
      fs.appendFileSync(gitignorePath, '\n# Minions\n' + toAdd.join('\n') + '\n');
      return true;
    }

    fs.writeFileSync(gitignorePath, '# Minions\n' + entries.join('\n') + '\n');
    return true;
  }

  /**
   * Read session ID for a role. Returns null if no session exists.
   */
  readSessionId(role: AgentRole): string | null {
    const sessionFile = path.join(this.minionsDir, role, '.session-id');
    if (!fs.existsSync(sessionFile)) return null;
    return fs.readFileSync(sessionFile, 'utf-8').trim() || null;
  }

  /**
   * Write session ID for a role.
   */
  writeSessionId(role: AgentRole, id: string): void {
    const sessionFile = path.join(this.minionsDir, role, '.session-id');
    fs.writeFileSync(sessionFile, id);
  }

  /**
   * Get the role directory path.
   */
  getRoleDir(role: AgentRole): string {
    return path.join(this.minionsDir, role);
  }
}
