import { Router, Request, Response } from 'express';
import { VideoRenderer } from '../video/renderer';
import { getJob, updateJobStatus } from '../db';

const router = Router();

router.post('/api/video/render', async (req: Request, res: Response) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  try {
    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const renderer = new VideoRenderer();
    const script = job.script ? JSON.parse(job.script) : null;

    if (!script) {
      return res.status(400).json({ error: 'Script not generated for this job' });
    }

    const audioPath = job.videoPath || '';
    const visualPlan = script.segments.map((s: Record<string, unknown>) => ({
      segment: s,
      fallbackColor: '#1a1a2e',
    }));

    const result = await renderer.render(script, audioPath, visualPlan);

    updateJobStatus(jobId, 'completed', { videoPath: result.videoPath });

    res.json({
      jobId,
      videoPath: result.videoPath,
      duration: result.duration,
      resolution: result.resolution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    updateJobStatus(jobId, 'failed', { error: `Video render failed: ${message}` });
    res.status(500).json({ error: 'Video render failed', details: message });
  }
});

export default router;
