export interface WikipediaTopic {
  title: string;
  summary: string;
  url: string;
  thumbnailUrl?: string;
  date?: string;
  source: 'wikipedia';
}

const BASE_URL = 'https://en.wikipedia.org';

export async function fetchRandomTopic(): Promise<WikipediaTopic> {
  const response = await fetch(`${BASE_URL}/api/rest_v1/page/random/summary`);
  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.status}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  const contentUrls = data.content_urls as Record<string, unknown> | undefined;
  const desktop = contentUrls?.desktop as Record<string, unknown> | undefined;
  const thumbnail = data.thumbnail as Record<string, unknown> | undefined;
  return {
    title: data.title as string,
    summary: data.extract as string,
    url: (desktop?.page as string) || '',
    thumbnailUrl: (thumbnail?.source as string) || undefined,
    source: 'wikipedia',
  };
}

export async function searchTopics(keyword: string, limit = 10): Promise<WikipediaTopic[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: keyword,
    srlimit: String(limit),
    format: 'json',
    origin: '*',
  });

  const response = await fetch(`${BASE_URL}/w/api.php?${params}`);
  if (!response.ok) {
    throw new Error(`Wikipedia search API error: ${response.status}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  const query = data.query as Record<string, unknown> | undefined;
  const results = (query?.search as unknown[]) || [];

  return (results as Record<string, unknown>[]).map((item) => ({
    title: item.title as string,
    summary: item.snippet as string,
    url: `${BASE_URL}/wiki/${encodeURIComponent(item.title as string)}`,
    source: 'wikipedia',
  }));
}

export async function fetchOnThisDay(month: number, day: number): Promise<WikipediaTopic[]> {
  const response = await fetch(`${BASE_URL}/api/rest_v1/feed/onthisday/events/${month}/${day}`);
  if (!response.ok) {
    throw new Error(`Wikipedia on-this-day API error: ${response.status}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  const events = (data.events as unknown[]) || [];

  return (events as Record<string, unknown>[]).map((event) => {
    const pages = (event.pages as unknown[]) || [];
    const firstPage = pages[0] as Record<string, unknown> | undefined;
    const normalizedTitle = firstPage?.normalizedtitle as string | undefined;
    const thumbnail = (firstPage?.thumbnail as Record<string, unknown>)?.source as string | undefined;
    return {
      title: event.text as string,
      summary: event.text as string,
      url: normalizedTitle
        ? `${BASE_URL}/wiki/${encodeURIComponent(normalizedTitle)}`
        : '',
      date: event.year ? String(event.year) : undefined,
      thumbnailUrl: thumbnail,
      source: 'wikipedia',
    };
  });
}
