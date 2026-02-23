import fs from 'fs-extra';
import path from 'path';
import { SettingsSchema } from './schemas.js';
import type { Settings } from '../../core/types.js';

export function loadSettings(workspaceRoot: string): Settings {
  const settingsPath = path.join(workspaceRoot, 'minions.json');
  const raw = fs.readJSONSync(settingsPath);
  return SettingsSchema.parse(raw);
}

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
