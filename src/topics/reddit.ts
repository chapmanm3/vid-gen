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
const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token';
const HISTORY_SUBREDDITS = ['History', 'UnresolvedMysteries', 'HistoryWhatIf', 'AskHistorians', 'todayilearned'];

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(REDDIT_AUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'youtube-video-generator/0.1.0',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.value;
}

async function authedFetch(url: string): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'User-Agent': 'youtube-video-generator/0.1.0',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { headers });
}

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
  const response = await authedFetch(
    `${REDDIT_BASE_URL}/r/${subreddit}/hot?limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Reddit API error for r/${subreddit}: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const posts = ((data.data as Record<string, unknown>)?.children as unknown[]) || [];

  return (posts as Record<string, unknown>[])
    .filter((child) => !(child.data as Record<string, unknown>)?.stickied)
    .map((child) => {
      const d = child.data as Record<string, unknown>;
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

export async function searchTopics(keyword: string, limit = 10): Promise<RedditTopic[]> {
  const response = await authedFetch(
    `${REDDIT_BASE_URL}/search?q=${encodeURIComponent(keyword)}&type=link&sort=relevance&limit=${limit}&restrict_sr=0`
  );

  if (!response.ok) {
    throw new Error(`Reddit search API error: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const posts = ((data.data as Record<string, unknown>)?.children as unknown[]) || [];

  return (posts as Record<string, unknown>[]).map((child) => {
    const d = child.data as Record<string, unknown>;
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
