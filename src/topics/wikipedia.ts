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
  const data = await response.json();
  return {
    title: data.title,
    summary: data.extract,
    url: data.content_urls.desktop.page,
    thumbnailUrl: data.thumbnail?.source,
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
  const data = await response.json();
  const results = data.query?.search || [];

  return results.map((item: Record<string, unknown>) => ({
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
  const data = await response.json();
  const events = data.events || [];

  return events.map((event: Record<string, unknown>) => ({
    title: event.text as string,
    summary: event.text as string,
    url: event.pages?.[0]?.normalizedtitle
      ? `${BASE_URL}/wiki/${encodeURIComponent(event.pages[0].normalizedtitle as string)}`
      : '',
    date: event.year ? String(event.year) : undefined,
    thumbnailUrl: event.pages?.[0]?.thumbnail?.source,
    source: 'wikipedia',
  }));
}
