import { z } from 'zod';

export const RepoSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  path: z.string(),
});

export const SettingsSchema = z.object({
  mode: z.enum(['ask', 'yolo']),
  repos: z.array(RepoSchema),
});
