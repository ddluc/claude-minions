import { z } from 'zod';

export const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  from: z.string(),
  content: z.string(),
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
  SystemMessageSchema,
  ChatControlMessageSchema,
]);

export function validateMessage(data: unknown) {
  return MessageSchema.parse(data);
}
