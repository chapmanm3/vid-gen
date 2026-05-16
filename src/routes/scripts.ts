import { Router, Request, Response } from 'express';
import { ScriptGenerator } from '../scripts/generator';
import { getConfig } from '../config';
import { updateJobStatus } from '../db';

const router = Router();

router.post('/api/scripts/generate', async (req: Request, res: Response) => {
  const { jobId, topic, keywords } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  if (!topic && !keywords) {
    return res.status(400).json({ error: 'topic or keywords is required' });
  }

  try {
    const config = getConfig();
    const generator = new ScriptGenerator(config.OPENAI_API_KEY);
    const topicValue = topic || keywords?.join(', ');
    const { script } = await generator.generateScript(topicValue);

    updateJobStatus(jobId, 'processing', {
      script: JSON.stringify(script),
    });

    res.json({ jobId, script });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    updateJobStatus(jobId, 'failed', { error: `Script generation failed: ${message}` });
    res.status(500).json({ error: 'Script generation failed', details: message });
  }
});

export default router;
