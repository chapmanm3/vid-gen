import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import * as queue from '../../src/queue';
import { resetDatabase, getJob, createJob } from '../../src/db';

let testCounter = 0;

const mockGenerateScript = vi.fn();

vi.mock('../../src/scripts/generator', () => ({
  ScriptGenerator: class {
    generateScript = (...args: unknown[]) => mockGenerateScript(...args);
    constructor() {}
  },
}));

vi.mock('../../src/config', () => ({
  getConfig: () => ({
    OPENAI_API_KEY: 'sk-test-key',
    PORT: 3000,
    NODE_ENV: 'test',
    OPENAI_TTS_VOICE: 'alloy',
    OPENAI_TTS_MODEL: 'tts-1',
    OPENAI_TTS_SPEED: 1.0,
  }),
}));

function createTestApp(scriptsRouter: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(scriptsRouter);
  return app;
}

describe('Script Routes', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
    mockGenerateScript.mockReset();
    testCounter++;
    process.env.DB_PATH = path.join(process.cwd(), 'data', `test-scripts-${testCounter}.db`);
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
    mockGenerateScript.mockReset();
    delete process.env.DB_PATH;
  });

  describe('POST /api/scripts/generate', () => {
    it('generates a script for a job', async () => {
      mockGenerateScript.mockResolvedValue({
        script: {
          title: 'Fall of Rome',
          topic: 'Fall of Rome',
          segments: [
            { type: 'hook', text: 'In 476 AD...', estimatedDuration: 15, keywords: ['rome'] },
          ],
          estimatedTotalDuration: 15,
          targetWordCount: 37,
        },
        tokensUsed: 100,
      });

      const { default: router } = await import('../../src/routes/scripts');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/scripts/generate')
        .send({ jobId: 'test-job-1', topic: 'Fall of Rome' });

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBe('test-job-1');
      expect(response.body.script.title).toBe('Fall of Rome');
    });

    it('updates job status in database', async () => {
      createJob('test-job-2', 'Test Topic');

      mockGenerateScript.mockResolvedValue({
        script: {
          title: 'Test',
          topic: 'Test',
          segments: [{ type: 'hook', text: 'Hook', estimatedDuration: 15 }],
          estimatedTotalDuration: 15,
          targetWordCount: 37,
        },
        tokensUsed: 50,
      });

      const { default: router } = await import('../../src/routes/scripts');
      const app = createTestApp(router);

      await request(app)
        .post('/api/scripts/generate')
        .send({ jobId: 'test-job-2', topic: 'Test' });

      const job = getJob('test-job-2');
      expect(job).not.toBe(null);
      expect(job!.script).toContain('Test');
    });

    it('returns 400 when jobId is missing', async () => {
      const { default: router } = await import('../../src/routes/scripts');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/scripts/generate')
        .send({ topic: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    it('returns 400 when neither topic nor keywords provided', async () => {
      const { default: router } = await import('../../src/routes/scripts');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/scripts/generate')
        .send({ jobId: 'test-job-3' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    it('handles generation failure', async () => {
      mockGenerateScript.mockRejectedValue(new Error('API error'));

      const { default: router } = await import('../../src/routes/scripts');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/scripts/generate')
        .send({ jobId: 'test-job-4', topic: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Script generation failed');
    });
  });
});
