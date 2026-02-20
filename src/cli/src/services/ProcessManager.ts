import fs from 'fs-extra';
import path from 'path';

export class ProcessManager {
  private minionsDir: string;

  constructor(workspaceRoot: string) {
    this.minionsDir = path.join(workspaceRoot, '.minions');
  }

  /**
   * Check if a process is alive using signal 0.
   */
  isRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read a PID from `.minions/<name>.pid`.
   */
  readPid(name: string): number | null {
    const pidFile = this.pidPath(name);
    if (!fs.existsSync(pidFile)) return null;
    const raw = fs.readFileSync(pidFile, 'utf-8').trim();
    const pid = parseInt(raw, 10);
    return isNaN(pid) ? null : pid;
  }

  /**
   * Write a PID to `.minions/<name>.pid`.
   */
  writePid(name: string, pid: number): void {
    fs.writeFileSync(this.pidPath(name), String(pid));
  }

  /**
   * Remove the PID file for a given name.
   */
  removePid(name: string): void {
    fs.removeSync(this.pidPath(name));
  }

  /**
   * Get status for a named process. Cleans up stale PID files.
   */
  getStatus(name: string): { running: boolean; pid: number | null } {
    const pid = this.readPid(name);
    if (pid === null) return { running: false, pid: null };

    if (this.isRunning(pid)) {
      return { running: true, pid };
    }

    // Stale PID file — clean up
    this.removePid(name);
    return { running: false, pid: null };
  }

  /**
   * Kill a process by name. Returns true if the process was killed.
   */
  kill(name: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const pid = this.readPid(name);
    if (pid === null) return false;

    try {
      process.kill(pid, signal);
      this.removePid(name);
      return true;
    } catch {
      // Process doesn't exist — clean up stale PID file
      this.removePid(name);
      return false;
    }
  }

  /**
   * Write a role-specific PID at `.minions/<role>/.pid`.
   */
  writeRolePid(role: string, pid: number): void {
    const pidFile = this.rolePidPath(role);
    fs.writeFileSync(pidFile, String(pid));
  }

  /**
   * Remove a role-specific PID file.
   */
  removeRolePid(role: string): void {
    fs.removeSync(this.rolePidPath(role));
  }

  /**
   * Get status for a role-specific process. Cleans up stale PID files.
   */
  getRoleStatus(role: string): { running: boolean; pid: number | null } {
    const pidFile = this.rolePidPath(role);
    if (!fs.existsSync(pidFile)) return { running: false, pid: null };

    const raw = fs.readFileSync(pidFile, 'utf-8').trim();
    const pid = parseInt(raw, 10);
    if (isNaN(pid)) return { running: false, pid: null };

    if (this.isRunning(pid)) {
      return { running: true, pid };
    }

    // Stale PID file — clean up
    fs.removeSync(pidFile);
    return { running: false, pid: null };
  }

  private pidPath(name: string): string {
    return path.join(this.minionsDir, `${name}.pid`);
  }

  private rolePidPath(role: string): string {
    return path.join(this.minionsDir, role, '.pid');
  }
}
