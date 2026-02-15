// Shared constants - no dependencies

export const VALID_ROLES = ['pm', 'cao', 'fe-engineer', 'be-engineer', 'qa'] as const;

export const DEFAULT_PORT = 3000;

export const REPO_ACCESS: Record<string, string[]> = {
  'pm': [],
  'cao': ['all'],
  'fe-engineer': ['frontend'],
  'be-engineer': ['backend'],
  'qa': ['all'],
};
