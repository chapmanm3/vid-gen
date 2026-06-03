import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ScriptGenerator } from '../scripts/generator';
import { getConfig } from '../config';
import { updateJobStatus } from '../db';
import { info, error } from '../utils/logger';
import { validateRequest } from '../middleware/validate';

const generateScriptSchema = z.object({
  jobId: z.string().min(1),
  topic: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).min(1).optional(),
}).refine((d) => d.topic || d.keywords, { message: 'topic or keywords is required' });

const router: Router = Router();

router.post('/api/scripts/generate', validateRequest(generateScriptSchema), async (req: Request, res: Response) => {
  const { jobId, topic, keywords } = req.body;

  try {
    const topicValue = topic || (keywords as string[]).join(', ');
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
