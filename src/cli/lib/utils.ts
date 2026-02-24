import chalk from 'chalk';
import { spawnSync } from 'child_process';
import { CLAUDE_CODE_VERSION } from '../../core/constants.js';
import { log } from './logger.js';

const ROLE_MENTION_REGEX = /@(pm|cao|fe-engineer|be-engineer|qa|all|status)\b/g;

export const ROLE_COLORS: Record<string, (text: string) => string> = {
  'cao': chalk.cyan,
  'pm': chalk.magenta,
  'fe-engineer': chalk.yellow,
  'be-engineer': chalk.green,
  'qa': chalk.blue,
  'system': chalk.dim,
};

/**
 * Extract @mentions from a message string, returning the set of mentioned role names.
 */
export function parseMentions(content: string): Set<string> {
  const mentions = new Set<string>();
  let match;
  while ((match = ROLE_MENTION_REGEX.exec(content)) !== null) {
    mentions.add(match[1]);
  }
  // Reset regex lastIndex for next call
  ROLE_MENTION_REGEX.lastIndex = 0;
  return mentions;
}

/**
 * Apply the role's assigned chalk color to its name for terminal display.
 */
export function colorRole(role: string): string {
  const colorFn = ROLE_COLORS[role] || chalk.white;
  return colorFn(role);
}

export interface VersionCheckResult {
  level: 'error' | 'warn';
  message: string;
}

/**
 * Check the installed Claude Code CLI version against the known-compatible version. Returns an error for major mismatch, a warning for minor mismatch, or null if OK.
 */
export function checkClaudeVersion(): VersionCheckResult | null {
  try {
    const result = spawnSync('claude', ['--version'], { encoding: 'utf-8', timeout: 5000 });
    if (result.error || result.status !== 0) {
      return { level: 'error', message: 'Could not determine Claude Code CLI version. Is it installed?' };
    }
    const output = result.stdout.trim();
    const match = output.match(/(\d+)\.(\d+)\.\d+/);
    if (!match) {
      return { level: 'warn', message: `Unexpected Claude Code version format: ${output}` };
    }
    const expectedMatch = CLAUDE_CODE_VERSION.match(/(\d+)\.(\d+)\.\d+/);
    if (!expectedMatch) {
      return null;
    }
    const [installedMajor, installedMinor] = [match[1], match[2]];
    const [expectedMajor, expectedMinor] = [expectedMatch[1], expectedMatch[2]];
    if (installedMajor !== expectedMajor) {
      return { level: 'error', message: `Claude Code major version mismatch: installed ${match[0]}, tested with ${CLAUDE_CODE_VERSION}. This may cause breaking changes.` };
    }
    if (installedMinor !== expectedMinor) {
      return { level: 'warn', message: `Claude Code minor version mismatch: installed ${match[0]}, tested with ${CLAUDE_CODE_VERSION}` };
    }
    return null;
  } catch {
    return { level: 'warn', message: 'Could not check Claude Code CLI version.' };
  }
}

/**
 * Parse a .env file into key-value pairs, stripping comments and surrounding quotes.
 */
export function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}
