import { Router, Request, Response } from 'express';
import { searchImages } from '../visuals/wikimedia';
import { searchVideos } from '../visuals/pexels';
import { matchVisuals } from '../visuals/matcher';
import { downloadAssets } from '../visuals/downloader';
import { getJob, updateJobStatus } from '../db';
import { getConfig } from '../config';
import { info, warn, error } from '../utils/logger';

const router: Router = Router();

router.post('/api/visuals/generate', async (req: Request, res: Response) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  try {
    const job = getJob(jobId);
    if (!job || !job.script) {
      info('Visual generation skipped - no script', { jobId });
      return res.status(404).json({ error: 'Job not found or script not generated' });
    }

    const script = JSON.parse(job.script);
    const config = getConfig();

    const allKeywords = script.segments.flatMap((s: { keywords: string[] }) => s.keywords);
    const uniqueKeywords = [...new Set(allKeywords)] as string[];

    info('Searching for visuals', { jobId, keywords: uniqueKeywords.length });
    const [images, videos] = await Promise.allSettled([
      Promise.all((uniqueKeywords as string[]).map((kw: string) => searchImages(kw, 3))).then((results) => results.flat()),
      config.PEXELS_API_KEY
        ? Promise.all((uniqueKeywords as string[]).map((kw: string) => searchVideos(kw, config.PEXELS_API_KEY!, 2))).then((results) => results.flat())
        : Promise.resolve([]),
    ]);

    const imageList = images.status === 'fulfilled' ? images.value : [];
    const videoList = videos.status === 'fulfilled' ? videos.value : [];
    if (images.status === 'rejected') warn('Image search failed', { reason: images.reason });
    if (videos.status === 'rejected') warn('Video search failed', { reason: videos.reason });

    info('Visuals found', { jobId, images: imageList.length, videos: videoList.length });

    const visualPlan = matchVisuals(script.segments, imageList, videoList);

    const urlsToDownload = [
      ...visualPlan.filter((v) => v.image).map((v) => v.image!.url),
      ...visualPlan.filter((v) => v.video).map((v) => v.video!.videoFiles[0]?.link).filter(Boolean),
    ];

    info('Downloading assets', { jobId, count: urlsToDownload.length });
    const downloaded = await downloadAssets(urlsToDownload);

    const planWithPaths = visualPlan.map((vp) => ({
      segment: vp.segment,
      imagePath: vp.image
        ? downloaded.find((d) => d.originalUrl === vp.image!.url)?.localPath
        : undefined,
      videoPath: vp.video
        ? downloaded.find((d) => d.originalUrl === vp.video!.videoFiles[0]?.link)?.localPath
        : undefined,
      fallbackColor: vp.fallbackColor,
    }));

    updateJobStatus(jobId, 'processing');

    info('Visual generation complete', { jobId, images: imageList.length, videos: videoList.length });
    res.json({
      jobId,
      visualPlan: planWithPaths,
      imagesFound: imageList.length,
      videosFound: videoList.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error('Visual generation failed', { jobId, error: message });
    updateJobStatus(jobId, 'failed', { error: `Visual generation failed: ${message}` });
    res.status(500).json({ error: 'Visual generation failed', details: message });
  }
});

export default router;
