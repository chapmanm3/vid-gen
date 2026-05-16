export interface RedditTopic {
  title: string;
  summary: string;
  url: string;
  score: number;
  subreddit: string;
  numComments: number;
  source: 'reddit';
}

const REDDIT_BASE_URL = 'https://oauth.reddit.com';
const HISTORY_SUBREDDITS = ['History', 'UnresolvedMysteries', 'HistoryWhatIf', 'AskHistorians', 'todayilearned'];

export async function fetchTrendingTopics(limit = 20): Promise<RedditTopic[]> {
  const topics: RedditTopic[] = [];

  for (const subreddit of HISTORY_SUBREDDITS) {
    try {
      const results = await fetchSubredditHot(subreddit, Math.ceil(limit / HISTORY_SUBREDDITS.length));
      topics.push(...results);
    } catch {
      // Skip subreddits that fail
    }
  }

  return topics.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function fetchSubredditHot(subreddit: string, limit = 5): Promise<RedditTopic[]> {
  const response = await fetch(
    `${REDDIT_BASE_URL}/r/${subreddit}/hot?limit=${limit}`,
    {
      headers: {
        'User-Agent': 'youtube-video-generator/0.1.0',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Reddit API error for r/${subreddit}: ${response.status}`);
  }

  const data = await response.json();
  const posts = data.data?.children || [];

  return posts
    .filter((child: Record<string, Record<string, unknown>>) => !child.data.stickied)
    .map((child: Record<string, Record<string, unknown>>) => {
      const d = child.data;
      return {
        title: d.title as string,
        summary: (d.selftext as string)?.slice(0, 300) || '',
        url: `https://reddit.com${d.permalink as string}`,
        score: d.score as number,
        subreddit: subreddit,
        numComments: d.num_comments as number,
        source: 'reddit',
      };
    });
}

export async function searchTopics(keyword: string, limit = 10): Promise<RedditTopic[]> {
  const response = await fetch(
    `${REDDIT_BASE_URL}/search?q=${encodeURIComponent(keyword)}&type=link&sort=relevance&limit=${limit}&restrict_sr=0`,
    {
      headers: {
        'User-Agent': 'youtube-video-generator/0.1.0',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Reddit search API error: ${response.status}`);
  }

  const data = await response.json();
  const posts = data.data?.children || [];

  return posts.map((child: Record<string, Record<string, unknown>>) => {
    const d = child.data;
    return {
      title: d.title as string,
      summary: (d.selftext as string)?.slice(0, 300) || '',
      url: `https://reddit.com${d.permalink as string}`,
      score: d.score as number,
      subreddit: d.subreddit as string,
      numComments: d.num_comments as number,
      source: 'reddit',
    };
  });
}
