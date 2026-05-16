export interface WikimediaImage {
  title: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  license: string;
}

const WIKIMEDIA_API = 'https://en.wikipedia.org/w/api.php';

export async function searchImages(keyword: string, limit = 10): Promise<WikimediaImage[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${keyword} history`,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '800',
    format: 'json',
    origin: '*',
  });

  const response = await fetch(`${WIKIMEDIA_API}?${params}`);
  if (!response.ok) {
    throw new Error(`Wikimedia API error: ${response.status}`);
  }

  const data = await response.json();
  const pages = data.query?.pages || {};

  return Object.values(pages)
    .filter((page: Record<string, unknown>) => page.imageinfo && Array.isArray(page.imageinfo))
    .map((page: Record<string, unknown>) => {
      const info = (page.imageinfo as Record<string, unknown>[])[0];
      return {
        title: page.title as string,
        url: info.url as string,
        thumbnailUrl: (info.thumburl || info.url) as string,
        width: Number(info.width || 800),
        height: Number(info.height || 600),
        license: (info.extmetadata?.LicenseShortName?.value as string) || 'Unknown',
      };
    });
}

export async function getRandomImage(category = 'history', limit = 5): Promise<WikimediaImage[]> {
  const keywords = [
    'ancient', 'medieval', 'battle', 'empire', 'kingdom',
    'castle', 'war', 'revolution', 'civilization', 'archaeology',
  ];
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  return searchImages(randomKeyword, limit);
}
