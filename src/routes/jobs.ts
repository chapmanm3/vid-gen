import { Router, Request, Response } from 'express';
import { getStatus } from '../queue';

const router = Router();

router.get('/api/jobs/:id', (req: Request, res: Response) => {
  const job = getStatus(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

export default router;
