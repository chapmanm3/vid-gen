import { Router, Request, Response } from 'express';
import { getStatus, retryJob } from '../queue';
import { getAllJobs, getJob, onJobChange } from '../db';
import { info, error } from '../utils/logger';
import { PipelineOrchestrator } from '../pipeline/orchestrator';

const router: Router = Router();

const sseClients = new Set<Response>();

onJobChange(() => {
  const jobs = getAllJobs();
  const data = `data: ${JSON.stringify(jobs)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
});

router.get('/api/jobs/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const jobs = getAllJobs();
  res.write(`data: ${JSON.stringify(jobs)}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

router.get('/api/jobs', (_req: Request, res: Response) => {
  const jobs = getAllJobs();
  info('Fetched all jobs', { count: jobs.length });
  res.json(jobs);
});

router.get('/api/jobs/:id', (req: Request, res: Response) => {
  const job = getStatus(req.params.id as string);
  if (!job) {
    info('Job not found', { jobId: req.params.id });
    return res.status(404).json({ error: 'Job not found' });
  }
  info('Fetched job', { jobId: req.params.id, status: job.status });
  res.json(job);
});

router.post('/api/jobs/:id/retry', async (req: Request, res: Response) => {
  const jobId = req.params.id as string;
  const dbJob = getJob(jobId);

  if (!dbJob) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (dbJob.status !== 'failed') {
    return res.status(400).json({ error: 'Can only retry failed jobs' });
  }

  info('Retrying job', { jobId, retryCount: dbJob.retryCount });

  const result = retryJob(jobId);
  if (!result) {
    return res.status(400).json({ error: 'Failed to retry job' });
  }

  const orchestrator = new PipelineOrchestrator();
  const topic = dbJob.topic || '';

  setImmediate(async () => {
    try {
      info('Starting retry pipeline', { jobId });
      await orchestrator.run(jobId, topic);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      error('Retry pipeline crashed', { jobId, error: errMsg });
    }
  });

  res.json({ jobId, status: 'queued', retryCount: result.status === 'queued' ? dbJob.retryCount + 1 : dbJob.retryCount });
});

export default router;
