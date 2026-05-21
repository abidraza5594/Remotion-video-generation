import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { SceneCursor } from '../components/SceneCursor';
import { colors, fonts, radii } from '../design/tokens';

interface ExplanationSceneProps {
  title?: string;
  points: string[];
  format: 'shorts' | 'long';
}

export const ExplanationScene: React.FC<ExplanationSceneProps> = ({ title, points, format }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isVertical = format === 'shorts';
  const safeTop = isVertical ? 170 : 80;
  const safeBottom = isVertical ? 200 : 80;
  const safeX = isVertical ? Math.round(width * 0.06) : 100;

  const titleSpring = spring({ fps, frame, config: { damping: 20, stiffness: 90 }, durationInFrames: 16 });
  const titleSize = isVertical ? 68 : 76;
  const pointSize = isVertical ? 40 : 32;

  const filteredPoints = points.filter((p) => p && p.trim().length > 0).slice(0, isVertical ? 4 : 5);

  const itemBaseGap = 16;
  const itemPadding = isVertical ? 22 : 18;
  const lineHeight = 1.35;
  const itemHeight = pointSize * lineHeight * 2 + itemPadding * 2 + itemBaseGap;

  let activeBulletIdx = -1;
  for (let i = 0; i < filteredPoints.length; i++) {
    const delay = 14 + i * 16;
    if (frame >= delay) activeBulletIdx = i;
  }

  const diagramSize = isVertical ? Math.min(width * 0.42, 420) : Math.min(width * 0.3, 460);
  const usableHeight = height - safeTop - safeBottom;
  const titleHeight = title ? titleSize * 1.15 + 32 : 0;
  const diagramHeight = diagramSize;
  const listTop = safeTop + titleHeight + diagramHeight + 40;

  const cursorVisible = activeBulletIdx >= 0;
  const cursorX = safeX + 28;
  const cursorY = listTop + (activeBulletIdx + 0.5) * itemHeight;

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="soft" />

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
            letterSpacing: '-0.035em',
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
            lineHeight: 1.05,
            textAlign: 'center',
          }}
        >
          {title}
        </h2>
      )}

      <div
        style={{
          position: 'absolute',
          top: safeTop + titleHeight,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: diagramSize,
        }}
      >
        <DiagramVisual frame={frame} fps={fps} size={diagramSize} />
      </div>

      <ul
        style={{
          position: 'absolute',
          top: listTop,
          left: safeX,
          right: safeX,
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: itemBaseGap,
          maxHeight: usableHeight - titleHeight - diagramHeight - 40,
          overflow: 'hidden',
        }}
      >
        {filteredPoints.map((point, idx) => {
          const delay = 14 + idx * 16;
          const s = spring({ fps, frame: frame - delay, config: { damping: 18, stiffness: 100 }, durationInFrames: 22 });
          const isActive = idx === activeBulletIdx;
          return (
            <li
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 18,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                background: isActive ? 'rgba(0,212,255,0.10)' : 'rgba(255,255,255,0.04)',
                padding: `${itemPadding}px 26px`,
                borderRadius: radii.md,
                border: `1.5px solid ${isActive ? 'rgba(0,212,255,0.5)' : colors.border}`,
                boxShadow: isActive ? `0 0 30px rgba(0,212,255,0.3)` : 'none',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  marginTop: pointSize * 0.35,
                  borderRadius: '50%',
                  background: colors.accentPrimary,
                  boxShadow: `0 0 14px ${colors.accentPrimary}`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: pointSize,
                  color: colors.textPrimary,
                  lineHeight,
                  fontWeight: 500,
                }}
              >
                {point}
              </span>
            </li>
          );
        })}
      </ul>

      {cursorVisible && <SceneCursor x={cursorX} y={cursorY} size={isVertical ? 48 : 44} />}
    </AbsoluteFill>
  );
};

const DiagramVisual: React.FC<{ frame: number; fps: number; size: number }> = ({ frame, fps, size }) => {
  const drawProgress = spring({ fps, frame, config: { damping: 25, stiffness: 60 }, durationInFrames: 60 });
  const pulse = (Math.sin(frame * 0.08) + 1) / 2;
  const rotation = frame * 0.3;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <linearGradient id="diag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.accentPrimary} />
            <stop offset="100%" stopColor={colors.accentSecondary} />
          </linearGradient>
          <radialGradient id="diag-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accentPrimary} stopOpacity={1} />
            <stop offset="100%" stopColor={colors.accentSecondary} stopOpacity={0.5} />
          </radialGradient>
          <filter id="diag-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`rotate(${rotation} 100 100)`}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="url(#diag-grad)" strokeWidth="2.5"
            strokeDasharray="553" strokeDashoffset={553 - 553 * drawProgress} opacity={0.85} />
          <circle cx="100" cy="100" r="65" fill="none" stroke={colors.accentPrimary} strokeWidth="2"
            strokeDasharray="408" strokeDashoffset={408 - 408 * drawProgress} opacity={0.6} />
        </g>
        <g transform={`rotate(${-rotation * 0.6} 100 100)`}>
          <circle cx="100" cy="100" r="40" fill="none" stroke={colors.accentSecondary} strokeWidth="2"
            strokeDasharray="6 4" opacity={0.5 * drawProgress} />
        </g>
        <circle cx="100" cy="100" r={22 + pulse * 4} fill="url(#diag-core)" filter="url(#diag-glow)" opacity={0.95} />
        <circle cx="100" cy="100" r={10 + pulse * 2} fill={colors.textPrimary} opacity={0.95} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i * Math.PI) / 3 + rotation * 0.03;
          const x = 100 + Math.cos(angle) * 88;
          const y = 100 + Math.sin(angle) * 88;
          return (
            <circle key={i} cx={x} cy={y} r={5 + pulse * 1.5} fill={colors.accentPrimary}
              opacity={0.7 + pulse * 0.3 * drawProgress} filter="url(#diag-glow)" />
          );
        })}
      </svg>
    </div>
  );
};
