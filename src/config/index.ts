import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  DB_PATH: z.string().optional(),
  PEXELS_API_KEY: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  OPENAI_TTS_VOICE: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  OPENAI_TTS_MODEL: z.enum(['tts-1', 'tts-1-hd']).default('tts-1'),
  OPENAI_TTS_SPEED: z.coerce.number().min(0.25).max(4.0).default(1.0),
});

export type Config = z.infer<typeof envSchema>;

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.issues.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Invalid environment configuration:\n${errors}`);
    }
    config = result.data;
  }
  return config;
}

export function resetConfig(): void {
  config = null;
}
