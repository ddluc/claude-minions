import type { AgentRole, Settings } from './types.js';

export function getEnabledRoles(settings: Settings): AgentRole[] {
  return (Object.entries(settings.roles) as [AgentRole, { enabled?: boolean }][])
    .filter(([, config]) => config.enabled !== false)
    .map(([role]) => role);
}
