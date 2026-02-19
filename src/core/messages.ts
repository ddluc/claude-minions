// Pure TypeScript message types

export interface ChatMessage {
  type: 'chat';
  from: string;
  content: string;
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
  | SystemMessage
  | ChatControlMessage;
