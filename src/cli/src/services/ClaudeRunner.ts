import { spawnSync } from 'child_process';

export interface ClaudeRunOptions {
  sessionId?: string | null;
  model?: string;
  yolo?: boolean;
  outputFormat?: 'json';
  prompt?: string;
}

export interface InteractiveOptions {
  roleDir: string;
  sessionId?: string | null;
  model?: string;
  yolo?: boolean;
  envVars?: Record<string, string>;
}

export interface HeadlessOptions {
  roleDir: string;
  prompt: string;
  sessionId?: string | null;
  model?: string;
  yolo?: boolean;
}

export interface HeadlessResult {
  response: string;
  sessionId: string | null;
  error: string | null;
}

export class ClaudeRunner {
  /**
   * Build Claude CLI arguments from options. Pure function.
   */
  buildArgs(options: ClaudeRunOptions): string[] {
    const args: string[] = [];

    // Headless mode flags
    if (options.outputFormat) {
      args.push('-p', '--output-format', options.outputFormat);
    }

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.yolo) {
      args.push('--dangerously-skip-permissions');
    }

    if (options.sessionId) {
      args.push('--resume', options.sessionId);
    }

    if (options.prompt) {
      args.push(options.prompt);
    }

    return args;
  }

  /**
   * Spawn Claude interactively (for tap command). Returns exit code.
   */
  spawnInteractive(options: InteractiveOptions): number {
    const args = this.buildArgs({
      sessionId: options.sessionId,
      model: options.model,
      yolo: options.yolo,
    });

    const result = spawnSync('claude', args, {
      cwd: options.roleDir,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...options.envVars },
    });

    if (result.error) {
      throw result.error;
    }

    return result.status ?? 0;
  }

  /**
   * Spawn Claude in headless mode (for daemon). Returns response and session ID.
   */
  spawnHeadless(options: HeadlessOptions): HeadlessResult {
    const args = this.buildArgs({
      sessionId: options.sessionId,
      model: options.model || 'sonnet',
      yolo: options.yolo,
      outputFormat: 'json',
      prompt: options.prompt,
    });

    const result = spawnSync('claude', args, {
      cwd: options.roleDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env },
    });

    if (result.error) {
      return {
        response: '',
        sessionId: null,
        error: `Error spawning Claude: ${result.error.message}`,
      };
    }

    if (result.status !== 0) {
      return {
        response: '',
        sessionId: null,
        error: `Claude exited with code ${result.status}\nStderr: ${result.stderr}\nStdout: ${result.stdout}`,
      };
    }

    return this.parseHeadlessOutput(result.stdout);
  }

  /**
   * Parse JSON output from headless Claude. Extracts response text and session ID.
   */
  parseHeadlessOutput(stdout: string): HeadlessResult {
    try {
      const parsed = JSON.parse(stdout);
      return {
        response: parsed.result || '',
        sessionId: parsed.session_id || null,
        error: null,
      };
    } catch {
      return {
        response: stdout.trim(),
        sessionId: null,
        error: null,
      };
    }
  }
}
