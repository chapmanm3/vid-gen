import { describe, it, expect } from 'vitest';
import { matchVisuals, VisualPlan } from '../../src/visuals/matcher';
import { WikimediaImage } from '../../src/visuals/wikimedia';
import { PexelsVideo } from '../../src/visuals/pexels';
import { ScriptSegment } from '../../src/scripts/types';

describe('Visual Matcher', () => {
  const mockImages: WikimediaImage[] = [
    { title: 'File:Battle_of_Rome.jpg', url: 'https://example.com/rome.jpg', thumbnailUrl: '', width: 800, height: 600, license: 'PD' },
    { title: 'File:Ancient_Coliseum.jpg', url: 'https://example.com/coliseum.jpg', thumbnailUrl: '', width: 800, height: 600, license: 'PD' },
  ];

  const mockVideos: PexelsVideo[] = [
    { id: 1, title: 'ancient ruins', url: '', duration: 10, width: 1920, height: 1080, videoFiles: [], image: '' },
  ];

  const mockSegments: ScriptSegment[] = [
    { type: 'hook', text: 'Did you know...', estimatedDuration: 15, keywords: ['rome', 'battle'] },
    { type: 'body', text: 'The empire...', estimatedDuration: 60, keywords: ['coliseum', 'ancient'] },
    { type: 'conclusion', text: 'In conclusion...', estimatedDuration: 15, keywords: ['legacy'] },
  ];

  describe('matchVisuals', () => {
    it('matches segments to images by keywords', () => {
      const results = matchVisuals(mockSegments, mockImages, []);

      expect(results).toHaveLength(3);
      expect(results[0].image?.title).toContain('Rome');
      expect(results[1].image?.title).toContain('Coliseum');
    });

    it('falls back to first image when no keyword match', () => {
      const segments: ScriptSegment[] = [
        { type: 'hook', text: 'Test', estimatedDuration: 15, keywords: ['nonexistent'] },
      ];

      const results = matchVisuals(segments, mockImages, []);
      expect(results[0].image).toBe(mockImages[0]);
    });

    it('uses segment type as fallback keyword', () => {
      const segments: ScriptSegment[] = [
        { type: 'hook', text: 'Test', estimatedDuration: 15, keywords: [] },
      ];

      const results = matchVisuals(segments, mockImages, []);
      expect(results[0]).toBeDefined();
    });

    it('assigns fallback colors', () => {
      const results = matchVisuals(mockSegments, mockImages, []);

      expect(results[0].fallbackColor).toBeDefined();
      expect(results[1].fallbackColor).toBeDefined();
      expect(results[0].fallbackColor).not.toBe(results[1].fallbackColor);
    });

    it('matches videos when available', () => {
      const results = matchVisuals(mockSegments, mockImages, mockVideos);

      expect(results[1].video).toBeDefined();
    });

    it('handles empty image and video lists', () => {
      const results = matchVisuals(mockSegments, [], []);

      expect(results).toHaveLength(3);
      expect(results[0].image).toBeUndefined();
      expect(results[0].video).toBeUndefined();
      expect(results[0].fallbackColor).toBeDefined();
    });
  });
});
