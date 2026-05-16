import express, { Request, Response } from 'express';
import jobsRouter from './routes/jobs';
import topicsRouter from './routes/topics';
import scriptsRouter from './routes/scripts';

const app = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use(jobsRouter);
app.use(topicsRouter);
app.use(scriptsRouter);

export default app;
