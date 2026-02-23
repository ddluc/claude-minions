import chalk from 'chalk';

const ROLE_MENTION_REGEX = /@(pm|cao|fe-engineer|be-engineer|qa|all|status)\b/g;

export const ROLE_COLORS: Record<string, (text: string) => string> = {
  'cao': chalk.cyan,
  'pm': chalk.magenta,
  'fe-engineer': chalk.yellow,
  'be-engineer': chalk.green,
  'qa': chalk.blue,
};

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

export function colorRole(role: string): string {
  const colorFn = ROLE_COLORS[role] || chalk.white;
  return colorFn(role);
}

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
