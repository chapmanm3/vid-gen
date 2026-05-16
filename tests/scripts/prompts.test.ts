import { describe, it, expect } from 'vitest';
import { buildPrompt, buildFullScriptPrompt } from '../../src/scripts/prompts';

describe('Prompts', () => {
  describe('buildPrompt', () => {
    it('builds a hook prompt', () => {
      const result = buildPrompt({
        topic: 'Fall of Rome',
        segmentType: 'hook',
        targetWordCount: 40,
      });

      expect(result.system).toContain('YouTube scriptwriter');
      expect(result.user).toContain('Fall of Rome');
      expect(result.user).toContain('40');
      expect(result.user).toContain('gripping');
    });

    it('builds a body prompt with previous context', () => {
      const result = buildPrompt({
        topic: 'Fall of Rome',
        segmentType: 'body',
        targetWordCount: 200,
        previousSegments: ['Rome was founded in 753 BC', 'The Republic lasted 500 years'],
      });

      expect(result.user).toContain('Previous context');
      expect(result.user).toContain('753 BC');
    });

    it('builds prompts for all segment types', () => {
      const types = ['hook', 'intro', 'body', 'transition', 'conclusion', 'cta'] as const;

      for (const type of types) {
        const result = buildPrompt({
          topic: 'Test Topic',
          segmentType: type,
          targetWordCount: 100,
        });

        expect(result.system).toBeDefined();
        expect(result.user).toBeDefined();
        expect(result.user).toContain('Test Topic');
      }
    });

    it('throws for unknown segment type', () => {
      expect(() =>
        buildPrompt({
          topic: 'Test',
          segmentType: 'unknown' as never,
          targetWordCount: 100,
        })
      ).toThrow('Unknown segment type');
    });
  });

  describe('buildFullScriptPrompt', () => {
    it('builds a full script prompt', () => {
      const result = buildFullScriptPrompt('The Roman Empire', 8);

      expect(result.system).toContain('scriptwriter');
      expect(result.user).toContain('The Roman Empire');
      expect(result.user).toContain('8-minute');
      expect(result.user).toContain('1200');
      expect(result.user).toContain('480');
    });

    it('uses default 9 minutes when not specified', () => {
      const result = buildFullScriptPrompt('Test Topic');
      expect(result.user).toContain('9-minute');
    });

    it('includes all required segment types', () => {
      const result = buildFullScriptPrompt('Test Topic');
      expect(result.user).toContain('hook');
      expect(result.user).toContain('intro');
      expect(result.user).toContain('body');
      expect(result.user).toContain('transition');
      expect(result.user).toContain('conclusion');
      expect(result.user).toContain('cta');
    });
  });
});
