// Pure TypeScript types - no dependencies

export interface Repo {
  name: string;
  url: string;
  path: string;
}

export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

export interface Permissions {
  allow?: string[];
  deny?: string[];
}

export interface RoleConfig {
  systemPrompt?: string;
  systemPromptFile?: string;
  model?: ClaudeModel;
  permissions?: Permissions;
}

export interface Settings {
  mode: 'ask' | 'yolo';
  repos: Repo[];
  roles: Partial<Record<AgentRole, RoleConfig>>;
  ssh?: string;
  permissions?: Permissions;
}

export type AgentRole = 'pm' | 'cao' | 'fe-engineer' | 'be-engineer' | 'qa';

export type AgentStatus = 'online' | 'offline' | 'working';

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  connectedAt?: string;
  currentBranch?: string;
}
