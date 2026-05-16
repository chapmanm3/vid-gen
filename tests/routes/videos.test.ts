import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import * as queue from '../../src/queue';
import { resetDatabase } from '../../src/db';

vi.mock('../../src/pipeline/orchestrator', () => ({
  PipelineOrchestrator: class {
    run = vi.fn().mockResolvedValue({ jobId: 'test', status: 'completed', videoPath: '/tmp/final.mp4' });
    constructor() {}
  },
}));

let testCounter = 0;

function createTestApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

describe('Videos Routes', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
    testCounter++;
    process.env.DB_PATH = path.join(process.cwd(), 'data', `test-vr-${testCounter}.db`);
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
    delete process.env.DB_PATH;
  });

  describe('POST /api/videos', () => {
    it('creates a video job', async () => {
      const { default: router } = await import('../../src/routes/videos');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/videos')
        .send({ topic: 'Fall of Rome' });

      expect(response.status).toBe(201);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.topic).toBe('Fall of Rome');
      expect(response.body.status).toBe('queued');
    });

    it('returns 400 when neither topic nor keywords', async () => {
      const { default: router } = await import('../../src/routes/videos');
      const app = createTestApp(router);

      const response = await request(app).post('/api/videos').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('topic or keywords is required');
    });
  });

  describe('GET /api/videos/:jobId', () => {
    it('returns 404 for non-existent job', async () => {
      const { default: router } = await import('../../src/routes/videos');
      const app = createTestApp(router);

      const response = await request(app).get('/api/videos/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
