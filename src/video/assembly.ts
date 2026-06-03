import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export interface VideoSegment {
  imagePath?: string;
  videoPath?: string;
  duration: number;
  fallbackColor: string;
}

export interface VideoConfig {
  width: number;
  height: number;
  fps: number;
  outputDir: string;
}

const DEFAULT_CONFIG: VideoConfig = {
  width: 1920,
  height: 1080,
  fps: 30,
  outputDir: path.join(process.cwd(), 'data', 'videos'),
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

function createBlankFrame(width: number, height: number, color: string): string {
  const { r, g, b } = hexToRgb(color);
  const frameDir = path.join(process.cwd(), 'data', 'videos', '.tmp');
  if (!fs.existsSync(frameDir)) {
    fs.mkdirSync(frameDir, { recursive: true });
  }
  const framePath = path.join(frameDir, `blank-${width}x${height}-${color}.ppm`);
  if (fs.existsSync(framePath)) {
    return framePath;
  }
  const header = `P6\n${width} ${height}\n255\n`;
  const pixelCount = width * height;
  const pixels = Buffer.alloc(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    pixels[i * 3] = r;
    pixels[i * 3 + 1] = g;
    pixels[i * 3 + 2] = b;
  }
  fs.writeFileSync(framePath, header + pixels);
  return framePath;
}

export async function createBlankVideo(
  duration: number,
  color: string,
  outputPath: string,
  config: Partial<VideoConfig> = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  ensureOutputDir(outputPath);

  const framePath = createBlankFrame(finalConfig.width, finalConfig.height, color);

  return new Promise((resolve, reject) => {
    ffmpeg(framePath)
      .loop(duration)
      .fps(finalConfig.fps)
      .videoCodec('libx264')
      .outputOptions([
        '-vf', `scale=${finalConfig.width}:${finalConfig.height}`,
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-t', String(duration),
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function imageToVideo(
  imagePath: string,
  duration: number,
  outputPath: string,
  config: Partial<VideoConfig> = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  ensureOutputDir(outputPath);

  return new Promise((resolve, reject) => {
    ffmpeg(imagePath)
      .loop(duration)
      .fps(finalConfig.fps)
      .videoCodec('libx264')
      .outputOptions([
        '-vf', `scale=${finalConfig.width}:${finalConfig.height}:force_original_aspect_ratio=decrease,pad=${finalConfig.width}:${finalConfig.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-t', String(duration),
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function addAudioToVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<string> {
  ensureOutputDir(outputPath);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions(['-c:v', 'copy', '-c:a', 'aac', '-shortest'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function addBackgroundMusic(
  videoPath: string,
  musicPath: string,
  outputPath: string,
  musicVolume = 0.15
): Promise<string> {
  ensureOutputDir(outputPath);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(musicPath)
      .outputOptions([
        '-c:v', 'copy',
        '-filter_complex', `[1:a]volume=${musicVolume}[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=0`,
        '-c:a', 'aac',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function burnSubtitles(
  videoPath: string,
  srtPath: string,
  outputPath: string
): Promise<string> {
  ensureOutputDir(outputPath);

  const escapedSrtPath = srtPath.replace(/:/g, '\\:');

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf`, `subtitles=${escapedSrtPath}:force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Shadow=1'`,
        '-c:a', 'copy',
        '-preset', 'fast',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function concatVideos(
  inputPaths: string[],
  outputPath: string
): Promise<string> {
  ensureOutputDir(outputPath);

  const listFile = path.join(path.dirname(outputPath), 'concat-list.txt');
  const content = inputPaths.map((p) => `file '${path.resolve(p)}'`).join('\n');
  fs.writeFileSync(listFile, content);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputPath)
      .on('end', () => {
        fs.unlinkSync(listFile);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        try { fs.unlinkSync(listFile); } catch {}
        reject(err);
      })
      .run();
  });
}

function ensureOutputDir(outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
