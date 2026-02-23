import { z } from 'zod';
import { VALID_ROLES } from '../../core/constants.js';

export const RepoSchema = z.object({
  name: z.string(),
  url: z.string(),
  path: z.string(),
});

export const ClaudeModelSchema = z.enum(['opus', 'sonnet', 'haiku']);

export const PermissionConfigSchema = z.object({
  allow: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
});

export const RoleConfigSchema = z.object({
  systemPrompt: z.string().optional(),
  systemPromptFile: z.string().optional(),
  model: ClaudeModelSchema.optional(),
  permissions: PermissionConfigSchema.optional(),
  personality: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
}).refine(
  data => !(data.systemPrompt && data.systemPromptFile),
  { message: 'Cannot specify both systemPrompt and systemPromptFile' }
);

export const SettingsSchema = z.object({
  mode: z.enum(['ask', 'yolo']),
  repos: z.array(RepoSchema),
  roles: z.record(z.enum(VALID_ROLES), RoleConfigSchema).default({}),
  permissions: PermissionConfigSchema.optional(),
  ssh: z.string().optional(),
  serverPort: z.number().optional(),
});
