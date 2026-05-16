import { Router, Request, Response } from 'express';
import { ScriptGenerator } from '../scripts/generator';
import { getConfig } from '../config';
import { updateJobStatus } from '../db';
import { info, error } from '../utils/logger';

const router: Router = Router();

router.post('/api/scripts/generate', async (req: Request, res: Response) => {
  const { jobId, topic, keywords } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  if (!topic && !keywords) {
    return res.status(400).json({ error: 'topic or keywords is required' });
  }

  try {
    const topicValue = topic || keywords?.join(', ');
    info('Starting script generation', { jobId, topic: topicValue });
    const config = getConfig();
    const generator = new ScriptGenerator(config.OPENAI_API_KEY);
    const { script } = await generator.generateScript(topicValue);

    updateJobStatus(jobId, 'processing', {
      script: JSON.stringify(script),
    });

    info('Script generated', { jobId, segmentCount: script.segments.length });
    res.json({ jobId, script });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error('Script generation failed', { jobId, error: message });
    updateJobStatus(jobId, 'failed', { error: `Script generation failed: ${message}` });
    res.status(500).json({ error: 'Script generation failed', details: message });
  }
});

export default router;
