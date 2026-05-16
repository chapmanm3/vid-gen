import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export type VoiceId = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface TTSConfig {
  apiKey: string;
  voice: VoiceId;
  model: 'tts-1' | 'tts-1-hd';
  speed: number;
}

export class VoiceGenerator {
  private client: OpenAI;
  private config: TTSConfig;

  constructor(config: TTSConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.config = config;
  }

  async generate(text: string, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await this.client.audio.speech.create({
      model: this.config.model,
      voice: this.config.voice,
      input: text,
      speed: this.config.speed,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  }

  async generateBatch(
    segments: { text: string; outputPath: string }[]
  ): Promise<string[]> {
    const results: string[] = [];

    for (const segment of segments) {
      const output = await this.generate(segment.text, segment.outputPath);
      results.push(output);
    }

    return results;
  }
}
