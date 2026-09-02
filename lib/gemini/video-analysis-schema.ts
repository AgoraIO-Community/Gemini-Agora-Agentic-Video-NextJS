import { z } from 'zod';

export const videoMomentSchema = z.object({
  timestampSeconds: z.coerce.number().min(0).finite(),
  timestampLabel: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(800),
});

export const videoAnalysisSchema = z.object({
  summary: z.string().min(1).max(2000),
  moments: z.array(videoMomentSchema).min(1).max(12),
  context: z.string().min(1).max(8000),
});

export type VideoAnalysisSchema = z.infer<typeof videoAnalysisSchema>;
