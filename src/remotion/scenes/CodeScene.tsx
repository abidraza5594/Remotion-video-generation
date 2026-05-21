import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { AnimatedCode } from '../components/AnimatedCode';
import { SceneCursor } from '../components/SceneCursor';
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
  narrationFallback?: string;
}

export const CodeScene: React.FC<CodeSceneProps> = ({
  code,
  language,
  title,
  filename,
  animations = [],
  format,
  narrationFallback,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const charsPerSecond = format === 'shorts' ? 55 : 28;
  const codeLineCount = code.split('\n').length;

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
      const targetScale = z.type === 'zoomIn' ? 1.06 : 0.97;
      scale = interpolate(s, [0, 1], [1, targetScale]);
    }
  }

  const titleOpacity = spring({ fps, frame, config: { damping: 20, stiffness: 100 }, durationInFrames: 14 });

  const isShorts = format === 'shorts';
  const safeTop = isShorts ? 170 : 80;
  const safeBottom = isShorts ? 200 : 80;
  const safeX = isShorts ? Math.round(width * 0.03) : 80;

  const editorWidth = width - safeX * 2;
  const fontSize = isShorts ? 32 : 26;
  const titleSize = isShorts ? 60 : 64;
  const lineHeight = fontSize * 1.6;

  const headerHeight = 56;
  const editorPaddingTop = 20;
  const editorPaddingBottom = 20;
  const editorContentHeight = codeLineCount * lineHeight;
  const editorHeight = headerHeight + editorPaddingTop + editorContentHeight + editorPaddingBottom;

  const titleBlock = title ? titleSize * 1.2 + 28 : 0;

  const summarySnippet = narrationFallback ? summariseNarration(narrationFallback) : null;
  const summaryBlock = summarySnippet ? (isShorts ? 130 : 90) : 0;

  const availableHeight = height - safeTop - safeBottom - titleBlock - summaryBlock;
  const editorTop = safeTop + titleBlock + Math.max(0, (availableHeight - editorHeight) / 2);

  let cursorX: number | null = null;
  let cursorY: number | null = null;
  if (highlightLine != null && highlightLine > 0 && highlightLine <= codeLineCount) {
    const editorLeft = safeX;
    cursorX = editorLeft + 100;
    cursorY = editorTop + headerHeight + editorPaddingTop + (highlightLine - 0.5) * lineHeight;
  }

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="cinematic" />

      {title && (
        <h2
          style={{
            position: 'absolute',
            top: safeTop,
            left: safeX,
            right: safeX,
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: titleSize,
            color: colors.textPrimary,
            margin: 0,
            opacity: titleOpacity,
            letterSpacing: '-0.025em',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          position: 'absolute',
          top: editorTop,
          left: safeX,
          width: editorWidth,
          transform: `scale(${scale})`,
          transformOrigin: 'center top',
        }}
      >
        <AnimatedCode
          code={code}
          language={language}
          filename={filename || `example.${language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'js'}`}
          highlightLine={highlightLine}
          charsPerSecond={charsPerSecond}
          fontSize={fontSize}
        />
      </div>

      {summarySnippet && (
        <SummaryPill text={summarySnippet} frame={frame} fps={fps} isShorts={isShorts}
          bottom={safeBottom + 12} safeX={safeX} />
      )}

      {cursorX != null && cursorY != null && (
        <SceneCursor x={cursorX} y={cursorY} size={isShorts ? 58 : 48} />
      )}
    </AbsoluteFill>
  );
};

function summariseNarration(narration: string): string | null {
  const text = narration.trim();
  if (!text) return null;
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0];
  if (firstSentence.length <= 110) return firstSentence;
  return firstSentence.slice(0, 107).trim() + '…';
}

const SummaryPill: React.FC<{ text: string; frame: number; fps: number; isShorts: boolean; bottom: number; safeX: number }> = ({
  text, frame, fps, isShorts, bottom, safeX,
}) => {
  const enter = spring({ fps, frame: frame - 10, config: { damping: 20 }, durationInFrames: 22 });
  return (
    <div
      style={{
        position: 'absolute',
        left: safeX,
        right: safeX,
        bottom,
        display: 'flex',
        justifyContent: 'center',
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [16, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: isShorts ? 28 : 22,
          color: colors.textPrimary,
          background: 'rgba(0,212,255,0.10)',
          border: `1.5px solid rgba(0,212,255,0.4)`,
          padding: '14px 24px',
          borderRadius: 14,
          lineHeight: 1.35,
          textAlign: 'center',
          maxWidth: '92%',
          backdropFilter: 'blur(8px)',
        }}
      >
        {text}
      </div>
    </div>
  );
};
