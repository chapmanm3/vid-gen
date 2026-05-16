import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as queue from '../../src/queue';
import { resetDatabase, getJob } from '../../src/db';

function createTestApp(topicsRouter: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(topicsRouter);
  return app;
}

describe('Topic Routes', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
  });

  describe('POST /api/topics/select', () => {
    it('creates a job for a topic', async () => {
      const { default: router } = await import('../../src/routes/topics');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/topics/select')
        .send({ topic: 'Battle of Hastings' });

      expect(response.status).toBe(201);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.topic).toBe('Battle of Hastings');
    });

    it('creates a job from keywords', async () => {
      const { default: router } = await import('../../src/routes/topics');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/topics/select')
        .send({ keywords: ['rome', 'empire'] });

      expect(response.status).toBe(201);
      expect(response.body.topic).toBe('rome, empire');
    });

    it('returns 400 when neither topic nor keywords provided', async () => {
      const { default: router } = await import('../../src/routes/topics');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/topics/select')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('persists job to database', async () => {
      const { default: router } = await import('../../src/routes/topics');
      const app = createTestApp(router);

      const response = await request(app)
        .post('/api/topics/select')
        .send({ topic: 'Test Topic' });

      const job = getJob(response.body.jobId);
      expect(job).not.toBe(null);
      expect(job!.topic).toBe('Test Topic');
    });
  });
});
