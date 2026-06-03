import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { fetchRandomTopic, searchTopics as wikiSearch, fetchOnThisDay } from '../topics/wikipedia';
import { fetchTrendingTopics as redditTrendingFn, searchTopics as redditSearch } from '../topics/reddit';
import { scoreTopics } from '../topics/scorer';
import { enqueue } from '../queue';
import { info, warn, error } from '../utils/logger';
import { validateRequest } from '../middleware/validate';

const selectTopicSchema = z.object({
  topic: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).min(1).optional(),
}).refine((d) => d.topic || d.keywords, { message: 'topic or keywords is required' });

const router: Router = Router();

const recentTopics: string[] = [];

router.get('/api/topics', async (_req: Request, res: Response) => {
  try {
    info('Fetching topics from sources');
    const [wikiRandom, wikiOnThisDay, redditTrending] = await Promise.allSettled([
      fetchRandomTopic(),
      (() => {
        const now = new Date();
        return fetchOnThisDay(now.getMonth() + 1, now.getDate());
      })(),
      redditTrendingFn(15),
    ]);

    type WikiTopic = Awaited<ReturnType<typeof fetchRandomTopic>>;
    type WikiOnThisDayTopic = Awaited<ReturnType<typeof fetchOnThisDay>>[number];
    type RedditTopic = Awaited<ReturnType<typeof redditTrendingFn>>[number];

    const topics: (WikiTopic | WikiOnThisDayTopic | RedditTopic)[] = [];

    if (wikiRandom.status === 'fulfilled') topics.push(wikiRandom.value);
    else warn('Wikipedia random topic failed', { reason: wikiRandom.reason });
    if (wikiOnThisDay.status === 'fulfilled') topics.push(...wikiOnThisDay.value.slice(0, 5));
    else warn('Wikipedia on this day failed', { reason: wikiOnThisDay.reason });
    if (redditTrending.status === 'fulfilled') topics.push(...redditTrending.value);
    else warn('Reddit trending failed', { reason: redditTrending.reason });

    const scored = scoreTopics(topics, recentTopics);

    info('Topics fetched', { total: scored.length });
    res.json({ topics: scored });
  } catch (err) {
    error('Failed to fetch topics', { error: err instanceof Error ? err.message : 'unknown' });
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

router.get('/api/topics/search', async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    info('Searching topics', { query: q });
    const [wikiResults, redditResults] = await Promise.allSettled([
      wikiSearch(q, 10),
      redditSearch(q, 10),
    ]);

    const topics: (Awaited<ReturnType<typeof wikiSearch>>[number] | Awaited<ReturnType<typeof redditSearch>>[number])[] = [];

    if (wikiResults.status === 'fulfilled') topics.push(...wikiResults.value);
    else warn('Wikipedia search failed', { query: q, reason: wikiResults.reason });
    if (redditResults.status === 'fulfilled') topics.push(...redditResults.value);
    else warn('Reddit search failed', { query: q, reason: redditResults.reason });

    const scored = scoreTopics(topics, recentTopics);

    info('Topics search complete', { query: q, total: scored.length });
    res.json({ topics: scored });
  } catch (err) {
    error('Failed to search topics', { query: q, error: err instanceof Error ? err.message : 'unknown' });
    res.status(500).json({ error: 'Failed to search topics' });
  }
});

router.post('/api/topics/select', validateRequest(selectTopicSchema), (req: Request, res: Response) => {
  const { topic, keywords } = req.body;
  const topicValue = topic || (keywords as string[]).join(', ');
  const jobId = enqueue(topicValue);

  if (topic) {
    recentTopics.push(topic);
    if (recentTopics.length > 100) recentTopics.shift();
  }

  info('Topic selected', { jobId, topic: topicValue });
  res.status(201).json({ jobId, topic: topicValue });
});

export default router;
