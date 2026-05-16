import { VoiceGenerator } from './generator';
import { Script, ScriptSegment } from '../scripts/types';
import path from 'path';

export interface AudioSegment {
  segment: ScriptSegment;
  audioPath: string;
}

export interface AudioPipelineResult {
  segments: AudioSegment[];
  concatenatedPath: string;
  totalDuration: number;
}

export class ScriptToAudio {
  private voiceGenerator: VoiceGenerator;
  private outputDir: string;

  constructor(voiceGenerator: VoiceGenerator, outputDir: string) {
    this.voiceGenerator = voiceGenerator;
    this.outputDir = outputDir;
  }

  async process(script: Script): Promise<AudioPipelineResult> {
    const segments: AudioSegment[] = [];

    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i];
      const audioPath = path.join(this.outputDir, `segment-${i}.mp3`);

      await this.voiceGenerator.generate(segment.text, audioPath);

      segments.push({ segment, audioPath });
    }

    const concatenatedPath = path.join(this.outputDir, 'full-audio.mp3');
    await this.concatenateAudio(segments.map((s) => s.audioPath), concatenatedPath);

    return {
      segments,
      concatenatedPath,
      totalDuration: script.estimatedTotalDuration,
    };
  }

  private async concatenateAudio(inputPaths: string[], outputPath: string): Promise<void> {
    const { default: ffmpeg } = await import('fluent-ffmpeg');

    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      for (const inputPath of inputPaths) {
        command.input(inputPath);
      }

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .mergeToFile(outputPath);
    });
  }
}
