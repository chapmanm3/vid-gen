import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchVideos } from '../../src/visuals/pexels';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Pexels', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchVideos', () => {
    it('returns videos for a keyword', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          videos: [
            {
              id: 123,
              url: 'https://www.pexels.com/video/ancient-rome-123/',
              duration: 15,
              width: 1920,
              height: 1080,
              image: 'https://images.pexels.com/videos/123/image.jpg',
              video_files: [
                { id: 1, quality: 'hd', file_type: 'video/mp4', width: 1920, height: 1080, link: 'https://videos.pexels.com/123.mp4' },
              ],
            },
          ],
        }),
      });

      const results = await searchVideos('ancient rome', 'test-api-key');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(123);
      expect(results[0].duration).toBe(15);
      expect(results[0].videoFiles).toHaveLength(1);
      expect(results[0].videoFiles[0].link).toBe('https://videos.pexels.com/123.mp4');
    });

    it('returns empty array when no results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ videos: [] }),
      });

      const results = await searchVideos('nonexistent', 'test-api-key');
      expect(results).toEqual([]);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });
      await expect(searchVideos('test', 'invalid-key')).rejects.toThrow('Pexels API error: 401');
    });
  });
});
