export interface PexelsVideo {
  id: number;
  title: string;
  url: string;
  duration: number;
  width: number;
  height: number;
  videoFiles: PexelsVideoFile[];
  image: string;
}

export interface PexelsVideoFile {
  id: number;
  quality: string;
  fileType: string;
  width: number;
  height: number;
  link: string;
}

const PEXELS_API = 'https://api.pexels.com/videos';

export async function searchVideos(keyword: string, apiKey: string, limit = 5): Promise<PexelsVideo[]> {
  const params = new URLSearchParams({
    query: keyword,
    per_page: String(limit),
  });

  const response = await fetch(`${PEXELS_API}/search?${params}`, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const videos = (data.videos as unknown[]) || [];

  return (videos as Record<string, unknown>[]).map((video) => ({
    id: video.id as number,
    title: (video.url as string).split('/').pop()?.replace(/-/g, ' ').replace('.mp4', '') || '',
    url: video.url as string,
    duration: video.duration as number,
    width: video.width as number,
    height: video.height as number,
    videoFiles: (((video.video_files as unknown[]) || []) as Record<string, unknown>[]).map((file) => ({
      id: file.id as number,
      quality: file.quality as string,
      fileType: file.file_type as string,
      width: file.width as number,
      height: file.height as number,
      link: file.link as string,
    })),
    image: video.image as string,
  }));
}
