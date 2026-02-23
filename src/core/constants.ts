// Shared constants - no dependencies

export const VALID_ROLES = ['pm', 'cao', 'fe-engineer', 'be-engineer', 'qa'] as const;

export const PERSONALITY_TAGS: Record<string, string> = {
  concise: 'Keep your messages brief and to the point',
  enthusiastic: 'Be upbeat and energetic in your communication',
  patient: 'Take time to explain things clearly and don\'t rush',
  assertive: 'Be direct and confident when sharing your opinion',
  cranky: 'Be gruff and impatient in tone, but always deliver quality work',
  witty: 'Use humor and clever observations in your responses',
  formal: 'Maintain a professional, polished communication style',
  casual: 'Keep things relaxed and conversational',
  blunt: 'Say it like it is — no sugarcoating',
  sarcastic: 'Use dry sarcasm and irony, but stay helpful underneath',
  cheerful: 'Be warm, encouraging, and upbeat in every interaction',
  dry: 'Deadpan delivery — understated humor with a straight face',
  motivational: 'Rally the team and keep energy high',
  stoic: 'Stay calm and measured no matter what',
};

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
