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
  const { fps, width } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const titleBlur = interpolate(frame, [0, 22], [22, 0], { extrapolateRight: 'clamp' });
  const subtitleSpring = spring({ fps, frame: frame - 14, config: { damping: 18, stiffness: 90 }, durationInFrames: 20 });
  const subY = interpolate(subtitleSpring, [0, 1], [40, 0]);
  const lineWidth = interpolate(spring({ fps, frame: frame - 8, config: { damping: 20 }, durationInFrames: 25 }), [0, 1], [0, 200]);

  const titleSize = width >= 1600 ? 120 : 92;
  const subSize = width >= 1600 ? 38 : 32;

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="cinematic" />
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 60, maxWidth: width * 0.85 }}>
          <div
            style={{
              width: lineWidth,
              height: 4,
              background: `linear-gradient(90deg, ${colors.accentPrimary}, ${colors.accentSecondary})`,
              borderRadius: 3,
              margin: '0 auto 32px',
              boxShadow: `0 0 16px ${colors.accentPrimary}`,
            }}
          />
          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize: titleSize,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: colors.textPrimary,
              margin: 0,
              opacity: titleOpacity,
              filter: `blur(${titleBlur}px)`,
              textShadow: `0 4px 40px rgba(0,0,0,0.6)`,
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
                margin: '24px 0 0',
                opacity: subtitleSpring,
                transform: `translateY(${subY}px)`,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
