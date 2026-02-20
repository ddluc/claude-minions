import { execFileSync } from 'child_process';
import fs from 'fs-extra';

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
export function cloneRepo(url: string, targetDir: string, sshKeyPath?: string): boolean {
  if (fs.existsSync(targetDir) && fs.existsSync(`${targetDir}/.git`)) {
    return false;
  }
  const env = sshKeyPath
    ? { ...process.env, GIT_SSH_COMMAND: `ssh -i ${sshKeyPath} -o IdentitiesOnly=yes` }
    : undefined;
  execFileSync('git', ['clone', url, targetDir], { stdio: 'pipe', env });
  return true;
}

/**
 * Configure SSH key and checkout a target branch for a cloned repo.
 */
export function configureRepo(repoDir: string, sshKeyPath?: string, targetBranch = 'dev'): void {
  if (sshKeyPath) {
    execFileSync('git', ['config', 'core.sshCommand', `ssh -i ${sshKeyPath} -o IdentitiesOnly=yes`], { cwd: repoDir, stdio: 'pipe' });
  }

  const currentBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir, stdio: 'pipe' }).toString().trim();
  if (currentBranch !== targetBranch) {
    const branches = execFileSync('git', ['branch', '-r'], { cwd: repoDir, stdio: 'pipe' }).toString();
    if (branches.includes(`origin/${targetBranch}`)) {
      execFileSync('git', ['checkout', '-b', targetBranch, `origin/${targetBranch}`], { cwd: repoDir, stdio: 'pipe' });
    }
  }
}
