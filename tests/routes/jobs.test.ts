import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import * as queue from '../../src/queue';
import { resetDatabase } from '../../src/db';

describe('GET /api/jobs/:id', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
  });

  it('returns 404 for non-existent job', async () => {
    const response = await request(app).get('/api/jobs/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Job not found' });
  });

  it('returns job status for existing job', async () => {
    const id = queue.enqueue('Test topic');
    const response = await request(app).get(`/api/jobs/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(id);
    expect(response.body.topic).toBe('Test topic');
    expect(response.body.status).toBe('queued');
  });
});
