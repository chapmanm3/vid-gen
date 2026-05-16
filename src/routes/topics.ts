import { Router, Request, Response } from 'express';
import { fetchRandomTopic, searchTopics as wikiSearch, fetchOnThisDay } from '../topics/wikipedia';
import { fetchTrendingTopics as redditTrending, searchTopics as redditSearch } from '../topics/reddit';
import { scoreTopics } from '../topics/scorer';
import { enqueue } from '../queue';

const router = Router();

const recentTopics: string[] = [];

router.get('/api/topics', async (_req: Request, res: Response) => {
  try {
    const [wikiRandom, wikiOnThisDay, redditTrending] = await Promise.allSettled([
      fetchRandomTopic(),
      (() => {
        const now = new Date();
        return fetchOnThisDay(now.getMonth() + 1, now.getDate());
      })(),
      redditTrending(15),
    ]);

    const topics: (Awaited<ReturnType<typeof fetchRandomTopic>> | Awaited<ReturnType<typeof fetchOnThisDay>>[number] | Awaited<ReturnType<typeof redditTrending>>[number])[] = [];

    if (wikiRandom.status === 'fulfilled') topics.push(wikiRandom.value);
    if (wikiOnThisDay.status === 'fulfilled') topics.push(...wikiOnThisDay.value.slice(0, 5));
    if (redditTrending.status === 'fulfilled') topics.push(...redditTrending.value);

    const scored = scoreTopics(topics, recentTopics);

    res.json({ topics: scored });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

router.get('/api/topics/search', async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const [wikiResults, redditResults] = await Promise.allSettled([
      wikiSearch(q, 10),
      redditSearch(q, 10),
    ]);

    const topics: (Awaited<ReturnType<typeof wikiSearch>>[number] | Awaited<ReturnType<typeof redditSearch>>[number])[] = [];

    if (wikiResults.status === 'fulfilled') topics.push(...wikiResults.value);
    if (redditResults.status === 'fulfilled') topics.push(...redditResults.value);

    const scored = scoreTopics(topics, recentTopics);

    res.json({ topics: scored });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search topics' });
  }
});

router.post('/api/topics/select', (req: Request, res: Response) => {
  const { topic, keywords } = req.body;

  if (!topic && !keywords) {
    return res.status(400).json({ error: 'topic or keywords is required' });
  }

  const topicValue = topic || keywords?.join(', ');
  const jobId = enqueue(topicValue);

  if (topic) {
    recentTopics.push(topic);
    if (recentTopics.length > 100) recentTopics.shift();
  }

  res.status(201).json({ jobId, topic: topicValue });
});

export default router;
