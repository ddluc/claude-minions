import { z } from 'zod';

export const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  from: z.string(),
  content: z.string(),
  timestamp: z.string(),
});

// Must stay in sync with AgentStatus in core/types.ts
const AgentStatusValues = ['online', 'offline', 'working', 'paused'] as const;

export const AgentStatusMessageSchema = z.object({
  type: z.literal('agent_status'),
  role: z.string(),
  status: z.enum(AgentStatusValues),
  currentBranch: z.string().optional(),
  timestamp: z.string(),
});

export const SystemMessageSchema = z.object({
  type: z.literal('system'),
  content: z.string(),
  timestamp: z.string(),
});

export const ChatControlMessageSchema = z.object({
  type: z.literal('chat_control'),
  action: z.enum(['pause', 'resume']),
  role: z.string(),
  timestamp: z.string(),
});

export const MessageSchema = z.discriminatedUnion('type', [
  ChatMessageSchema,
  AgentStatusMessageSchema,
  SystemMessageSchema,
  ChatControlMessageSchema,
]);

export function validateMessage(data: unknown) {
  return MessageSchema.parse(data);
}
