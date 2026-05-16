import { Router, Request, Response } from 'express';
import { PipelineOrchestrator } from '../pipeline/orchestrator';
import { enqueue, getStatus } from '../queue';
import { info, error } from '../utils/logger';

const router: Router = Router();

router.post('/api/videos', async (req: Request, res: Response) => {
  const { topic, keywords } = req.body;

  if (!topic && !keywords) {
    return res.status(400).json({ error: 'topic or keywords is required' });
  }

  const topicValue = topic || keywords?.join(', ');
  const jobId = enqueue(topicValue);

  info('Video job enqueued', { jobId, topic: topicValue });

  const orchestrator = new PipelineOrchestrator();

  setImmediate(async () => {
    try {
      info('Starting pipeline', { jobId });
      await orchestrator.run(jobId, topicValue);
      info('Pipeline complete', { jobId });
    } catch (err) {
      error('Pipeline failed', { jobId, error: err instanceof Error ? err.message : 'unknown' });
    }
  });

  res.status(201).json({ jobId, topic: topicValue, status: 'queued' });
});

router.get('/api/videos/:jobId', (req: Request, res: Response) => {
  const job = getStatus(req.params.jobId as string);
  if (!job) {
    info('Video job not found', { jobId: req.params.jobId });
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

export default router;
