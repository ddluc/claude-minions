import { z } from 'zod';
import { VALID_ROLES } from '../../../core/constants.js';

export const RepoSchema = z.object({
  name: z.string(),
  url: z.string(),
  path: z.string(),
});

export const RoleConfigSchema = z.object({
  systemPrompt: z.string().optional(),
  systemPromptFile: z.string().optional(),
}).refine(
  data => !(data.systemPrompt && data.systemPromptFile),
  { message: 'Cannot specify both systemPrompt and systemPromptFile' }
);

export const SettingsSchema = z.object({
  mode: z.enum(['ask', 'yolo']),
  repos: z.array(RepoSchema),
  roles: z.record(z.enum(VALID_ROLES), RoleConfigSchema).default({}),
  ssh: z.string().optional(),
});
