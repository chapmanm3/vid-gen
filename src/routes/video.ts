import { Router, Request, Response } from 'express';
import { VideoRenderer } from '../video/renderer';
import { getJob, updateJobStatus } from '../db';
import { info, error } from '../utils/logger';

const router: Router = Router();

router.post('/api/video/render', async (req: Request, res: Response) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  try {
    const job = getJob(jobId);
    if (!job) {
      info('Video render skipped - job not found', { jobId });
      return res.status(404).json({ error: 'Job not found' });
    }

    const renderer = new VideoRenderer();
    const script = job.script ? JSON.parse(job.script) : null;

    if (!script) {
      return res.status(400).json({ error: 'Script not generated for this job' });
    }

    info('Starting video render', { jobId });
    const audioPath = job.videoPath || '';
    const visualPlan = script.segments.map((s: Record<string, unknown>) => ({
      segment: s,
      fallbackColor: '#1a1a2e',
    }));

    const result = await renderer.render(script, audioPath, visualPlan);

    updateJobStatus(jobId, 'completed', { videoPath: result.videoPath });

    info('Video render complete', { jobId, videoPath: result.videoPath, duration: result.duration });
    res.json({
      jobId,
      videoPath: result.videoPath,
      duration: result.duration,
      resolution: result.resolution,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error('Video render failed', { jobId, error: message });
    updateJobStatus(jobId, 'failed', { error: `Video render failed: ${message}` });
    res.status(500).json({ error: 'Video render failed', details: message });
  }
});

export default router;
