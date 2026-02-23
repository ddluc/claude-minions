import path from 'path';
import fs from 'fs-extra';
import { DEFAULT_PERMISSIONS } from '../../core/constants.js';
import type { PermissionConfig } from '../../core/types.js';

export interface ResolvedPermissions {
  allow: string[];
  deny: string[];
}

/**
 * Merges DEFAULT_PERMISSIONS + global overrides + role-specific overrides.
 * Global deny always wins — cannot be overridden by role allow.
 * Deduplicates entries.
 */
export function resolvePermissions(
  globalPermissions?: PermissionConfig,
  rolePermissions?: PermissionConfig,
): ResolvedPermissions {
  // Start with defaults
  const allow = new Set<string>(DEFAULT_PERMISSIONS.allow);
  const deny = new Set<string>(DEFAULT_PERMISSIONS.deny);

  // Apply global overrides
  if (globalPermissions?.allow) {
    for (const entry of globalPermissions.allow) {
      allow.add(entry);
    }
  }
  if (globalPermissions?.deny) {
    for (const entry of globalPermissions.deny) {
      deny.add(entry);
    }
  }

  // Apply role-specific overrides
  if (rolePermissions?.allow) {
    for (const entry of rolePermissions.allow) {
      allow.add(entry);
    }
  }
  if (rolePermissions?.deny) {
    for (const entry of rolePermissions.deny) {
      deny.add(entry);
    }
  }

  // Global deny always wins — remove from allow if in deny
  for (const entry of deny) {
    allow.delete(entry);
  }

  return {
    allow: [...allow],
    deny: [...deny],
  };
}

/**
 * Writes permissions to <roleDir>/.claude/settings.local.json.
 * Always overwrites the file.
 */
export function writePermissionsFile(roleDir: string, permissions: ResolvedPermissions): void {
  const claudeDir = path.join(roleDir, '.claude');
  fs.ensureDirSync(claudeDir);

  const settingsPath = path.join(claudeDir, 'settings.local.json');
  const content = {
    permissions: {
      allow: permissions.allow,
      deny: permissions.deny,
    },
  };

  fs.writeJsonSync(settingsPath, content, { spaces: 2 });
}
