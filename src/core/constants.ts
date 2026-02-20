// Shared constants - no dependencies

export const VALID_ROLES = ['pm', 'cao', 'fe-engineer', 'be-engineer', 'qa'] as const;

export const DEFAULT_PORT = 3000;


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
    "Bash(pwd)",
    "Bash(curl *)"
  ],
  deny: [] as string[],
};
