import { describe, it, expect } from 'vitest';
import { getEnabledRoles } from '../settings.js';
import type { Settings } from '../types.js';

function makeSettings(roles: Settings['roles']): Settings {
  return { mode: 'ask', repos: [], roles };
}

describe('getEnabledRoles', () => {
  it('returns all roles when none have enabled set', () => {
    const settings = makeSettings({
      'cao': { model: 'opus' },
      'be-engineer': { model: 'sonnet' },
    });
    expect(getEnabledRoles(settings)).toEqual(['cao', 'be-engineer']);
  });

  it('returns all roles when enabled is explicitly true', () => {
    const settings = makeSettings({
      'cao': { model: 'opus', enabled: true },
      'pm': { model: 'sonnet', enabled: true },
    });
    expect(getEnabledRoles(settings)).toEqual(['cao', 'pm']);
  });

  it('excludes roles with enabled: false', () => {
    const settings = makeSettings({
      'cao': { model: 'opus' },
      'be-engineer': { model: 'sonnet', enabled: false },
      'pm': { model: 'sonnet' },
    });
    const roles = getEnabledRoles(settings);
    expect(roles).toContain('cao');
    expect(roles).toContain('pm');
    expect(roles).not.toContain('be-engineer');
  });

  it('returns empty array when all roles are disabled', () => {
    const settings = makeSettings({
      'cao': { enabled: false },
      'be-engineer': { enabled: false },
    });
    expect(getEnabledRoles(settings)).toEqual([]);
  });

  it('returns empty array when roles is empty', () => {
    const settings = makeSettings({});
    expect(getEnabledRoles(settings)).toEqual([]);
  });
});
