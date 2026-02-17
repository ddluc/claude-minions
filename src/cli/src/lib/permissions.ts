import fs from 'fs-extra';
import path from 'path';
import type { Permissions } from '../../../core/types.js';

/**
 * Merge global and role-level permissions.
 * Role permissions are additive — they extend the global lists.
 */
export function resolvePermissions(
  global?: Permissions,
  role?: Permissions
): Permissions {
  const allow = [
    ...(global?.allow ?? []),
    ...(role?.allow ?? []),
  ];
  const deny = [
    ...(global?.deny ?? []),
    ...(role?.deny ?? []),
  ];

  const result: Permissions = {};
  if (allow.length > 0) result.allow = [...new Set(allow)];
  if (deny.length > 0) result.deny = [...new Set(deny)];
  return result;
}

/**
 * Write resolved permissions to .claude/settings.local.json
 * in the agent's working directory.
 */
export function writePermissionsFile(
  roleDir: string,
  permissions: Permissions
): void {
  const claudeDir = path.join(roleDir, '.claude');
  fs.ensureDirSync(claudeDir);

  const settingsPath = path.join(claudeDir, 'settings.local.json');

  // Read existing settings to preserve any manual config
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    existing = fs.readJSONSync(settingsPath);
  }

  // Merge permissions into existing settings
  existing.permissions = permissions;
  fs.writeJSONSync(settingsPath, existing, { spaces: 2 });
}
