import { execa } from 'execa';
import fs from 'fs-extra';
import type { AgentRole } from '../../../core/types.js';
import { ROLE_LABEL_COLORS } from '../../../core/constants.js';

/**
 * Parse a git URL (SSH or HTTPS) into owner and repo name.
 */
export function parseGitUrl(url: string): { owner: string; repo: string } {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@[^:]+:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }
  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https?:\/\/[^/]+\/([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  throw new Error(`Cannot parse git URL: ${url}`);
}

/**
 * Clone a repo into targetDir if it doesn't already exist.
 * Optionally configures an SSH key for authentication.
 */
export async function cloneRepo(url: string, targetDir: string, sshKeyPath?: string): Promise<boolean> {
  if (fs.existsSync(targetDir) && fs.existsSync(`${targetDir}/.git`)) {
    return false;
  }
  const env = sshKeyPath
    ? { ...process.env, GIT_SSH_COMMAND: `ssh -i ${sshKeyPath} -o IdentitiesOnly=yes` }
    : undefined;
  await execa('git', ['clone', url, targetDir], { stdio: 'inherit', env });
  return true;
}

/**
 * Configure SSH key and checkout a target branch for a cloned repo.
 */
export async function configureRepo(repoDir: string, sshKeyPath?: string, targetBranch = 'dev'): Promise<void> {
  // Persist SSH key config in the repo so future git operations use it
  if (sshKeyPath) {
    await execa('git', ['config', 'core.sshCommand', `ssh -i ${sshKeyPath} -o IdentitiesOnly=yes`], { cwd: repoDir });
  }

  // Checkout target branch if it exists and we're not already on it
  const { stdout: currentBranch } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
  if (currentBranch.trim() !== targetBranch) {
    const { stdout: branches } = await execa('git', ['branch', '-r'], { cwd: repoDir });
    if (branches.includes(`origin/${targetBranch}`)) {
      await execa('git', ['checkout', '-b', targetBranch, `origin/${targetBranch}`], { cwd: repoDir });
    }
  }
}

/**
 * Ensure role-based labels exist on a GitHub repo.
 * Uses `gh label create --force` which creates or updates.
 */
export async function ensureLabels(
  ownerRepo: string,
  roles: AgentRole[],
): Promise<void> {
  for (const role of roles) {
    const color = ROLE_LABEL_COLORS[role] || 'EDEDED';
    try {
      await execa('gh', [
        'label', 'create', `role:${role}`,
        '--repo', ownerRepo,
        '--color', color,
        '--description', `Tasks for ${role} agent`,
        '--force',
      ]);
    } catch {
      // Ignore errors (e.g. gh not authenticated)
    }
  }
}
