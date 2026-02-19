// Pure TypeScript message types
import type { AgentStatus } from './types.js';

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
  status: AgentStatus;
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

export interface DaemonControlMessage {
  type: 'daemon_control';
  action: 'pause' | 'unpause';
  role: string;
  timestamp: string;
}

export type Message =
  | ChatMessage
  | AgentStatusMessage
  | TaskCreatedMessage
  | PRCreatedMessage
  | SystemMessage
  | DaemonControlMessage;
