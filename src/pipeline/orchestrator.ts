import { ScriptGenerator } from '../scripts/generator';
import { VoiceGenerator } from '../voice/generator';
import { ScriptToAudio } from '../voice/pipeline';
import { searchImages } from '../visuals/wikimedia';
import { searchVideos } from '../visuals/pexels';
import { matchVisuals } from '../visuals/matcher';
import { downloadAssets } from '../visuals/downloader';
import { VideoRenderer } from '../video/renderer';
import { Script } from '../scripts/types';
import { getConfig } from '../config';
import { getJob, updateJobStatus } from '../db';
import path from 'path';
import { info, error } from '../utils/logger';

export type PipelineStatus =
  | 'queued'
  | 'generating_script'
  | 'generating_voice'
  | 'fetching_visuals'
  | 'rendering_video'
  | 'completed'
  | 'failed';

export interface PipelineResult {
  jobId: string;
  status: PipelineStatus;
  videoPath?: string;
  error?: string;
}

export class PipelineOrchestrator {
  private config: ReturnType<typeof getConfig>;

  constructor() {
    this.config = getConfig();
  }

  async run(jobId: string, topic: string): Promise<PipelineResult> {
    try {
      info('[pipeline] Step 1: Generating script', { jobId, topic });
      updateJobStatus(jobId, 'processing');
      const scriptGenerator = new ScriptGenerator(this.config.OPENAI_API_KEY);
      const { script } = await scriptGenerator.generateScript(topic);
      info('[pipeline] Script generated', { jobId, segments: script.segments.length });
      updateJobStatus(jobId, 'processing', { script: JSON.stringify(script) });

      info('[pipeline] Step 2: Generating voice', { jobId });
      const voiceGenerator = new VoiceGenerator({
        apiKey: this.config.OPENAI_API_KEY,
        voice: this.config.OPENAI_TTS_VOICE,
        model: this.config.OPENAI_TTS_MODEL,
        speed: this.config.OPENAI_TTS_SPEED,
      });

      const audioDir = path.join(process.cwd(), 'data', 'audio', jobId);
      const audioPipeline = new ScriptToAudio(voiceGenerator, audioDir);
      const audioResult = await audioPipeline.process(script);
      info('[pipeline] Voice generated', { jobId, audioPath: audioResult.concatenatedPath, duration: audioResult.totalDuration });

      // Step 3: Fetch visuals
      info('[pipeline] Step 3: Fetching visuals', { jobId });
      const keywords = script.segments.flatMap((s) => s.keywords).slice(0, 5);
      const uniqueKeywords = [...new Set(keywords)];

      const [images, videos] = await Promise.allSettled([
        Promise.all(uniqueKeywords.map((kw) => searchImages(kw, 3))).then((r) => r.flat()),
        this.config.PEXELS_API_KEY
          ? Promise.all(uniqueKeywords.map((kw) => searchVideos(kw, this.config.PEXELS_API_KEY!, 2))).then((r) => r.flat())
          : Promise.resolve([]),
      ]);

      const imageList = images.status === 'fulfilled' ? images.value : [];
      const videoList = videos.status === 'fulfilled' ? videos.value : [];
      info('[pipeline] Visuals fetched', { jobId, images: imageList.length, videos: videoList.length });

      const visualPlan = matchVisuals(script.segments, imageList, videoList);
      info('[pipeline] Visuals matched', { jobId, planSize: visualPlan.length });

      const urlsToDownload = [
        ...visualPlan.filter((v) => v.image).map((v) => v.image!.url),
        ...visualPlan.filter((v) => v.video).map((v) => v.video!.videoFiles[0]?.link).filter(Boolean),
      ];

      const downloaded = await downloadAssets(urlsToDownload);
      info('[pipeline] Assets downloaded', { jobId, count: downloaded.length });

      const planWithPaths = visualPlan.map((vp) => ({
        segment: vp.segment,
        imagePath: vp.image ? downloaded.find((d) => d.originalUrl === vp.image!.url)?.localPath : undefined,
        fallbackColor: vp.fallbackColor,
      }));

      // Step 4: Render video
      info('[pipeline] Step 4: Rendering video', { jobId });
      const renderer = new VideoRenderer();
      const videoResult = await renderer.render(script, audioResult.concatenatedPath, planWithPaths);
      info('[pipeline] Video rendered', { jobId, videoPath: videoResult.videoPath });

      // Step 5: Complete
      info('[pipeline] Step 5: Marking complete', { jobId });
      updateJobStatus(jobId, 'completed', { videoPath: videoResult.videoPath });

      return {
        jobId,
        status: 'completed',
        videoPath: videoResult.videoPath,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : '';
      error('[pipeline] Pipeline failed', { jobId, message, stack });
      updateJobStatus(jobId, 'failed', { error: `Pipeline failed: ${message}` });

      return {
        jobId,
        status: 'failed',
        error: message,
      };
    }
  }
}
