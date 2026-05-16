export interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export function generateSRT(
  segments: { text: string; duration: number }[],
  startOffset = 0
): string {
  const entries: SubtitleEntry[] = [];
  let currentTime = startOffset;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const startTime = formatTime(currentTime);
    const endTime = formatTime(currentTime + segment.duration);

    entries.push({
      index: i + 1,
      startTime,
      endTime,
      text: segment.text,
    });

    currentTime += segment.duration;
  }

  return entries.map((e) => `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}\n`).join('\n');
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
