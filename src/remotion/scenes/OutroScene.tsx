import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { colors, fonts, radii } from '../design/tokens';

interface OutroSceneProps {
  channelName?: string;
  ctaLine?: string;
  handles?: string[];
}

export const OutroScene: React.FC<OutroSceneProps> = ({
  channelName = 'Cinematic AI Studio',
  ctaLine = 'Follow for more developer tutorials.',
  handles = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const channelSpring = spring({ fps, frame, config: { damping: 16, stiffness: 100 }, durationInFrames: 22 });
  const ctaSpring = spring({ fps, frame: frame - 14, config: { damping: 18, stiffness: 80 }, durationInFrames: 22 });
  const pulse = (Math.sin(frame * 0.12) + 1) / 2;

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="punch" />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 60 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: width >= 1600 ? 96 : 64,
            color: colors.textPrimary,
            letterSpacing: '-0.04em',
            opacity: channelSpring,
            transform: `translateX(${interpolate(channelSpring, [0, 1], [-60, 0])}px)`,
            textAlign: 'center',
          }}
        >
          {channelName}
        </div>

        <div
          style={{
            padding: '20px 48px',
            background: `linear-gradient(90deg, ${colors.accentPrimary}, ${colors.accentSecondary})`,
            borderRadius: radii.pill,
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 38,
            color: colors.background,
            opacity: ctaSpring,
            transform: `scale(${interpolate(ctaSpring, [0, 1], [0.85, 1 + pulse * 0.03])})`,
            boxShadow: `0 0 ${20 + pulse * 30}px rgba(0, 212, 255, 0.5)`,
          }}
        >
          Subscribe ▸
        </div>

        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 30,
            color: colors.textSecondary,
            margin: 0,
            opacity: ctaSpring,
            textAlign: 'center',
          }}
        >
          {ctaLine}
        </p>

        {handles.length > 0 && (
          <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
            {handles.map((handle, i) => {
              const s = spring({ fps, frame: frame - 30 - i * 6, config: { damping: 18 }, durationInFrames: 18 });
              return (
                <span
                  key={handle}
                  style={{
                    fontFamily: fonts.mono,
                    color: colors.textPrimary,
                    fontSize: 22,
                    padding: '10px 18px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: radii.pill,
                    border: `1px solid ${colors.border}`,
                    opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
                  }}
                >
                  {handle}
                </span>
              );
            })}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
