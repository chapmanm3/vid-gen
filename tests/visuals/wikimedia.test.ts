import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchImages, getRandomImage } from '../../src/visuals/wikimedia';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Wikimedia', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchImages', () => {
    it('returns images for a keyword', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              '123': {
                title: 'File:Battle_of_Hastings.jpg',
                imageinfo: [{
                  url: 'https://upload.wikimedia.org/battle.jpg',
                  thumburl: 'https://upload.wikimedia.org/thumb/battle.jpg',
                  width: 800,
                  height: 600,
                  extmetadata: { LicenseShortName: { value: 'Public Domain' } },
                }],
              },
            },
          },
        }),
      });

      const results = await searchImages('battle');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('File:Battle_of_Hastings.jpg');
      expect(results[0].url).toBe('https://upload.wikimedia.org/battle.jpg');
      expect(results[0].license).toBe('Public Domain');
    });

    it('returns empty array when no results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ query: { pages: {} } }),
      });

      const results = await searchImages('nonexistent');
      expect(results).toEqual([]);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 429 });
      await expect(searchImages('test')).rejects.toThrow('Wikimedia API error: 429');
    });
  });

  describe('getRandomImage', () => {
    it('returns images with random keyword', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              '1': {
                title: 'File:Ancient.jpg',
                imageinfo: [{ url: 'https://example.com/ancient.jpg', thumburl: 'https://example.com/ancient.jpg', width: 800, height: 600 }],
              },
            },
          },
        }),
      });

      const results = await getRandomImage();
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
