// Core types for Claude Minions WebSocket chat

// --- Message Types ---

export interface ChatMessage {
  type: 'chat';
  from: string;
  to?: string;
  content: string;
  timestamp: string;
}

export interface AgentStatusMessage {
  type: 'agent_status';
  role: string;
  status: 'online' | 'offline' | 'working';
  currentBranch?: string;
  timestamp: string;
}

export interface TaskCreatedMessage {
  type: 'task_created';
  role: string;
  taskFile: string;
  timestamp: string;
}

export interface PRCreatedMessage {
  type: 'pr_created';
  role: string;
  prNumber: number;
  prUrl: string;
  timestamp: string;
}

export interface SystemMessage {
  type: 'system';
  content: string;
  timestamp: string;
}

export type Message =
  | ChatMessage
  | AgentStatusMessage
  | TaskCreatedMessage
  | PRCreatedMessage
  | SystemMessage;

// --- Role & Config Types ---

export type AgentRole = 'pm' | 'executor' | 'fe-engineer' | 'be-engineer' | 'qa';

export type AgentStatus = 'online' | 'offline' | 'working';

export interface Repo {
  name: string;
  url: string;
  path: string;
}

export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

export interface Permissions {
  allowBash: boolean;
  allowGit: boolean;
}

export interface RoleConfig {
  systemPrompt?: string;
  systemPromptFile?: string;
  model?: ClaudeModel;
  permissions?: Permissions;
}

export interface Settings {
  mode: 'dark' | 'light';
  repos: Repo[];
  roles: Partial<Record<AgentRole, RoleConfig>>;
  ssh?: string;
  permissions?: Permissions;
}

// --- Agent State ---

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  connectedAt?: string;
  currentBranch?: string;
}
