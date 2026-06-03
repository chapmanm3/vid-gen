import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PipelineOrchestrator } from '../pipeline/orchestrator';
import { enqueue, getStatus } from '../queue';
import { info, error } from '../utils/logger';
import { validateRequest } from '../middleware/validate';

const createVideoSchema = z.object({
  topic: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).min(1).optional(),
}).refine((d) => d.topic || d.keywords, { message: 'topic or keywords is required' });

const router: Router = Router();

router.post('/api/videos', validateRequest(createVideoSchema), async (req: Request, res: Response) => {
  const { topic, keywords } = req.body;
  const topicValue = topic || (keywords as string[]).join(', ');
  const jobId = enqueue(topicValue);

  info('Video job enqueued', { jobId, topic: topicValue });

  const orchestrator = new PipelineOrchestrator();

  setImmediate(async () => {
    try {
      info('Starting pipeline', { jobId });
      const result = await orchestrator.run(jobId, topicValue);
      info('Pipeline result', { jobId, status: result.status, error: result.error, videoPath: result.videoPath });
      if (result.status === 'completed') {
        info('Pipeline complete', { jobId });
      } else {
        error('Pipeline finished with non-completed status', { jobId, status: result.status, error: result.error });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : '';
      error('Pipeline crashed', { jobId, error: errMsg, stack: errStack });
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
