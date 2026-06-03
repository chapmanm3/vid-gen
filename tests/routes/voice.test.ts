import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import * as queue from '../../src/queue';
import { resetDatabase, getJob, createJob, updateJobStatus } from '../../src/db';

const mockGenerate = vi.fn();
const mockProcess = vi.fn();

vi.mock('../../src/voice/generator', () => ({
  VoiceGenerator: class {
    generate = (...args: unknown[]) => mockGenerate(...args);
    constructor() {}
  },
}));

vi.mock('../../src/voice/pipeline', () => ({
  ScriptToAudio: class {
    process = (...args: unknown[]) => mockProcess(...args);
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

let testCounter = 0;

function createTestApp(voiceRouter: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(voiceRouter);
  return app;
}

describe('Voice Routes', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
    mockGenerate.mockReset();
    mockProcess.mockReset();
    testCounter++;
    process.env.DB_PATH = path.join(process.cwd(), 'data', `test-voice-${testCounter}.db`);
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
    delete process.env.DB_PATH;
  });

  describe('POST /api/voice/generate', () => {
    it('generates audio for a job with script', async () => {
      createJob('voice-job-1', 'Test Topic');
      updateJobStatus('voice-job-1', 'processing', {
        script: JSON.stringify({
          title: 'Test',
          topic: 'Test',
          segments: [{ type: 'hook', text: 'Hello', estimatedDuration: 15 }],
          estimatedTotalDuration: 15,
          targetWordCount: 37,
        }),
      });

      mockProcess.mockResolvedValue({
        segments: [{ segment: {}, audioPath: '/tmp/seg.mp3' }],
        concatenatedPath: '/tmp/full-audio.mp3',
        totalDuration: 15,
      });

      const { default: router } = await import('../../src/routes/voice');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/voice/generate')
        .send({ jobId: 'voice-job-1' });

      expect(response.status).toBe(200);
      expect(response.body.audioPath).toBe('/tmp/full-audio.mp3');
      expect(response.body.segmentCount).toBe(1);
    });

    it('returns 400 when jobId is missing', async () => {
      const { default: router } = await import('../../src/routes/voice');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/voice/generate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    it('returns 404 when job not found', async () => {
      const { default: router } = await import('../../src/routes/voice');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/voice/generate')
        .send({ jobId: 'nonexistent' });

      expect(response.status).toBe(404);
    });

    it('returns 404 when job has no script', async () => {
      createJob('voice-job-2', 'No script');

      const { default: router } = await import('../../src/routes/voice');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/voice/generate')
        .send({ jobId: 'voice-job-2' });

      expect(response.status).toBe(404);
    });

    it('handles generation failure', async () => {
      createJob('voice-job-3', 'Test');
      updateJobStatus('voice-job-3', 'processing', {
        script: JSON.stringify({
          title: 'Test',
          topic: 'Test',
          segments: [{ type: 'hook', text: 'Hello', estimatedDuration: 15 }],
          estimatedTotalDuration: 15,
          targetWordCount: 37,
        }),
      });

      mockProcess.mockRejectedValue(new Error('TTS API error'));

      const { default: router } = await import('../../src/routes/voice');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/voice/generate')
        .send({ jobId: 'voice-job-3' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Voice generation failed');
    });
  });
});
