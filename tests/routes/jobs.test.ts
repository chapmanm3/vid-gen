import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import * as queue from '../../src/queue';
import { resetDatabase, createJob, updateJobStatus } from '../../src/db';

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

describe('POST /api/jobs/:id/retry', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
  });

  it('returns 404 for non-existent job', async () => {
    const response = await request(app).post('/api/jobs/nonexistent/retry');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Job not found' });
  });

  it('returns 400 for non-failed job', async () => {
    const id = queue.enqueue('Not failed');
    const response = await request(app).post(`/api/jobs/${id}/retry`);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Can only retry failed jobs' });
  });

  it('retries a failed job', async () => {
    const id = queue.enqueue('Retry me');
    queue.updateStatus(id, 'failed', { error: 'Test error' });

    const response = await request(app).post(`/api/jobs/${id}/retry`);
    expect(response.status).toBe(200);
    expect(response.body.jobId).toBe(id);
    expect(response.body.status).toBe('queued');
  });

  it('increments retryCount on retry', async () => {
    createJob('count-job', 'Count test');
    updateJobStatus('count-job', 'failed', { error: 'Fail' });

    await request(app).post('/api/jobs/count-job/retry');
    const job = await request(app).get('/api/jobs/count-job');

    expect(job.body.retryCount).toBe(1);
  });
});
