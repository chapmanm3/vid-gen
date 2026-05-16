import express, { Request, Response } from 'express';
import jobsRouter from './routes/jobs';
import topicsRouter from './routes/topics';
import scriptsRouter from './routes/scripts';
import voiceRouter from './routes/voice';
import visualsRouter from './routes/visuals';
import videoRouter from './routes/video';
import videosRouter from './routes/videos';

const app = express();

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

export default app;
