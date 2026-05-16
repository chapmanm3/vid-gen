import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchTrendingTopics, searchTopics } from '../../src/topics/reddit';

const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

function mockPost(title: string, score: number, subreddit: string, comments = 50): Record<string, unknown> {
  return {
    kind: 't3',
    data: {
      title,
      score,
      subreddit,
      num_comments: comments,
      permalink: `/r/${subreddit}/comments/abc/${title.toLowerCase().replace(/\s/g, '_')}`,
      selftext: `A detailed post about ${title}`,
      stickied: false,
    },
  };
}

describe('Reddit', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTrendingTopics', () => {
    it('returns sorted topics by score', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            children: [
              mockPost('Low score topic', 10, 'History'),
              mockPost('High score topic', 500, 'History'),
              mockPost('Medium score topic', 100, 'History'),
            ],
          },
        }),
      };

      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const results = await fetchTrendingTopics(3);

      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
    });

    it('filters out stickied posts', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            children: [
              { kind: 't3', data: { title: 'Stickied', score: 999, stickied: true, subreddit: 'History', num_comments: 0, permalink: '/r/History/comments/abc/stickied', selftext: '' } },
              mockPost('Real topic', 50, 'History'),
            ],
          },
        }),
      });

      const results = await fetchTrendingTopics(5);
      expect(results.every((t) => t.title !== 'Stickied')).toBe(true);
    });

    it('returns correct topic structure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            children: [mockPost('Test topic', 75, 'History', 30)],
          },
        }),
      });

      const results = await fetchTrendingTopics(1);
      const topic = results[0];

      expect(topic.title).toBe('Test topic');
      expect(topic.score).toBe(75);
      expect(topic.subreddit).toBe('History');
      expect(topic.numComments).toBe(30);
      expect(topic.source).toBe('reddit');
      expect(topic.url).toContain('reddit.com');
    });

    it('handles subreddit fetch failures gracefully', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const results = await fetchTrendingTopics(5);
      expect(results).toEqual([]);
    });
  });

  describe('searchTopics', () => {
    it('returns search results for a keyword', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            children: [
              mockPost('Ancient Rome', 200, 'History'),
              mockPost('Roman Engineering', 150, 'AskHistorians'),
            ],
          },
        }),
      });

      const results = await searchTopics('rome');

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Ancient Rome');
      expect(results[1].subreddit).toBe('AskHistorians');
    });

    it('returns empty array when no results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { children: [] } }),
      });

      const results = await searchTopics('nonexistent123');
      expect(results).toEqual([]);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 429 });
      await expect(searchTopics('test')).rejects.toThrow('Reddit search API error: 429');
    });
  });
});
