let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `job-${Date.now()}-${idCounter}`;
}
import { createJob, getJob, updateJobStatus, Job } from '../db';

export interface QueueJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  topic?: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

type JobHandler = (job: QueueJob) => Promise<void>;

const jobs = new Map<string, QueueJob>();
let handler: JobHandler | null = null;

export function setHandler(h: JobHandler): void {
  handler = h;
}

export function enqueue(topic?: string, data?: Record<string, unknown>): string {
  const id = generateId();
  const job: QueueJob = {
    id,
    status: 'queued',
    topic,
    data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  jobs.set(id, job);
  createJob(id, topic);
  processNext();
  return id;
}

export function getStatus(id: string): QueueJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  return { ...job };
}

export function updateStatus(
  id: string,
  status: QueueJob['status'],
  updates?: { script?: string; videoPath?: string; error?: string }
): QueueJob | null {
  const job = jobs.get(id);
  if (!job) return null;

  job.status = status;
  job.updatedAt = new Date();
  jobs.set(id, job);
  updateJobStatus(id, mapStatus(status), updates);

  if (handler) {
    processNext();
  }

  return { ...job };
}

function mapStatus(status: QueueJob['status']): Job['status'] {
  switch (status) {
    case 'queued':
      return 'pending';
    case 'processing':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
  }
}

async function processNext(): Promise<void> {
  if (!handler) return;

  for (const job of jobs.values()) {
    if (job.status === 'queued') {
      job.status = 'processing';
      job.updatedAt = new Date();
      jobs.set(job.id, job);
      updateJobStatus(job.id, 'processing');

      try {
        await handler(job);
        job.status = 'completed';
        job.updatedAt = new Date();
        jobs.set(job.id, job);
        updateJobStatus(job.id, 'completed');
      } catch (error) {
        job.status = 'failed';
        job.updatedAt = new Date();
        jobs.set(job.id, job);
        updateJobStatus(job.id, 'failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      break;
    }
  }
}

export function clear(): void {
  jobs.clear();
}
