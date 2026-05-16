import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { ScriptToAudio } from '../../src/voice/pipeline';
import { Script } from '../../src/scripts/types';
import { VoiceGenerator } from '../../src/voice/generator';

const mockGenerate = vi.fn();
const mockFfmpeg = vi.fn();

vi.mock('../../src/voice/generator', () => ({
  VoiceGenerator: class {
    generate = (...args: unknown[]) => mockGenerate(...args);
    constructor() {}
  },
}));

vi.mock('fluent-ffmpeg', () => ({
  default: () => {
    return {
      input: vi.fn().mockReturnThis(),
      on: vi.fn().mockImplementation(function (this: Record<string, unknown>, event: string, cb: unknown) {
        (this as Record<string, unknown>)[`_${event}`] = cb;
        return this;
      }),
      mergeToFile: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
        if (this._end) this._end();
      }),
    };
  },
}));

describe('ScriptToAudio', () => {
  let pipeline: ScriptToAudio;
  let voiceGenerator: VoiceGenerator;

  beforeEach(() => {
    mockGenerate.mockReset();
    voiceGenerator = new VoiceGenerator({
      apiKey: 'sk-test',
      voice: 'alloy',
      model: 'tts-1',
      speed: 1.0,
    });
    pipeline = new ScriptToAudio(voiceGenerator, '/tmp/audio-output');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeMockScript(): Script {
    return {
      title: 'Test Script',
      topic: 'Test Topic',
      segments: [
        { type: 'hook', text: 'Hook text', estimatedDuration: 15, keywords: ['hook'] },
        { type: 'body', text: 'Body text', estimatedDuration: 30, keywords: ['body'] },
        { type: 'conclusion', text: 'Conclusion text', estimatedDuration: 15, keywords: ['conclusion'] },
      ],
      estimatedTotalDuration: 60,
      targetWordCount: 150,
    };
  }

  describe('process', () => {
    it('generates audio for each segment', async () => {
      mockGenerate.mockResolvedValue('/tmp/output.mp3');

      const result = await pipeline.process(makeMockScript());

      expect(mockGenerate).toHaveBeenCalledTimes(3);
      expect(result.segments).toHaveLength(3);
    });

    it('returns correct segment paths', async () => {
      mockGenerate.mockResolvedValue('/tmp/output.mp3');

      const result = await pipeline.process(makeMockScript());

      expect(result.segments[0].audioPath).toContain('segment-0.mp3');
      expect(result.segments[1].audioPath).toContain('segment-1.mp3');
      expect(result.segments[2].audioPath).toContain('segment-2.mp3');
    });

    it('returns concatenated audio path', async () => {
      mockGenerate.mockResolvedValue('/tmp/output.mp3');

      const result = await pipeline.process(makeMockScript());

      expect(result.concatenatedPath).toContain('full-audio.mp3');
    });

    it('returns total duration from script', async () => {
      mockGenerate.mockResolvedValue('/tmp/output.mp3');

      const result = await pipeline.process(makeMockScript());

      expect(result.totalDuration).toBe(60);
    });

    it('concatenates all segment audio files', async () => {
      mockGenerate.mockResolvedValue('/tmp/output.mp3');

      await pipeline.process(makeMockScript());

      expect(mockGenerate).toHaveBeenCalledWith('Hook text', expect.any(String));
      expect(mockGenerate).toHaveBeenCalledWith('Body text', expect.any(String));
      expect(mockGenerate).toHaveBeenCalledWith('Conclusion text', expect.any(String));
    });
  });
});
