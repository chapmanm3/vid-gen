import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VoiceGenerator } from '../../src/voice/generator';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class {
    audio = {
      speech: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    };
    constructor() {}
  },
}));

describe('VoiceGenerator', () => {
  let generator: VoiceGenerator;

  beforeEach(() => {
    mockCreate.mockReset();
    generator = new VoiceGenerator({
      apiKey: 'sk-test-key',
      voice: 'alloy',
      model: 'tts-1',
      speed: 1.0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generate', () => {
    it('generates audio file from text', async () => {
      const mockAudioBuffer = Buffer.from('fake-audio-data');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => mockAudioBuffer,
      });

      const outputPath = path.join(process.cwd(), 'data', 'test-output.mp3');
      const result = await generator.generate('Hello world', outputPath);

      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.readFileSync(outputPath)).toEqual(mockAudioBuffer);

      fs.unlinkSync(outputPath);
    });

    it('uses configured voice and model', async () => {
      const mockAudioBuffer = Buffer.from('fake-audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => mockAudioBuffer,
      });

      await generator.generate('Test', '/tmp/test.mp3');

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'tts-1',
        voice: 'alloy',
        input: 'Test',
        speed: 1.0,
      });
    });

    it('creates output directory if needed', async () => {
      const mockAudioBuffer = Buffer.from('fake-audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => mockAudioBuffer,
      });

      const nestedPath = path.join(process.cwd(), 'data', 'nested', 'dir', 'test.mp3');
      const result = await generator.generate('Test', nestedPath);

      expect(result).toBe(nestedPath);
      expect(fs.existsSync(nestedPath)).toBe(true);

      fs.rmSync(path.join(process.cwd(), 'data', 'nested'), { recursive: true });
    });
  });

  describe('generateBatch', () => {
    it('generates multiple audio files', async () => {
      const mockAudioBuffer = Buffer.from('fake-audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => mockAudioBuffer,
      });

      const segments = [
        { text: 'Segment 1', outputPath: '/tmp/seg1.mp3' },
        { text: 'Segment 2', outputPath: '/tmp/seg2.mp3' },
      ];

      const results = await generator.generateBatch(segments);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe('/tmp/seg1.mp3');
      expect(results[1]).toBe('/tmp/seg2.mp3');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });
});
