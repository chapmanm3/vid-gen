import { describe, it, expect } from 'vitest';
import { generateSRT } from '../../src/video/subtitles';

describe('Subtitles', () => {
  describe('generateSRT', () => {
    it('generates valid SRT content', () => {
      const segments = [
        { text: 'Hello world', duration: 5 },
        { text: 'Second line', duration: 3 },
      ];

      const result = generateSRT(segments);

      expect(result).toContain('1\n');
      expect(result).toContain('00:00:00,000 --> 00:00:05,000');
      expect(result).toContain('Hello world');
      expect(result).toContain('2\n');
      expect(result).toContain('00:00:05,000 --> 00:00:08,000');
      expect(result).toContain('Second line');
    });

    it('handles start offset', () => {
      const segments = [{ text: 'Delayed', duration: 2 }];
      const result = generateSRT(segments, 10);

      expect(result).toContain('00:00:10,000 --> 00:00:12,000');
    });

    it('handles empty segments', () => {
      const result = generateSRT([]);
      expect(result).toBe('');
    });

    it('formats time correctly', () => {
      const segments = [{ text: 'Long', duration: 3661 }];
      const result = generateSRT(segments);

      expect(result).toContain('00:00:00,000 --> 01:01:01,000');
    });

    it('handles fractional seconds', () => {
      const segments = [{ text: 'Precise', duration: 1.5 }];
      const result = generateSRT(segments);

      expect(result).toContain('00:00:00,000 --> 00:00:01,500');
    });
  });
});
