import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { colors, fonts } from '../design/tokens';

interface SummarySceneProps {
  title: string;
  items: string[];
}

export const SummaryScene: React.FC<SummarySceneProps> = ({ title, items }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleSpring = spring({ fps, frame, config: { damping: 18, stiffness: 90 }, durationInFrames: 18 });

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="cinematic" />
      <AbsoluteFill style={{ padding: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: width >= 1600 ? 88 : 64,
            color: colors.textPrimary,
            textAlign: 'center',
            margin: 0,
            marginBottom: 60,
            letterSpacing: '-0.03em',
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
          }}
        >
          {title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          {items.map((item, idx) => {
            const delay = 18 + idx * 12;
            const s = spring({ fps, frame: frame - delay, config: { damping: 16, stiffness: 110 }, durationInFrames: 22 });
            const checkProgress = spring({ fps, frame: frame - delay - 6, config: { damping: 20 }, durationInFrames: 18 });

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                  padding: '20px 28px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <svg width={44} height={44} viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
                  <circle cx={22} cy={22} r={20} fill="none" stroke={colors.success} strokeWidth={2} opacity={0.8} />
                  <path
                    d="M12 22 L20 30 L34 16"
                    stroke={colors.success}
                    strokeWidth={3.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={45}
                    strokeDashoffset={interpolate(checkProgress, [0, 1], [45, 0])}
                    style={{ filter: `drop-shadow(0 0 8px ${colors.success})` }}
                  />
                </svg>
                <span style={{ fontFamily: fonts.body, fontSize: 30, color: colors.textPrimary, lineHeight: 1.35 }}>
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
