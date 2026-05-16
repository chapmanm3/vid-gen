import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { downloadAsset, getCachedAsset } from '../../src/visuals/downloader';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Asset Downloader', () => {
  const testCacheDir = path.join(process.cwd(), 'data', 'test-cache');

  beforeEach(() => {
    mockFetch.mockReset();
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
    vi.resetModules();
  });

  afterEach(() => {
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
  });

  describe('downloadAsset', () => {
    it('downloads and caches an asset', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      const result = await downloadAsset('https://example.com/image.jpg');

      expect(fs.existsSync(result.localPath)).toBe(true);
      expect(fs.readFileSync(result.localPath)).toEqual(mockBuffer);
      expect(result.originalUrl).toBe('https://example.com/image.jpg');
    });

    it('returns cached path if already downloaded', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => Buffer.from('data'),
      });

      const first = await downloadAsset('https://example.com/cached.jpg');
      mockFetch.mockClear();

      const second = await downloadAsset('https://example.com/cached.jpg');

      expect(first.localPath).toBe(second.localPath);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws on download failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });
      await expect(downloadAsset('https://example.com/missing.jpg')).rejects.toThrow('Failed to download');
    });
  });

  describe('getCachedAsset', () => {
    it('returns null for uncached URL', async () => {
      const result = getCachedAsset('https://example.com/never-downloaded.jpg');
      expect(result).toBe(null);
    });
  });
});
