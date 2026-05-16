import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { VideoRenderer } from '../../src/video/renderer';
import { Script } from '../../src/scripts/types';

const mockImageToVideo = vi.fn();
const mockCreateBlankVideo = vi.fn();
const mockConcatVideos = vi.fn();
const mockAddAudioToVideo = vi.fn();
const mockBurnSubtitles = vi.fn();

vi.mock('../../src/video/assembly', () => ({
  imageToVideo: (...args: unknown[]) => mockImageToVideo(...args),
  createBlankVideo: (...args: unknown[]) => mockCreateBlankVideo(...args),
  concatVideos: (...args: unknown[]) => mockConcatVideos(...args),
  addAudioToVideo: (...args: unknown[]) => mockAddAudioToVideo(...args),
  burnSubtitles: (...args: unknown[]) => mockBurnSubtitles(...args),
}));

describe('VideoRenderer', () => {
  let renderer: VideoRenderer;
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockImageToVideo.mockReset();
    mockCreateBlankVideo.mockReset();
    mockConcatVideos.mockReset();
    mockAddAudioToVideo.mockReset();
    mockBurnSubtitles.mockReset();

    mockImageToVideo.mockResolvedValue('/tmp/seg.mp4');
    mockCreateBlankVideo.mockResolvedValue('/tmp/blank.mp4');
    mockConcatVideos.mockResolvedValue('/tmp/concat.mp4');
    mockAddAudioToVideo.mockResolvedValue('/tmp/audio.mp4');
    mockBurnSubtitles.mockResolvedValue('/tmp/final.mp4');

    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const pathStr = p.toString();
      if (pathStr.includes('image.jpg')) return true;
      if (pathStr.includes('test-videos')) return false;
      return false;
    });

    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as never);
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined as never);

    renderer = new VideoRenderer({ outputDir: '/tmp/test-videos' });
  });

  afterEach(() => {
    existsSyncSpy.mockRestore();
    vi.restoreAllMocks();
  });

  function makeMockScript(): Script {
    return {
      title: 'Test',
      topic: 'Test',
      segments: [
        { type: 'hook', text: 'Hook text', estimatedDuration: 15, keywords: ['test'] },
        { type: 'body', text: 'Body text', estimatedDuration: 30, keywords: ['test'] },
      ],
      estimatedTotalDuration: 45,
      targetWordCount: 112,
    };
  }

  it('creates videos for each segment', async () => {
    const script = makeMockScript();
    const visualPlan = [
      { segment: script.segments[0], fallbackColor: '#1a1a2e' },
      { segment: script.segments[1], fallbackColor: '#16213e' },
    ];

    await renderer.render(script, '/tmp/audio.mp3', visualPlan);

    expect(mockCreateBlankVideo).toHaveBeenCalledTimes(2);
  });

  it('uses image when available', async () => {
    const script = makeMockScript();
    const visualPlan = [
      { segment: script.segments[0], imagePath: '/tmp/image.jpg', fallbackColor: '#1a1a2e' },
    ];

    await renderer.render(script, '/tmp/audio.mp3', visualPlan);

    expect(mockImageToVideo).toHaveBeenCalledWith('/tmp/image.jpg', 15, expect.any(String), expect.any(Object));
  });

  it('concatenates multiple segments', async () => {
    const script = makeMockScript();
    const visualPlan = script.segments.map((s) => ({ segment: s, fallbackColor: '#000' }));

    await renderer.render(script, '/tmp/audio.mp3', visualPlan);

    expect(mockConcatVideos).toHaveBeenCalled();
  });

  it('adds audio to video', async () => {
    const script = makeMockScript();
    const visualPlan = [{ segment: script.segments[0], fallbackColor: '#000' }];

    await renderer.render(script, '/tmp/audio.mp3', visualPlan);

    expect(mockAddAudioToVideo).toHaveBeenCalledWith(expect.any(String), '/tmp/audio.mp3', expect.any(String));
  });

  it('burns subtitles', async () => {
    const script = makeMockScript();
    const visualPlan = [{ segment: script.segments[0], fallbackColor: '#000' }];

    await renderer.render(script, '/tmp/audio.mp3', visualPlan);

    expect(mockBurnSubtitles).toHaveBeenCalled();
  });

  it('returns video path and metadata', async () => {
    const script = makeMockScript();
    const visualPlan = [{ segment: script.segments[0], fallbackColor: '#000' }];

    const result = await renderer.render(script, '/tmp/audio.mp3', visualPlan);

    expect(result.videoPath).toContain('final.mp4');
    expect(result.duration).toBe(45);
    expect(result.resolution).toBe('1920x1080');
  });
});
