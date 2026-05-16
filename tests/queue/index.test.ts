import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import * as queue from '../../src/queue';
import { resetDatabase, getJob } from '../../src/db';

let testCounter = 0;

describe('Queue', () => {
  beforeEach(() => {
    resetDatabase();
    queue.clear();
    testCounter++;
    process.env.DB_PATH = path.join(process.cwd(), 'data', `test-queue-${testCounter}.db`);
  });

  afterEach(() => {
    resetDatabase();
    queue.clear();
    delete process.env.DB_PATH;
  });

  describe('enqueue', () => {
    it('creates a job with queued status', () => {
      const id = queue.enqueue('Test topic');
      const job = queue.getStatus(id);
      expect(job).not.toBe(null);
      expect(job!.status).toBe('queued');
      expect(job!.topic).toBe('Test topic');
    });

    it('creates a job without a topic', () => {
      const id = queue.enqueue();
      const job = queue.getStatus(id);
      expect(job).not.toBe(null);
      expect(job!.status).toBe('queued');
      expect(job!.topic).toBe(undefined);
    });

    it('persists job to database', () => {
      const id = queue.enqueue('DB topic');
      const dbJob = getJob(id);
      expect(dbJob).not.toBe(null);
      expect(dbJob!.topic).toBe('DB topic');
      expect(dbJob!.status).toBe('pending');
    });
  });

  describe('getStatus', () => {
    it('returns job by id', () => {
      const id = queue.enqueue('Find me');
      const job = queue.getStatus(id);
      expect(job!.topic).toBe('Find me');
    });

    it('returns null for non-existent job', () => {
      const job = queue.getStatus('does-not-exist');
      expect(job).toBe(null);
    });
  });

  describe('updateStatus', () => {
    it('updates job status to processing', () => {
      const id = queue.enqueue('Processing topic');
      const updated = queue.updateStatus(id, 'processing');
      expect(updated!.status).toBe('processing');
    });

    it('updates job status to completed', () => {
      const id = queue.enqueue('Complete topic');
      queue.updateStatus(id, 'processing');
      const updated = queue.updateStatus(id, 'completed');
      expect(updated!.status).toBe('completed');
    });

    it('updates job status to failed with error', () => {
      const id = queue.enqueue('Fail topic');
      const updated = queue.updateStatus(id, 'failed', {
        error: 'Something broke',
      });
      expect(updated!.status).toBe('failed');
    });

    it('returns null for non-existent job', () => {
      const updated = queue.updateStatus('nope', 'processing');
      expect(updated).toBe(null);
    });
  });

  describe('handler processing', () => {
    it('calls handler for queued jobs', async () => {
      const results: string[] = [];
      queue.setHandler(async (job) => {
        results.push(job.topic || 'no topic');
      });

      queue.enqueue('Topic A');
      await new Promise((r) => setTimeout(r, 50));

      expect(results).toContain('Topic A');
    });

    it('marks job as completed after handler succeeds', async () => {
      queue.setHandler(async () => {});

      const id = queue.enqueue('Success topic');
      await new Promise((r) => setTimeout(r, 50));

      const job = queue.getStatus(id);
      expect(job!.status).toBe('completed');
    });

    it('marks job as failed when handler throws', async () => {
      queue.setHandler(async () => {
        throw new Error('Handler failed');
      });

      const id = queue.enqueue('Fail topic');
      await new Promise((r) => setTimeout(r, 50));

      const job = queue.getStatus(id);
      expect(job!.status).toBe('failed');
    });
  });
});
