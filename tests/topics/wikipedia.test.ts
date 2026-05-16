import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchRandomTopic, searchTopics, fetchOnThisDay } from '../../src/topics/wikipedia';

const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

describe('Wikipedia', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchRandomTopic', () => {
    it('returns a topic from random summary endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Battle of Hastings',
          extract: 'The Battle of Hastings was fought on 14 October 1066...',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Battle_of_Hastings' } },
          thumbnail: { source: 'https://example.com/thumb.jpg' },
        }),
      });

      const topic = await fetchRandomTopic();

      expect(topic.title).toBe('Battle of Hastings');
      expect(topic.summary).toBe('The Battle of Hastings was fought on 14 October 1066...');
      expect(topic.url).toBe('https://en.wikipedia.org/wiki/Battle_of_Hastings');
      expect(topic.thumbnailUrl).toBe('https://example.com/thumb.jpg');
      expect(topic.source).toBe('wikipedia');
    });

    it('handles missing thumbnail', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Some Topic',
          extract: 'A summary without image.',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Some_Topic' } },
        }),
      });

      const topic = await fetchRandomTopic();
      expect(topic.thumbnailUrl).toBe(undefined);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      await expect(fetchRandomTopic()).rejects.toThrow('Wikipedia API error: 500');
    });
  });

  describe('searchTopics', () => {
    it('returns search results for a keyword', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            search: [
              { title: 'Roman Empire', snippet: 'The Roman Empire was the post-Republican period...' },
              { title: 'Byzantine Empire', snippet: 'The Byzantine Empire was the continuation...' },
            ],
          },
        }),
      });

      const results = await searchTopics('roman');

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Roman Empire');
      expect(results[0].source).toBe('wikipedia');
      expect(results[1].title).toBe('Byzantine Empire');
    });

    it('returns empty array when no results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ query: { search: [] } }),
      });

      const results = await searchTopics('nonexistent123');
      expect(results).toEqual([]);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 429 });
      await expect(searchTopics('test')).rejects.toThrow('Wikipedia search API error: 429');
    });
  });

  describe('fetchOnThisDay', () => {
    it('returns historical events for a date', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [
            {
              text: 'Battle of Hastings: William the Conqueror defeats King Harold',
              year: 1066,
              pages: [{ normalizedtitle: 'Battle of Hastings', thumbnail: { source: 'https://example.com/battle.jpg' } }],
            },
            {
              text: 'First moon landing',
              year: 1969,
              pages: [{ normalizedtitle: 'Apollo 11' }],
            },
          ],
        }),
      });

      const results = await fetchOnThisDay(10, 14);

      expect(results).toHaveLength(2);
      expect(results[0].title).toContain('Battle of Hastings');
      expect(results[0].date).toBe('1066');
      expect(results[0].thumbnailUrl).toBe('https://example.com/battle.jpg');
      expect(results[1].title).toBe('First moon landing');
      expect(results[1].date).toBe('1969');
    });

    it('handles events without pages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [
            { text: 'Some event with no linked pages', year: 1800, pages: [] },
          ],
        }),
      });

      const results = await fetchOnThisDay(1, 1);
      expect(results[0].url).toBe('');
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });
      await expect(fetchOnThisDay(13, 32)).rejects.toThrow('Wikipedia on-this-day API error: 503');
    });
  });
});
