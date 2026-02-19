import { z } from 'zod';

export const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  from: z.string(),
  to: z.string().optional(),
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

export const TaskCreatedMessageSchema = z.object({
  type: z.literal('task_created'),
  role: z.string(),
  taskFile: z.string(),
  timestamp: z.string(),
});

export const PRCreatedMessageSchema = z.object({
  type: z.literal('pr_created'),
  role: z.string(),
  prNumber: z.number(),
  prUrl: z.string(),
  timestamp: z.string(),
});

export const SystemMessageSchema = z.object({
  type: z.literal('system'),
  content: z.string(),
  timestamp: z.string(),
});

export const DaemonControlMessageSchema = z.object({
  type: z.literal('daemon_control'),
  action: z.enum(['pause', 'unpause']),
  role: z.string(),
  timestamp: z.string(),
});

export const MessageSchema = z.discriminatedUnion('type', [
  ChatMessageSchema,
  AgentStatusMessageSchema,
  TaskCreatedMessageSchema,
  PRCreatedMessageSchema,
  SystemMessageSchema,
  DaemonControlMessageSchema,
]);

export function validateMessage(data: unknown) {
  return MessageSchema.parse(data);
}
