import { ScriptSegment } from '../scripts/types';
import { WikimediaImage } from './wikimedia';
import { PexelsVideo } from './pexels';

export interface VisualPlan {
  segment: ScriptSegment;
  image?: WikimediaImage;
  video?: PexelsVideo;
  fallbackColor: string;
}

const FALLBACK_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#2c3e50', '#34495e', '#1b2631', '#212f3d',
];

export function matchVisuals(
  segments: ScriptSegment[],
  images: WikimediaImage[],
  videos: PexelsVideo[]
): VisualPlan[] {
  return segments.map((segment, index) => {
    const keywords = segment.keywords.length > 0 ? segment.keywords : [segment.type];
    const matchedImage = findBestMatch(keywords, images);
    const matchedVideo = findBestVideoMatch(keywords, videos);

    return {
      segment,
      image: matchedImage,
      video: matchedVideo,
      fallbackColor: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    };
  });
}

function findBestMatch(keywords: string[], images: WikimediaImage[]): WikimediaImage | undefined {
  for (const keyword of keywords) {
    const found = images.find((img) =>
      img.title.toLowerCase().includes(keyword.toLowerCase())
    );
    if (found) return found;
  }
  return images[0];
}

function findBestVideoMatch(keywords: string[], videos: PexelsVideo[]): PexelsVideo | undefined {
  for (const keyword of keywords) {
    const found = videos.find((v) =>
      v.title.toLowerCase().includes(keyword.toLowerCase())
    );
    if (found) return found;
  }
  return videos[0];
}
