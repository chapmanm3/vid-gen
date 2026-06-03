import { z } from 'zod';

export const segmentTypeSchema = z.enum(['hook', 'intro', 'body', 'transition', 'conclusion', 'cta']);
export type SegmentType = z.infer<typeof segmentTypeSchema>;

export const scriptSegmentSchema = z.object({
  type: segmentTypeSchema,
  text: z.string().min(1),
  estimatedDuration: z.number().positive().optional(),
  visualCue: z.string().optional(),
  keywords: z.array(z.string()).default([]),
}).transform((seg) => {
  const cleanedText = seg.text.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
  return {
    ...seg,
    text: cleanedText,
    estimatedDuration: seg.estimatedDuration ?? estimateDuration(cleanedText.split(/\s+/).length),
  };
});
export type ScriptSegment = z.infer<typeof scriptSegmentSchema>;

export const scriptSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  segments: z.array(scriptSegmentSchema).min(1),
  estimatedTotalDuration: z.number().positive().optional(),
  targetWordCount: z.number().positive().optional(),
}).transform((data) => ({
  ...data,
  estimatedTotalDuration: data.estimatedTotalDuration ?? data.segments.reduce((sum, s) => sum + s.estimatedDuration, 0),
  targetWordCount: data.targetWordCount ?? data.segments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0),
}));
export type Script = z.infer<typeof scriptSchema>;

export function validateScript(data: unknown): Script {
  return scriptSchema.parse(data);
}

export function validateSegment(data: unknown): ScriptSegment {
  return scriptSegmentSchema.parse(data);
}

export const WORDS_PER_MINUTE = 150;

export function estimateDuration(wordCount: number): number {
  return Math.round((wordCount / WORDS_PER_MINUTE) * 60);
}

export function estimateWordCount(durationSeconds: number): number {
  return Math.round((durationSeconds / 60) * WORDS_PER_MINUTE);
}
