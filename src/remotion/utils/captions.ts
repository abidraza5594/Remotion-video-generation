export interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

export function parseVtt(content: string): CaptionSegment[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const segments: CaptionSegment[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    const tm = line.match(/^(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/);
    if (tm) {
      const start = (+tm[1]) * 3600 + (+tm[2]) * 60 + (+tm[3]) + (+tm[4]) / 1000;
      const end = (+tm[5]) * 3600 + (+tm[6]) * 60 + (+tm[7]) + (+tm[8]) / 1000;
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }
      const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();
      if (text) segments.push({ start, end, text });
    }
    i++;
  }

  return segments;
}

export function chunkCaptionSegment(segment: CaptionSegment, maxWords: number): CaptionSegment[] {
  const words = segment.text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [segment];

  const totalDuration = segment.end - segment.start;
  const chunks: CaptionSegment[] = [];
  const chunkCount = Math.ceil(words.length / maxWords);
  const chunkDuration = totalDuration / chunkCount;

  for (let c = 0; c < chunkCount; c++) {
    const chunkWords = words.slice(c * maxWords, (c + 1) * maxWords).join(' ');
    chunks.push({
      start: segment.start + c * chunkDuration,
      end: segment.start + (c + 1) * chunkDuration,
      text: chunkWords,
    });
  }

  return chunks;
}
