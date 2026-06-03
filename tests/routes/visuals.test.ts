import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import * as queue from '../../src/queue';
import { resetDatabase, createJob, updateJobStatus } from '../../src/db';

const mockSearchImages = vi.fn();
const mockSearchVideos = vi.fn();
const mockMatchVisuals = vi.fn();
const mockDownloadAssets = vi.fn();

vi.mock('../../src/visuals/wikimedia', () => ({
  searchImages: (...args: unknown[]) => mockSearchImages(...args),
}));

vi.mock('../../src/visuals/pexels', () => ({
  searchVideos: (...args: unknown[]) => mockSearchVideos(...args),
}));

vi.mock('../../src/visuals/matcher', () => ({
  matchVisuals: (...args: unknown[]) => mockMatchVisuals(...args),
}));

vi.mock('../../src/visuals/downloader', () => ({
  downloadAssets: (...args: unknown[]) => mockDownloadAssets(...args),
}));

vi.mock('../../src/config', () => ({
  getConfig: () => ({
    OPENAI_API_KEY: 'sk-test-key',
    PORT: 3000,
    NODE_ENV: 'test',
    OPENAI_TTS_VOICE: 'alloy',
    OPENAI_TTS_MODEL: 'tts-1',
    OPENAI_TTS_SPEED: 1.0,
    PEXELS_API_KEY: 'test-pexels-key',
  }),
}));

let testCounter = 0;

function createTestApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

describe('Visuals Routes', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
    mockSearchImages.mockReset();
    mockSearchVideos.mockReset();
    mockMatchVisuals.mockReset();
    mockDownloadAssets.mockReset();
    testCounter++;
    process.env.DB_PATH = path.join(process.cwd(), 'data', `test-visuals-${testCounter}.db`);
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
    delete process.env.DB_PATH;
  });

  describe('POST /api/visuals/generate', () => {
    it('generates visual plan for a job', async () => {
      createJob('vis-job-1', 'Test Topic');
      updateJobStatus('vis-job-1', 'processing', {
        script: JSON.stringify({
          segments: [
            { type: 'hook', text: 'Hook', estimatedDuration: 15, keywords: ['rome'] },
          ],
        }),
      });

      mockSearchImages.mockResolvedValue([{ title: 'File:Rome.jpg', url: 'https://example.com/rome.jpg', thumbnailUrl: '', width: 800, height: 600, license: 'PD' }]);
      mockSearchVideos.mockResolvedValue([]);
      mockMatchVisuals.mockReturnValue([{
        segment: { type: 'hook', text: 'Hook', estimatedDuration: 15, keywords: ['rome'] },
        image: { title: 'File:Rome.jpg', url: 'https://example.com/rome.jpg', thumbnailUrl: '', width: 800, height: 600, license: 'PD' },
        fallbackColor: '#1a1a2e',
      }]);
      mockDownloadAssets.mockResolvedValue([{ localPath: '/tmp/rome.jpg', originalUrl: 'https://example.com/rome.jpg' }]);

      const { default: router } = await import('../../src/routes/visuals');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/visuals/generate')
        .send({ jobId: 'vis-job-1' });

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBe('vis-job-1');
      expect(response.body.imagesFound).toBe(1);
    });

    it('returns 400 when jobId is missing', async () => {
      const { default: router } = await import('../../src/routes/visuals');
      const app = createTestApp(router);

      const response = await request(app).post('/api/visuals/generate').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    it('returns 404 when job not found', async () => {
      const { default: router } = await import('../../src/routes/visuals');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/visuals/generate')
        .send({ jobId: 'nonexistent' });

      expect(response.status).toBe(404);
    });
  });
});
