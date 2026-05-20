import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import { colors, fonts, syntax, radii, shadows } from '../design/tokens';
import { SPRING_SNAPPY } from '../design/animations';

interface AnimatedCodeProps {
  code: string;
  language: string;
  filename?: string;
  highlightLine?: number;
  charsPerSecond?: number;
  fontSize?: number;
  width?: number | string;
  height?: number | string;
}

interface TokenSpan { text: string; color: string; }

function colorForToken(type: string | undefined): string {
  if (!type) return syntax.default;
  if (type.includes('keyword')) return syntax.keyword;
  if (type.includes('string')) return syntax.string;
  if (type.includes('function')) return syntax.function;
  if (type.includes('comment')) return syntax.comment;
  if (type.includes('number') || type.includes('boolean')) return syntax.number;
  if (type.includes('operator')) return syntax.operator;
  if (type.includes('class-name')) return syntax.className;
  if (type.includes('property') || type.includes('parameter')) return syntax.property;
  if (type.includes('punctuation')) return syntax.punctuation;
  if (type.includes('variable') || type.includes('attr')) return syntax.variable;
  return syntax.default;
}

function tokenize(code: string, language: string): TokenSpan[][] {
  const grammar = Prism.languages[language] || Prism.languages.javascript;
  const tokens = Prism.tokenize(code, grammar);
  const lines: TokenSpan[][] = [[]];

  const pushText = (text: string, color: string) => {
    const parts = text.split('\n');
    parts.forEach((part, idx) => {
      if (part.length) lines[lines.length - 1].push({ text: part, color });
      if (idx < parts.length - 1) lines.push([]);
    });
  };

  const walk = (token: Prism.Token | string, parentType?: string) => {
    if (typeof token === 'string') {
      pushText(token, colorForToken(parentType));
      return;
    }
    const type = token.type || parentType;
    if (Array.isArray(token.content)) {
      token.content.forEach((c) => walk(c as Prism.Token | string, type));
    } else if (typeof token.content === 'string') {
      pushText(token.content, colorForToken(type));
    } else {
      walk(token.content as Prism.Token | string, type);
    }
  };

  tokens.forEach((t) => walk(t as Prism.Token | string));
  return lines;
}

export const AnimatedCode: React.FC<AnimatedCodeProps> = ({
  code,
  language,
  filename = 'index.ts',
  highlightLine,
  charsPerSecond = 30,
  fontSize = 22,
  width = '100%',
  height = 'auto',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = useMemo(() => tokenize(code, language), [code, language]);

  const totalChars = lines.reduce((sum, ln) => sum + ln.reduce((s, t) => s + t.text.length, 0) + 1, 0);
  const charsToShow = Math.min(totalChars, Math.floor((frame / fps) * charsPerSecond));

  const visibleLines: TokenSpan[][] = [];
  let consumed = 0;
  for (const line of lines) {
    if (consumed >= charsToShow) break;
    const lineLen = line.reduce((s, t) => s + t.text.length, 0);
    if (consumed + lineLen <= charsToShow) {
      visibleLines.push(line);
      consumed += lineLen + 1;
    } else {
      const partial: TokenSpan[] = [];
      let remaining = charsToShow - consumed;
      for (const tok of line) {
        if (remaining <= 0) break;
        if (tok.text.length <= remaining) {
          partial.push(tok);
          remaining -= tok.text.length;
        } else {
          partial.push({ text: tok.text.slice(0, remaining), color: tok.color });
          remaining = 0;
        }
      }
      visibleLines.push(partial);
      consumed = charsToShow;
    }
  }

  const cursorVisible = Math.floor(frame / (fps / 2)) % 2 === 0;
  const fadeIn = spring({ fps, frame, config: SPRING_SNAPPY, durationInFrames: 12 });

  const lineHeight = fontSize * 1.6;
  const highlightOffset = highlightLine != null
    ? spring({ fps, frame, config: SPRING_SNAPPY, durationInFrames: 18 }) * ((highlightLine - 1) * lineHeight + 56)
    : -9999;

  return (
    <div
      style={{
        width,
        height,
        background: colors.surface,
        borderRadius: radii.md,
        boxShadow: shadows.panel,
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
        opacity: fadeIn,
        transform: `translateY(${interpolate(fadeIn, [0, 1], [12, 0])}px)`,
        fontFamily: fonts.mono,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.35)',
          borderBottom: `1px solid ${colors.border}`,
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F56' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27C93F' }} />
        <div
          style={{
            marginLeft: 16,
            padding: '4px 12px',
            background: colors.surfaceElevated,
            borderRadius: 6,
            color: colors.textSecondary,
            fontSize: 14,
            fontFamily: fonts.mono,
          }}
        >
          {filename}
        </div>
      </div>

      <div style={{ padding: '20px 0', position: 'relative' }}>
        {highlightLine != null && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: highlightOffset,
              height: lineHeight,
              background: `linear-gradient(90deg, rgba(255,215,0,0.18), rgba(255,215,0,0.06) 80%, transparent)`,
              boxShadow: '0 0 16px rgba(255,215,0,0.25)',
              borderLeft: `3px solid ${colors.codeHighlight}`,
            }}
          />
        )}

        {visibleLines.map((line, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              fontSize,
              lineHeight: `${lineHeight}px`,
              position: 'relative',
              paddingLeft: 16,
              paddingRight: 24,
            }}
          >
            <div
              style={{
                width: 48,
                color: colors.textMuted,
                userSelect: 'none',
                fontSize: fontSize * 0.85,
                opacity: 0.5,
                fontFamily: fonts.mono,
                textAlign: 'right',
                paddingRight: 16,
              }}
            >
              {idx + 1}
            </div>
            <div style={{ flex: 1, whiteSpace: 'pre' }}>
              {line.map((tok, i) => (
                <span key={i} style={{ color: tok.color }}>{tok.text}</span>
              ))}
              {idx === visibleLines.length - 1 && charsToShow < totalChars && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 2,
                    height: fontSize,
                    background: colors.textPrimary,
                    marginLeft: 2,
                    verticalAlign: 'text-bottom',
                    opacity: cursorVisible ? 1 : 0,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
