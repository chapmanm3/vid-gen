import { Router, Request, Response } from 'express';
import { getStatus } from '../queue';
import { getAllJobs } from '../db';
import { info, error } from '../utils/logger';

const router: Router = Router();

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

export default router;
