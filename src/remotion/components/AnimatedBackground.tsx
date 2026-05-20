import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { colors } from '../design/tokens';

interface AnimatedBackgroundProps {
  variant?: 'cinematic' | 'punch' | 'soft';
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ variant = 'cinematic' }) => {
  const frame = useCurrentFrame();
  const t = frame / 120;

  const dx1 = Math.sin(t) * 15 + 50;
  const dy1 = Math.cos(t * 0.7) * 15 + 30;
  const dx2 = Math.cos(t * 0.5) * 20 + 50;
  const dy2 = Math.sin(t * 0.9) * 20 + 70;

  const primary = variant === 'punch' ? '#7B2FBE' : colors.accentSecondary;
  const secondary = variant === 'punch' ? colors.accentPrimary : colors.accentPrimary;

  return (
    <AbsoluteFill style={{ background: colors.background, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at ${dx1}% ${dy1}%, ${primary}33 0%, transparent 45%),
                       radial-gradient(circle at ${dx2}% ${dy2}%, ${secondary}26 0%, transparent 50%),
                       linear-gradient(135deg, ${colors.background} 0%, ${colors.surface} 100%)`,
          filter: 'blur(30px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px)',
          mixBlendMode: 'overlay',
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
