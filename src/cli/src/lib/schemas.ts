import { z } from 'zod';
import { VALID_ROLES } from '../../../core/constants.js';

export const RepoSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  path: z.string(),
});

export const SettingsSchema = z.object({
  mode: z.enum(['ask', 'yolo']),
  repos: z.array(RepoSchema),
  roles: z.array(z.enum(VALID_ROLES)).default([...VALID_ROLES]),
});
