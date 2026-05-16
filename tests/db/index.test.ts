import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getDatabase,
  createJob,
  getJob,
  updateJobStatus,
  resetDatabase,
  Job,
} from '../../src/db';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test.db');

describe('Database', () => {
  beforeEach(() => {
    resetDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    if (fs.existsSync(TEST_DB_PATH + '-wal')) {
      fs.unlinkSync(TEST_DB_PATH + '-wal');
    }
    if (fs.existsSync(TEST_DB_PATH + '-shm')) {
      fs.unlinkSync(TEST_DB_PATH + '-shm');
    }
  });

  afterEach(() => {
    resetDatabase();
  });

  describe('getDatabase', () => {
    it('creates database file and initializes schema', () => {
      const db = getDatabase(TEST_DB_PATH);
      expect(fs.existsSync(TEST_DB_PATH)).toBe(true);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      expect(tables).toContainEqual({ name: 'jobs' });
    });

    it('returns the same instance on subsequent calls', () => {
      const db1 = getDatabase(TEST_DB_PATH);
      const db2 = getDatabase(TEST_DB_PATH);
      expect(db1).toBe(db2);
    });
  });

  describe('createJob', () => {
    it('creates a job with pending status', () => {
      const job = createJob('test-1', 'Test topic');
      expect(job.id).toBe('test-1');
      expect(job.status).toBe('pending');
      expect(job.topic).toBe('Test topic');
      expect(job.script).toBe(null);
      expect(job.videoPath).toBe(null);
      expect(job.error).toBe(null);
    });

    it('creates a job without a topic', () => {
      const job = createJob('test-2');
      expect(job.id).toBe('test-2');
      expect(job.status).toBe('pending');
      expect(job.topic).toBe(null);
    });
  });

  describe('getJob', () => {
    it('returns a job by id', () => {
      createJob('test-3', 'Find me');
      const job = getJob('test-3');
      expect(job).not.toBe(null);
      expect(job!.topic).toBe('Find me');
    });

    it('returns null for non-existent job', () => {
      const job = getJob('does-not-exist');
      expect(job).toBe(null);
    });
  });

  describe('updateJobStatus', () => {
    it('updates job status', () => {
      createJob('test-4', 'Processing topic');
      const updated = updateJobStatus('test-4', 'processing');
      expect(updated!.status).toBe('processing');
    });

    it('updates script when provided', () => {
      createJob('test-5', 'Script topic');
      const updated = updateJobStatus('test-5', 'processing', {
        script: '{"segments": []}',
      });
      expect(updated!.script).toBe('{"segments": []}');
    });

    it('updates videoPath when provided', () => {
      createJob('test-6', 'Video topic');
      updateJobStatus('test-6', 'processing');
      const updated = updateJobStatus('test-6', 'completed', {
        videoPath: '/videos/test.mp4',
      });
      expect(updated!.status).toBe('completed');
      expect(updated!.videoPath).toBe('/videos/test.mp4');
    });

    it('updates error when provided', () => {
      createJob('test-7', 'Error topic');
      const updated = updateJobStatus('test-7', 'failed', {
        error: 'Something went wrong',
      });
      expect(updated!.status).toBe('failed');
      expect(updated!.error).toBe('Something went wrong');
    });

    it('returns null for non-existent job', () => {
      const updated = updateJobStatus('nope', 'processing');
      expect(updated).toBe(null);
    });
  });

  describe('full job lifecycle', () => {
    it('goes through pending -> processing -> completed', () => {
      const created = createJob('lifecycle-1', 'History of Rome');
      expect(created.status).toBe('pending');

      const processing = updateJobStatus('lifecycle-1', 'processing', {
        script: '{"hook": "Did you know..."}',
      });
      expect(processing!.status).toBe('processing');
      expect(processing!.script).toContain('hook');

      const completed = updateJobStatus('lifecycle-1', 'completed', {
        videoPath: '/videos/rome.mp4',
      });
      expect(completed!.status).toBe('completed');
      expect(completed!.videoPath).toBe('/videos/rome.mp4');

      const retrieved = getJob('lifecycle-1');
      expect(retrieved!.status).toBe('completed');
    });
  });
});
