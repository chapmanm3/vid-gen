import { Script, ScriptSegment } from '../scripts/types';
import { createBlankVideo, imageToVideo, concatVideos, addAudioToVideo, burnSubtitles } from './assembly';
import { generateSRT } from './subtitles';
import path from 'path';
import fs from 'fs';

export interface VideoRenderResult {
  videoPath: string;
  duration: number;
  resolution: string;
}

export interface VideoRendererConfig {
  outputDir: string;
  width: number;
  height: number;
  musicPath?: string;
  musicVolume: number;
}

const DEFAULT_CONFIG: VideoRendererConfig = {
  outputDir: path.join(process.cwd(), 'data', 'videos'),
  width: 1920,
  height: 1080,
  musicVolume: 0.15,
};

export class VideoRenderer {
  private config: VideoRendererConfig;

  constructor(config: Partial<VideoRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async render(
    script: Script,
    audioPath: string,
    visualPlan: { imagePath?: string; fallbackColor: string; segment: ScriptSegment }[]
  ): Promise<VideoRenderResult> {
    const jobId = Date.now().toString();
    const workDir = path.join(this.config.outputDir, jobId);
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    const segmentVideos: string[] = [];

    for (let i = 0; i < visualPlan.length; i++) {
      const plan = visualPlan[i];
      const segmentOutput = path.join(workDir, `segment-${i}.mp4`);

      if (plan.imagePath && fs.existsSync(plan.imagePath)) {
        await imageToVideo(plan.imagePath, plan.segment.estimatedDuration, segmentOutput, {
          width: this.config.width,
          height: this.config.height,
        });
      } else {
        await createBlankVideo(plan.segment.estimatedDuration, plan.fallbackColor, segmentOutput, {
          width: this.config.width,
          height: this.config.height,
        });
      }

      segmentVideos.push(segmentOutput);
    }

    const concatenatedPath = path.join(workDir, 'concatenated.mp4');
    await concatVideos(segmentVideos, concatenatedPath);

    const withAudioPath = path.join(workDir, 'with-audio.mp4');
    await addAudioToVideo(concatenatedPath, audioPath, withAudioPath);

    const srtContent = generateSRT(script.segments.map((s) => ({ text: s.text, duration: s.estimatedDuration })));
    const srtPath = path.join(workDir, 'subtitles.srt');
    fs.writeFileSync(srtPath, srtContent);

    const finalPath = path.join(this.config.outputDir, `${jobId}-final.mp4`);
    await burnSubtitles(withAudioPath, srtPath, finalPath);

    return {
      videoPath: finalPath,
      duration: script.estimatedTotalDuration,
      resolution: `${this.config.width}x${this.config.height}`,
    };
  }
}
