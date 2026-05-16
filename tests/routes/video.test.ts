import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import * as queue from '../../src/queue';
import { resetDatabase, createJob, updateJobStatus } from '../../src/db';

const mockRender = vi.fn();

vi.mock('../../src/video/renderer', () => ({
  VideoRenderer: class {
    render = (...args: unknown[]) => mockRender(...args);
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

describe('Video Routes', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
    mockRender.mockReset();
    testCounter++;
    process.env.DB_PATH = path.join(process.cwd(), 'data', `test-video-${testCounter}.db`);
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
    delete process.env.DB_PATH;
  });

  describe('POST /api/video/render', () => {
    it('renders a video for a job', async () => {
      createJob('vid-job-1', 'Test Topic');
      updateJobStatus('vid-job-1', 'processing', {
        script: JSON.stringify({
          segments: [
            { type: 'hook', text: 'Hook', estimatedDuration: 15 },
          ],
          estimatedTotalDuration: 15,
        }),
      });

      mockRender.mockResolvedValue({
        videoPath: '/tmp/final.mp4',
        duration: 15,
        resolution: '1920x1080',
      });

      const { default: router } = await import('../../src/routes/video');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/video/render')
        .send({ jobId: 'vid-job-1' });

      expect(response.status).toBe(200);
      expect(response.body.videoPath).toBe('/tmp/final.mp4');
    });

    it('returns 400 when jobId is missing', async () => {
      const { default: router } = await import('../../src/routes/video');
      const app = createTestApp(router);

      const response = await request(app).post('/api/video/render').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('jobId is required');
    });

    it('returns 404 when job not found', async () => {
      const { default: router } = await import('../../src/routes/video');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/video/render')
        .send({ jobId: 'nonexistent' });

      expect(response.status).toBe(404);
    });

    it('returns 400 when script not generated', async () => {
      createJob('vid-job-2', 'No script');

      const { default: router } = await import('../../src/routes/video');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/video/render')
        .send({ jobId: 'vid-job-2' });

      expect(response.status).toBe(400);
    });
  });
});
