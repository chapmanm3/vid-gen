import { Router, Request, Response } from 'express';
import { VoiceGenerator } from '../voice/generator';
import { ScriptToAudio } from '../voice/pipeline';
import { getConfig } from '../config';
import { getJob, updateJobStatus } from '../db';
import path from 'path';
import { info, error } from '../utils/logger';

const router: Router = Router();

router.post('/api/voice/generate', async (req: Request, res: Response) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  try {
    const job = getJob(jobId);
    if (!job || !job.script) {
      info('Voice generation skipped - no script', { jobId });
      return res.status(404).json({ error: 'Job not found or script not generated' });
    }

    const script = JSON.parse(job.script);
    const config = getConfig();

    info('Starting voice generation', { jobId, segmentCount: script.segments.length });
    const voiceGenerator = new VoiceGenerator({
      apiKey: config.OPENAI_API_KEY,
      voice: config.OPENAI_TTS_VOICE,
      model: config.OPENAI_TTS_MODEL,
      speed: config.OPENAI_TTS_SPEED,
    });

    const outputDir = path.join(process.cwd(), 'data', 'audio', jobId);
    const pipeline = new ScriptToAudio(voiceGenerator, outputDir);
    const result = await pipeline.process(script);

    updateJobStatus(jobId, 'processing', {
      script: job.script,
    });

    info('Voice generation complete', { jobId, segmentCount: result.segments.length, totalDuration: result.totalDuration });
    res.json({
      jobId,
      audioPath: result.concatenatedPath,
      segmentCount: result.segments.length,
      totalDuration: result.totalDuration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error('Voice generation failed', { jobId, error: message });
    updateJobStatus(jobId, 'failed', { error: `Voice generation failed: ${message}` });
    res.status(500).json({ error: 'Voice generation failed', details: message });
  }
});

export default router;
