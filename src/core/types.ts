// Pure TypeScript types - no dependencies

export interface Repo {
  name: string;
  url: string;
  path: string;
}

export interface RoleConfig {
  systemPrompt?: string;
  systemPromptFile?: string;
}

export interface Settings {
  mode: 'ask' | 'yolo';
  repos: Repo[];
  roles: Partial<Record<AgentRole, RoleConfig>>;
  ssh?: string;
}

export type AgentRole = 'pm' | 'cao' | 'fe-engineer' | 'be-engineer' | 'qa';

export type AgentStatus = 'online' | 'offline' | 'working';

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  connectedAt?: string;
  currentBranch?: string;
}
