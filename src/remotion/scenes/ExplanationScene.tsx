import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { colors, fonts, radii } from '../design/tokens';

interface ExplanationSceneProps {
  title?: string;
  points: string[];
  format: 'shorts' | 'long';
  visualHint?: string;
}

export const ExplanationScene: React.FC<ExplanationSceneProps> = ({ title, points, format, visualHint }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isVertical = format === 'shorts';

  const titleSpring = spring({ fps, frame, config: { damping: 20, stiffness: 90 }, durationInFrames: 16 });

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="soft" />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          gap: isVertical ? 40 : 60,
          padding: isVertical ? 60 : 100,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ flex: 1, maxWidth: isVertical ? '100%' : width * 0.45 }}>
          <DiagramVisual frame={frame} fps={fps} hint={visualHint} />
        </div>

        <div style={{ flex: 1, maxWidth: isVertical ? '100%' : width * 0.45 }}>
          {title && (
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: 900,
                fontSize: isVertical ? 56 : 64,
                color: colors.textPrimary,
                margin: 0,
                marginBottom: 32,
                letterSpacing: '-0.03em',
                opacity: titleSpring,
                transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
              }}
            >
              {title}
            </h2>
          )}

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {points.map((point, idx) => {
              const delay = 14 + idx * 10;
              const s = spring({ fps, frame: frame - delay, config: { damping: 18, stiffness: 100 }, durationInFrames: 18 });
              return (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    opacity: s,
                    transform: `translateX(${interpolate(s, [0, 1], [-24, 0])}px) scale(${interpolate(s, [0, 1], [0.95, 1])})`,
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(10px)',
                    padding: '18px 22px',
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      marginTop: 14,
                      borderRadius: '50%',
                      background: colors.accentPrimary,
                      boxShadow: `0 0 12px ${colors.accentPrimary}`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: isVertical ? 30 : 28,
                      color: colors.textPrimary,
                      lineHeight: 1.4,
                    }}
                  >
                    {point}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const DiagramVisual: React.FC<{ frame: number; fps: number; hint?: string }> = ({ frame, fps, hint }) => {
  const drawProgress = spring({ fps, frame, config: { damping: 25, stiffness: 60 }, durationInFrames: 60 });
  const pulse = (Math.sin(frame * 0.08) + 1) / 2;

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <linearGradient id="diag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.accentPrimary} />
            <stop offset="100%" stopColor={colors.accentSecondary} />
          </linearGradient>
        </defs>

        <circle cx="100" cy="100" r="80" fill="none" stroke="url(#diag-grad)" strokeWidth="2"
          strokeDasharray="503" strokeDashoffset={503 - 503 * drawProgress} opacity={0.8} />
        <circle cx="100" cy="100" r="50" fill="none" stroke={colors.accentPrimary} strokeWidth="2"
          strokeDasharray="314" strokeDashoffset={314 - 314 * drawProgress} opacity={0.6} />
        <circle cx="100" cy="100" r={18 + pulse * 3} fill="url(#diag-grad)" opacity={0.85} />

        {[0, 1, 2, 3].map((i) => {
          const angle = (i * Math.PI) / 2;
          const x = 100 + Math.cos(angle) * 80;
          const y = 100 + Math.sin(angle) * 80;
          return (
            <circle key={i} cx={x} cy={y} r={6 + pulse * 2} fill={colors.accentPrimary}
              opacity={0.6 + pulse * 0.4 * drawProgress} />
          );
        })}
      </svg>
      {hint && (
        <div
          style={{
            position: 'absolute',
            bottom: -36,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: fonts.body,
            color: colors.textSecondary,
            fontSize: 18,
            opacity: drawProgress,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
};
