import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { AnimatedCode } from '../components/AnimatedCode';
import { colors, fonts } from '../design/tokens';
import { chunkCaptionSegment, parseVtt } from '../utils/captions';
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
  subtitleContent?: string;
}

export const CodeScene: React.FC<CodeSceneProps> = ({
  code,
  language,
  title,
  filename,
  animations = [],
  format,
  narrationFallback,
  subtitleContent,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const charsPerSecond = format === 'shorts' ? 55 : 28;
  const codeLines = useMemo(() => code.split('\n'), [code]);
  const codeLineCount = codeLines.length;
  const sceneTime = frame / fps;

  const highlights = animations
    .filter((a) => a.type === 'highlightLine')
    .sort((a, b) => a.time - b.time);
  let metadataHighlightLine: number | undefined;
  for (let i = 0; i < highlights.length; i++) {
    const h = highlights[i];
    const next = highlights[i + 1];
    const holdUntil = next ? next.time : h.time + Math.max(h.duration || 0, 3);
    if (sceneTime >= h.time && sceneTime <= holdUntil) {
      const parsed = Number(h.value);
      if (!Number.isNaN(parsed)) metadataHighlightLine = parsed;
      break;
    }
  }

  const subtitleSegments = useMemo(() => {
    return parseVtt(subtitleContent || '').flatMap((s) => chunkCaptionSegment(s, 5));
  }, [subtitleContent]);
  const activeSubtitle = subtitleSegments.find((s) => sceneTime >= s.start && sceneTime <= s.end)?.text;
  const activeNarration = activeSubtitle || narrationChunkForTime(narrationFallback || '', sceneTime, durationInFrames / fps, 5);
  const visibleLineLimit = countVisibleLines(codeLines, sceneTime, charsPerSecond);
  const semanticHighlightLine = pickLineForNarration(activeNarration, codeLines, visibleLineLimit);
  const safeMetadataHighlightLine =
    metadataHighlightLine != null && metadataHighlightLine <= visibleLineLimit ? metadataHighlightLine : undefined;
  const highlightLine = activeNarration.trim() ? semanticHighlightLine : safeMetadataHighlightLine;

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

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from',
  'have', 'here', 'how', 'in', 'into', 'is', 'it', 'its', 'just', 'let',
  'like', 'look', 'new', 'not', 'now', 'of', 'on', 'or', 'our', 'the',
  'this', 'to', 'use', 'using', 'we', 'what', 'with', 'you', 'your',
]);

function narrationChunkForTime(narration: string, sceneTime: number, durationSeconds: number, maxWords: number): string {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  if (!words.length || durationSeconds <= 0) return '';

  const chunkCount = Math.max(1, Math.ceil(words.length / maxWords));
  const progress = Math.max(0, Math.min(0.999, sceneTime / durationSeconds));
  const chunkIndex = Math.min(chunkCount - 1, Math.floor(progress * chunkCount));
  return words.slice(chunkIndex * maxWords, (chunkIndex + 1) * maxWords).join(' ');
}

function countVisibleLines(lines: string[], sceneTime: number, charsPerSecond: number): number {
  const charsToShow = Math.max(0, Math.floor(sceneTime * charsPerSecond));
  let consumed = 0;

  for (let i = 0; i < lines.length; i++) {
    if (charsToShow <= consumed + lines[i].length) return Math.max(1, i + 1);
    consumed += lines[i].length + 1;
  }

  return lines.length;
}

function pickLineForNarration(text: string, lines: string[], visibleLineLimit: number): number | undefined {
  const terms = significantWords(text);
  if (!terms.size) return undefined;

  let bestLine: number | undefined;
  let bestScore = 0;
  const limit = Math.min(lines.length, Math.max(1, visibleLineLimit));

  for (let i = 0; i < limit; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const lineWords = new Set(wordsFrom(line));
    let score = 0;

    for (const term of terms) {
      if (lineWords.has(term)) score += 5;
      else if (term.length >= 4 && lower.includes(term)) score += 2;
    }

    score += conceptScore(terms, lower);

    const isImport = line.trimStart().startsWith('import');
    const importRelevant = terms.has('import') || terms.has('rxjs') || terms.has('interop') || terms.has('angular');
    if (isImport && !importRelevant) score -= 4;
    if (!isImport && score > 0) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestLine = i + 1;
    }
  }

  return bestScore >= 6 ? bestLine : undefined;
}

function significantWords(text: string): Set<string> {
  return new Set(wordsFrom(text).filter((word) => word.length > 2 && !STOP_WORDS.has(word)));
}

function wordsFrom(text: string): string[] {
  const identifiers = text.match(/[A-Za-z_$][\w$]*/g) || [];
  const camelSplit = text.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const plainWords = camelSplit.toLowerCase().split(/[^a-z0-9$]+/);
  const compactIdentifiers = identifiers.map((id) => id.toLowerCase());
  return [...plainWords, ...compactIdentifiers]
    .map((word) => word.replace(/^\$+|\$+$/g, ''))
    .filter(Boolean);
}

function conceptScore(terms: Set<string>, lowerLine: string): number {
  const hasAny = (values: string[]) => values.some((value) => terms.has(value));
  let score = 0;

  if (hasAny(['http', 'request', 'requests', 'api', 'backend'])) {
    if (lowerLine.includes('httpclient')) score += 8;
    if (lowerLine.includes('http')) score += 6;
    if (lowerLine.includes('.get') || lowerLine.includes('get<')) score += 5;
  }

  if (hasAny(['rxjs', 'interop'])) {
    if (lowerLine.includes('rxjs-interop')) score += 9;
    if (lowerLine.includes('rxjs')) score += 5;
  }

  if (hasAny(['tosignal', 'helper', 'convert', 'observables', 'observable'])) {
    if (lowerLine.includes('tosignal(')) score += 9;
    else if (lowerLine.includes('tosignal')) score += 6;
  }

  if (hasAny(['behaviorsubject', 'subject', 'stream', 'streams', 'observable', 'observables'])) {
    if (lowerLine.includes('behaviorsubject')) score += 9;
    if (lowerLine.includes('observable') || lowerLine.includes('pipe(')) score += 5;
  }

  if (hasAny(['computed', 'derived', 'derive', 'double'])) {
    if (lowerLine.includes('computed(')) score += 9;
    if (lowerLine.includes('map(') || lowerLine.includes('double')) score += 5;
  }

  if (hasAny(['increment', 'update', 'setter', 'writeable', 'writable'])) {
    if (lowerLine.includes('.update(') || lowerLine.includes('.next(') || lowerLine.includes('increment')) score += 8;
    if (lowerLine.includes('signal(')) score += 4;
  }

  if (hasAny(['effect', 'effects', 'logging', 'analytics', 'storage'])) {
    if (lowerLine.includes('effect(')) score += 9;
    if (lowerLine.includes('console.log') || lowerLine.includes('localstorage')) score += 5;
  }

  if (hasAny(['async', 'pipe', 'template', 'html'])) {
    if (lowerLine.includes('async') || lowerLine.includes('| async')) score += 8;
    if (lowerLine.includes('users()') || lowerLine.includes('{{')) score += 4;
  }

  return score;
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
