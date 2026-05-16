import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

export interface CachedAsset {
  localPath: string;
  originalUrl: string;
}

export async function downloadAsset(url: string, filename?: string): Promise<CachedAsset> {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const hash = crypto.createHash('md5').update(url).digest('hex');
  const ext = path.extname(new URL(url).pathname) || '.jpg';
  const cachedName = filename || `${hash}${ext}`;
  const localPath = path.join(CACHE_DIR, cachedName);

  if (fs.existsSync(localPath)) {
    return { localPath, originalUrl: url };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(localPath, buffer);

  return { localPath, originalUrl: url };
}

export async function downloadAssets(
  urls: string[]
): Promise<CachedAsset[]> {
  const results: CachedAsset[] = [];

  for (const url of urls) {
    try {
      const asset = await downloadAsset(url);
      results.push(asset);
    } catch {
      // Skip failed downloads
    }
  }

  return results;
}

export function getCachedAsset(url: string): CachedAsset | null {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const cacheFiles = fs.existsSync(CACHE_DIR) ? fs.readdirSync(CACHE_DIR) : [];
  const matchingFile = cacheFiles.find((f) => f.startsWith(hash));

  if (matchingFile) {
    return { localPath: path.join(CACHE_DIR, matchingFile), originalUrl: url };
  }

  return null;
}
