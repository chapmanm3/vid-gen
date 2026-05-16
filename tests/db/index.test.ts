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

let testDbPath: string;
let testCounter = 0;

describe('Database', () => {
  beforeEach(() => {
    resetDatabase();
    testCounter++;
    testDbPath = path.join(process.cwd(), 'data', `test-db-${testCounter}.db`);
  });

  afterEach(() => {
    resetDatabase();
  });

  function id(name: string): string {
    return `${testCounter}-${name}`;
  }

  describe('getDatabase', () => {
    it('creates database file and initializes schema', () => {
      const db = getDatabase(testDbPath);
      expect(fs.existsSync(testDbPath)).toBe(true);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      expect(tables).toContainEqual({ name: 'jobs' });
    });

    it('returns the same instance on subsequent calls', () => {
      const db1 = getDatabase(testDbPath);
      const db2 = getDatabase(testDbPath);
      expect(db1).toBe(db2);
    });
  });

  describe('createJob', () => {
    it('creates a job with pending status', () => {
      const job = createJob(id('1'), 'Test topic');
      expect(job.id).toBe(id('1'));
      expect(job.status).toBe('pending');
      expect(job.topic).toBe('Test topic');
      expect(job.script).toBe(null);
      expect(job.videoPath).toBe(null);
      expect(job.error).toBe(null);
    });

    it('creates a job without a topic', () => {
      const job = createJob(id('2'));
      expect(job.id).toBe(id('2'));
      expect(job.status).toBe('pending');
      expect(job.topic).toBe(null);
    });
  });

  describe('getJob', () => {
    it('returns a job by id', () => {
      createJob(id('3'), 'Find me');
      const job = getJob(id('3'));
      expect(job).not.toBe(null);
      expect(job!.topic).toBe('Find me');
    });

    it('returns null for non-existent job', () => {
      const job = getJob(id('nonexistent'));
      expect(job).toBe(null);
    });
  });

  describe('updateJobStatus', () => {
    it('updates job status', () => {
      createJob(id('4'), 'Processing topic');
      const updated = updateJobStatus(id('4'), 'processing');
      expect(updated!.status).toBe('processing');
    });

    it('updates script when provided', () => {
      createJob(id('5'), 'Script topic');
      const updated = updateJobStatus(id('5'), 'processing', {
        script: '{"segments": []}',
      });
      expect(updated!.script).toBe('{"segments": []}');
    });

    it('updates videoPath when provided', () => {
      createJob(id('6'), 'Video topic');
      updateJobStatus(id('6'), 'processing');
      const updated = updateJobStatus(id('6'), 'completed', {
        videoPath: '/videos/test.mp4',
      });
      expect(updated!.status).toBe('completed');
      expect(updated!.videoPath).toBe('/videos/test.mp4');
    });

    it('updates error when provided', () => {
      createJob(id('7'), 'Error topic');
      const updated = updateJobStatus(id('7'), 'failed', {
        error: 'Something went wrong',
      });
      expect(updated!.status).toBe('failed');
      expect(updated!.error).toBe('Something went wrong');
    });

    it('returns null for non-existent job', () => {
      const updated = updateJobStatus(id('nope'), 'processing');
      expect(updated).toBe(null);
    });
  });

  describe('full job lifecycle', () => {
    it('goes through pending -> processing -> completed', () => {
      const created = createJob(id('lifecycle'), 'History of Rome');
      expect(created.status).toBe('pending');

      const processing = updateJobStatus(id('lifecycle'), 'processing', {
        script: '{"hook": "Did you know..."}',
      });
      expect(processing!.status).toBe('processing');
      expect(processing!.script).toContain('hook');

      const completed = updateJobStatus(id('lifecycle'), 'completed', {
        videoPath: '/videos/rome.mp4',
      });
      expect(completed!.status).toBe('completed');
      expect(completed!.videoPath).toBe('/videos/rome.mp4');

      const retrieved = getJob(id('lifecycle'));
      expect(retrieved!.status).toBe('completed');
    });
  });
});
