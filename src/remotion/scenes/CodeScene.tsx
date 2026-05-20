import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { AnimatedCode } from '../components/AnimatedCode';
import { colors, fonts } from '../design/tokens';
import type { AnimationEvent } from '../../types';

interface CodeSceneProps {
  code: string;
  language: string;
  title?: string;
  filename?: string;
  durationInFrames: number;
  animations?: AnimationEvent[];
  format: 'shorts' | 'long';
}

export const CodeScene: React.FC<CodeSceneProps> = ({
  code,
  language,
  title,
  filename,
  durationInFrames,
  animations = [],
  format,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const charsPerSecond = format === 'shorts' ? 40 : 22;

  const highlights = animations.filter((a) => a.type === 'highlightLine');
  let highlightLine: number | undefined;
  for (const h of highlights) {
    if (frame / fps >= h.time) {
      const parsed = Number(h.value);
      if (!Number.isNaN(parsed)) highlightLine = parsed;
    }
  }

  const zoomEvents = animations.filter((a) => a.type === 'zoomIn' || a.type === 'zoomOut');
  let scale = 1;
  for (const z of zoomEvents) {
    const startFrame = z.time * fps;
    const endFrame = startFrame + z.duration * fps;
    if (frame >= startFrame && frame <= endFrame) {
      const s = spring({ fps, frame: frame - startFrame, config: { damping: 20, stiffness: 80 }, durationInFrames: 18 });
      const targetScale = z.type === 'zoomIn' ? 1.12 : 0.95;
      scale = interpolate(s, [0, 1], [1, targetScale]);
    }
  }

  const titleOpacity = spring({ fps, frame, config: { damping: 20, stiffness: 100 }, durationInFrames: 14 });
  const editorWidth = format === 'shorts' ? width * 0.92 : width * 0.78;
  const fontSize = format === 'shorts' ? 26 : 24;

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="cinematic" />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: format === 'shorts' ? 40 : 80,
          gap: 30,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {title && (
          <h2
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: format === 'shorts' ? 48 : 56,
              color: colors.textPrimary,
              margin: 0,
              opacity: titleOpacity,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {title}
          </h2>
        )}
        <div style={{ width: editorWidth, maxHeight: height * 0.75 }}>
          <AnimatedCode
            code={code}
            language={language}
            filename={filename || `example.${language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'js'}`}
            highlightLine={highlightLine}
            charsPerSecond={charsPerSecond}
            fontSize={fontSize}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
