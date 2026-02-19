// Pure TypeScript types - no dependencies

export interface Repo {
  name: string;
  url: string;
  path: string;
}

export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

export interface PermissionConfig {
  allow?: string[];
  deny?: string[];
}

export interface RoleConfig {
  systemPrompt?: string;
  systemPromptFile?: string;
  model?: ClaudeModel;
  permissions?: PermissionConfig;
}

export interface Settings {
  mode: 'ask' | 'yolo';
  repos: Repo[];
  roles: Partial<Record<AgentRole, RoleConfig>>;
  permissions?: PermissionConfig;
  ssh?: string;
  serverPort?: number;
}

export type AgentRole = 'pm' | 'cao' | 'fe-engineer' | 'be-engineer' | 'qa';

export type AgentStatus = 'online' | 'offline' | 'working' | 'paused';

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  connectedAt?: string;
  currentBranch?: string;
}
