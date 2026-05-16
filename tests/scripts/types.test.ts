import { describe, it, expect } from 'vitest';
import {
  validateScript,
  validateSegment,
  estimateDuration,
  estimateWordCount,
  WORDS_PER_MINUTE,
  Script,
} from '../../src/scripts/types';

describe('Script Types', () => {
  describe('validateScript', () => {
    it('accepts a valid script', () => {
      const data: Script = {
        title: 'The Fall of Rome',
        topic: 'Roman Empire',
        segments: [
          { type: 'hook', text: 'Did you know...', estimatedDuration: 15, keywords: ['rome'] },
          { type: 'body', text: 'In the year...', estimatedDuration: 300, visualCue: 'Map of Rome', keywords: ['empire'] },
        ],
        estimatedTotalDuration: 315,
        targetWordCount: 787,
      };

      const result = validateScript(data);
      expect(result.title).toBe('The Fall of Rome');
      expect(result.segments).toHaveLength(2);
    });

    it('rejects script with empty segments', () => {
      const data = {
        title: 'Test',
        topic: 'Test',
        segments: [],
        estimatedTotalDuration: 0,
        targetWordCount: 0,
      };

      expect(() => validateScript(data)).toThrow();
    });

    it('rejects script with missing title', () => {
      const data = {
        topic: 'Test',
        segments: [{ type: 'hook', text: 'Hello', estimatedDuration: 10 }],
        estimatedTotalDuration: 10,
        targetWordCount: 25,
      };

      expect(() => validateScript(data)).toThrow();
    });

    it('rejects script with invalid segment type', () => {
      const data = {
        title: 'Test',
        topic: 'Test',
        segments: [{ type: 'invalid', text: 'Hello', estimatedDuration: 10 }],
        estimatedTotalDuration: 10,
        targetWordCount: 25,
      };

      expect(() => validateScript(data)).toThrow();
    });
  });

  describe('validateSegment', () => {
    it('accepts a valid segment', () => {
      const result = validateSegment({
        type: 'body',
        text: 'Historical content here',
        estimatedDuration: 120,
        visualCue: 'Painting of battle',
        keywords: ['battle', 'war'],
      });

      expect(result.type).toBe('body');
      expect(result.visualCue).toBe('Painting of battle');
      expect(result.keywords).toEqual(['battle', 'war']);
    });

    it('defaults keywords to empty array', () => {
      const result = validateSegment({
        type: 'hook',
        text: 'Hook text',
        estimatedDuration: 15,
      });

      expect(result.keywords).toEqual([]);
    });

    it('rejects segment with empty text', () => {
      expect(() =>
        validateSegment({ type: 'hook', text: '', estimatedDuration: 10 })
      ).toThrow();
    });

    it('rejects segment with negative duration', () => {
      expect(() =>
        validateSegment({ type: 'hook', text: 'Text', estimatedDuration: -5 })
      ).toThrow();
    });
  });

  describe('estimateDuration', () => {
    it('calculates duration from word count', () => {
      expect(estimateDuration(150)).toBe(60);
      expect(estimateDuration(75)).toBe(30);
      expect(estimateDuration(300)).toBe(120);
    });
  });

  describe('estimateWordCount', () => {
    it('calculates word count from duration', () => {
      expect(estimateWordCount(60)).toBe(WORDS_PER_MINUTE);
      expect(estimateWordCount(30)).toBe(75);
      expect(estimateWordCount(120)).toBe(300);
    });
  });
});
