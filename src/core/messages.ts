// Pure TypeScript message types
import type { AgentStatus } from './types.js';

export interface ChatMessage {
  type: 'chat';
  from: string;
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

export interface SystemMessage {
  type: 'system';
  content: string;
  timestamp: string;
}

export interface ChatControlMessage {
  type: 'chat_control';
  action: 'pause' | 'resume';
  role: string;
  timestamp: string;
}

export type Message =
  | ChatMessage
  | AgentStatusMessage
  | SystemMessage
  | ChatControlMessage;
