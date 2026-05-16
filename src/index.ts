import express, { Request, Response } from 'express';
import jobsRouter from './routes/jobs';

const app = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use(jobsRouter);

export default app;
