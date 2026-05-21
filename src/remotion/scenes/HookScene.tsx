import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { colors, fonts } from '../design/tokens';

interface HookSceneProps {
  title: string;
  subtitle?: string;
}

export const HookScene: React.FC<HookSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isShorts = width < height;

  const safeTop = isShorts ? 170 : 80;
  const safeBottom = isShorts ? 200 : 80;
  const safeX = isShorts ? Math.round(width * 0.06) : 100;

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const titleBlur = interpolate(frame, [0, 22], [22, 0], { extrapolateRight: 'clamp' });
  const subtitleSpring = spring({ fps, frame: frame - 14, config: { damping: 18, stiffness: 90 }, durationInFrames: 20 });
  const subY = interpolate(subtitleSpring, [0, 1], [40, 0]);
  const lineProgress = spring({ fps, frame: frame - 8, config: { damping: 20 }, durationInFrames: 25 });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 240]);
  const tagSpring = spring({ fps, frame: frame - 28, config: { damping: 16, stiffness: 100 }, durationInFrames: 20 });

  const titleSize = isShorts ? 116 : 132;
  const subSize = isShorts ? 38 : 36;

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="cinematic" />
      <DecorativeOrbits frame={frame} width={width} height={height} />

      <div
        style={{
          position: 'absolute',
          top: safeTop,
          bottom: safeBottom,
          left: safeX,
          right: safeX,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 999,
            background: 'rgba(0,212,255,0.12)',
            border: '1px solid rgba(0,212,255,0.4)',
            color: colors.accentPrimary,
            fontFamily: fonts.mono,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 28,
            opacity: tagSpring,
            transform: `translateY(${interpolate(tagSpring, [0, 1], [12, 0])}px)`,
          }}
        >
          ▸ Dev Tutorial
        </div>

        <div
          style={{
            width: lineWidth,
            height: 6,
            background: `linear-gradient(90deg, ${colors.accentPrimary}, ${colors.accentSecondary})`,
            borderRadius: 4,
            marginBottom: 32,
            boxShadow: `0 0 24px ${colors.accentPrimary}`,
          }}
        />

        <h1
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: titleSize,
            lineHeight: 0.98,
            letterSpacing: '-0.045em',
            color: colors.textPrimary,
            margin: 0,
            opacity: titleOpacity,
            filter: `blur(${titleBlur}px)`,
            textShadow: `0 4px 60px rgba(0,0,0,0.7), 0 0 80px rgba(0, 212, 255, 0.2)`,
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            style={{
              fontFamily: fonts.body,
              fontWeight: 500,
              fontSize: subSize,
              color: colors.textSecondary,
              margin: '36px 0 0',
              maxWidth: '90%',
              lineHeight: 1.4,
              opacity: subtitleSpring,
              transform: `translateY(${subY}px)`,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};

const DecorativeOrbits: React.FC<{ frame: number; width: number; height: number }> = ({ frame, width, height }) => {
  const opacity = interpolate(frame, [0, 25], [0, 0.7], { extrapolateRight: 'clamp' });
  const rotation = frame * 0.15;
  const cx = width / 2;
  const cy = height / 2;
  const r1 = Math.min(width, height) * 0.55;
  const r2 = Math.min(width, height) * 0.42;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="hook-orbit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.accentPrimary} stopOpacity={0.4} />
          <stop offset="100%" stopColor={colors.accentSecondary} stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy} rx={r1} ry={r1 * 0.4} fill="none" stroke="url(#hook-orbit)" strokeWidth={1.5} strokeDasharray="14 8" />
        <ellipse cx={cx} cy={cy} rx={r2} ry={r2 * 0.55} fill="none" stroke="url(#hook-orbit)" strokeWidth={1} strokeDasharray="6 6" />
      </g>
      <g transform={`rotate(${-rotation * 0.6} ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy} rx={r1 * 0.75} ry={r1 * 0.25} fill="none" stroke={colors.accentPrimary} strokeWidth={0.8} strokeOpacity={0.5} />
      </g>
    </svg>
  );
};
