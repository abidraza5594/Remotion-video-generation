import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { colors } from '../design/tokens';

interface SceneCursorProps {
  x: number;
  y: number;
  size?: number;
  pulse?: boolean;
  label?: string;
}

export const SceneCursor: React.FC<SceneCursorProps> = ({ x, y, size = 56, pulse = true, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ fps, frame, config: { damping: 14, stiffness: 110 }, durationInFrames: 18 });
  const bob = pulse ? Math.sin(frame * 0.15) * 4 : 0;
  const breathe = pulse ? (Math.sin(frame * 0.12) + 1) / 2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2 + bob,
        width: size,
        height: size,
        pointerEvents: 'none',
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.4, 1])})`,
        transformOrigin: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -size * 0.6,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(0,212,255,${0.4 + breathe * 0.25}) 0%, rgba(0,212,255,0) 65%)`,
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        style={{
          filter: `drop-shadow(0 0 12px rgba(0,212,255,0.9)) drop-shadow(0 0 4px rgba(255,255,255,0.5))`,
        }}
      >
        <defs>
          <linearGradient id={`cursor-ring-${Math.round(x)}-${Math.round(y)}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.accentPrimary} />
            <stop offset="100%" stopColor={colors.accentSecondary} />
          </linearGradient>
        </defs>
        <circle cx={32} cy={32} r={26} fill="rgba(13,13,13,0.55)" stroke={`url(#cursor-ring-${Math.round(x)}-${Math.round(y)})`} strokeWidth={4} />
        <circle cx={32} cy={32} r={6} fill={colors.textPrimary} />
      </svg>
      {label && (
        <div
          style={{
            position: 'absolute',
            left: size + 8,
            top: size / 2 - 14,
            background: `linear-gradient(90deg, ${colors.accentPrimary}, ${colors.accentSecondary})`,
            color: colors.background,
            fontFamily: '"Inter", sans-serif',
            fontWeight: 800,
            fontSize: 18,
            padding: '6px 14px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
