import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { colors, fonts } from '../design/tokens';

interface CaptionBarProps {
  vttContent: string;
  sceneStartFrame: number;
  maxWordsPerSegment?: number;
}

interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

function parseVtt(content: string): CaptionSegment[] {
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

function chunkSegment(segment: CaptionSegment, maxWords: number): CaptionSegment[] {
  const words = segment.text.split(/\s+/);
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

export const CaptionBar: React.FC<CaptionBarProps> = ({ vttContent, sceneStartFrame, maxWordsPerSegment = 5 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const segments = useMemo(() => {
    const parsed = parseVtt(vttContent);
    return parsed.flatMap((s) => chunkSegment(s, maxWordsPerSegment));
  }, [vttContent, maxWordsPerSegment]);

  const sceneFrame = frame - sceneStartFrame;
  const currentTime = sceneFrame / fps;
  const current = segments.find((s) => currentTime >= s.start && currentTime <= s.end);
  if (!current) return null;

  const words = current.text.split(/\s+/);
  const segDuration = current.end - current.start;
  const localProgress = (currentTime - current.start) / Math.max(0.001, segDuration);
  const wordCount = words.length;

  const fontSize = Math.min(64, Math.max(40, Math.floor(width * 0.045)));

  return (
    <div
      style={{
        position: 'absolute',
        bottom: height * 0.12,
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12,
          padding: '14px 28px',
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(8px)',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '88%',
          fontFamily: fonts.display,
          fontWeight: 900,
          color: colors.textPrimary,
          fontSize,
          letterSpacing: '-0.02em',
          textShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        {words.map((word, i) => {
          const wordPhase = i / wordCount;
          const trigger = wordPhase * 0.7;
          const localFrame = (currentTime - current.start - trigger * segDuration) * fps;
          const s = spring({
            fps,
            frame: Math.max(0, localFrame),
            config: { damping: 12, stiffness: 180 },
            durationInFrames: 10,
          });
          return (
            <span
              key={i}
              style={{
                opacity: s,
                transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
                display: 'inline-block',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
