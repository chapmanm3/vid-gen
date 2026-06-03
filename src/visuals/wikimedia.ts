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

  const data = (await response.json()) as Record<string, unknown>;
  const query = data.query as Record<string, unknown> | undefined;
  const pages = (query?.pages as Record<string, Record<string, unknown>>) || {};

  const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp']);

  return Object.values(pages)
    .filter((page) => {
      if (!page.imageinfo || !Array.isArray(page.imageinfo)) return false;
      const info = (page.imageinfo as Record<string, unknown>[])[0];
      const url = (info.url as string) || '';
      const ext = '.' + url.split('.').pop()?.toLowerCase();
      return IMAGE_EXTENSIONS.has(ext);
    })
    .map((page) => {
      const info = (page.imageinfo as Record<string, unknown>[])[0];
      const extmetadata = (info.extmetadata as Record<string, unknown>) || {};
      const licenseObj = (extmetadata.LicenseShortName as Record<string, unknown>) || {};
      return {
        title: page.title as string,
        url: info.url as string,
        thumbnailUrl: (info.thumburl || info.url) as string,
        width: Number(info.width || 800),
        height: Number(info.height || 600),
        license: (licenseObj.value as string) || 'Unknown',
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
