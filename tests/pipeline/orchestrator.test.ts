import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import { resetDatabase, createJob, getJob } from '../../src/db';

const mockRun = vi.fn();

vi.mock('../../src/pipeline/orchestrator', () => ({
  PipelineOrchestrator: class {
    run = (...args: unknown[]) => mockRun(...args);
    constructor() {}
  },
}));

vi.mock('../../src/config', () => ({
  getConfig: () => ({
    OPENAI_API_KEY: 'sk-test',
    PORT: 3000,
    NODE_ENV: 'test',
    OPENAI_TTS_VOICE: 'alloy',
    OPENAI_TTS_MODEL: 'tts-1',
    OPENAI_TTS_SPEED: 1.0,
    PEXELS_API_KEY: undefined,
  }),
}));

let testCounter = 0;

describe('PipelineOrchestrator', () => {
  beforeEach(() => {
    resetDatabase();
    mockRun.mockReset();
    testCounter++;
    process.env.DB_PATH = path.join(process.cwd(), 'data', `test-pipe-${testCounter}.db`);
  });

  afterEach(() => {
    resetDatabase();
    delete process.env.DB_PATH;
  });

  it('runs pipeline and returns result', async () => {
    mockRun.mockResolvedValue({ jobId: 'pipe-1', status: 'completed', videoPath: '/tmp/final.mp4' });

    createJob('pipe-1', 'Test Topic');

    const { PipelineOrchestrator } = await import('../../src/pipeline/orchestrator');
    const orchestrator = new PipelineOrchestrator();
    const result = await orchestrator.run('pipe-1', 'Test Topic');

    expect(result.status).toBe('completed');
    expect(result.videoPath).toBe('/tmp/final.mp4');
  });

  it('handles pipeline failures', async () => {
    mockRun.mockResolvedValue({ jobId: 'pipe-2', status: 'failed', error: 'API down' });

    createJob('pipe-2', 'Fail Topic');

    const { PipelineOrchestrator } = await import('../../src/pipeline/orchestrator');
    const orchestrator = new PipelineOrchestrator();
    const result = await orchestrator.run('pipe-2', 'Fail Topic');

    expect(result.status).toBe('failed');
    expect(result.error).toBe('API down');
  });
});
