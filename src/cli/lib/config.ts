import fs from 'fs-extra';
import path from 'path';
import { SettingsSchema } from './schemas.js';
import type { Settings } from '../../core/types.js';

/**
 * Load and validate minions.json from the given workspace root.
 */
export function loadSettings(workspaceRoot: string): Settings {
  const settingsPath = path.join(workspaceRoot, 'minions.json');
  const raw = fs.readJSONSync(settingsPath);
  return SettingsSchema.parse(raw);
}

/**
 * Walk up the directory tree to find the nearest minions.json.
 */
export function getWorkspaceRoot(): string {
  let current = process.cwd();
  while (current !== '/') {
    if (fs.existsSync(path.join(current, 'minions.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error('Not in a minions workspace. Run `minions init` first.');
}
