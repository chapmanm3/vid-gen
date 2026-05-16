import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { info, error, debug } from './utils/logger';
import jobsRouter from './routes/jobs';
import topicsRouter from './routes/topics';
import scriptsRouter from './routes/scripts';
import voiceRouter from './routes/voice';
import visualsRouter from './routes/visuals';
import videoRouter from './routes/video';
import videosRouter from './routes/videos';

const app: express.Application = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  debug(`${req.method} ${req.originalUrl}`, { method: req.method, path: req.originalUrl });
  res.on('finish', () => {
    const duration = Date.now() - start;
    info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
    });
  });
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use(jobsRouter);
app.use(topicsRouter);
app.use(scriptsRouter);
app.use(voiceRouter);
app.use(visualsRouter);
app.use(videoRouter);
app.use(videosRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
