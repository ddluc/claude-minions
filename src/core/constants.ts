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

export const DEFAULT_PERMISSIONS = {
  allow: [
    "Read",
    "Glob", 
    "Grep",
    "Write",
    "Edit",
    "Bash(git *)",
    "Bash(gh *)",
    "Bash(npm *)",       
    "Bash(npx *)",       
    "Bash(ls *)",        
    "Bash(mkdir *)",     
    "Bash(rm *)",        
    "Bash(touch *)",     
    "Bash(cat *)",
    "Bash(cp *)",
    "Bash(mv *)",
    "Bash(echo *)",
    "Bash(chmod *)",
    "Bash(pwd)"   
  ],
  deny: [] as string[],
};

export const ROLE_LABEL_COLORS: Record<string, string> = {
  'pm': 'D4C5F9',
  'cao': 'F9D0C4',
  'fe-engineer': 'BFD4F2',
  'be-engineer': 'B4E197',
  'qa': 'FEF2C0',
};
