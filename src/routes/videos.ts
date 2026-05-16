import { Router, Request, Response } from 'express';
import { PipelineOrchestrator } from '../pipeline/orchestrator';
import { enqueue, getStatus } from '../queue';

const router = Router();

router.post('/api/videos', async (req: Request, res: Response) => {
  const { topic, keywords } = req.body;

  if (!topic && !keywords) {
    return res.status(400).json({ error: 'topic or keywords is required' });
  }

  const topicValue = topic || keywords?.join(', ');
  const jobId = enqueue(topicValue);

  const orchestrator = new PipelineOrchestrator();

  setImmediate(async () => {
    try {
      await orchestrator.run(jobId, topicValue);
    } catch {
      // Error handling is done inside orchestrator
    }
  });

  res.status(201).json({ jobId, topic: topicValue, status: 'queued' });
});

router.get('/api/videos/:jobId', (req: Request, res: Response) => {
  const job = getStatus(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

export default router;
