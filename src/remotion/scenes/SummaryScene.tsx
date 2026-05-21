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
  const { fps, width, height } = useVideoConfig();
  const isShorts = width < height;

  const safeTop = isShorts ? 170 : 80;
  const safeBottom = isShorts ? 200 : 80;
  const safeX = isShorts ? Math.round(width * 0.06) : 100;

  const titleSpring = spring({ fps, frame, config: { damping: 18, stiffness: 90 }, durationInFrames: 18 });

  const filtered = items.filter((i) => i && i.trim().length > 0).slice(0, isShorts ? 5 : 6);

  const titleSize = isShorts ? 76 : 96;
  const pointSize = isShorts ? 36 : 30;

  return (
    <AbsoluteFill>
      <AnimatedBackground variant="cinematic" />
      <div
        style={{
          position: 'absolute',
          top: safeTop,
          bottom: safeBottom,
          left: safeX,
          right: safeX,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}
      >
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: titleSize,
            color: colors.textPrimary,
            textAlign: 'center',
            margin: 0,
            marginBottom: 40,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
          }}
        >
          {title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, justifyContent: 'center' }}>
          {filtered.map((item, idx) => {
            const delay = 18 + idx * 12;
            const s = spring({ fps, frame: frame - delay, config: { damping: 16, stiffness: 110 }, durationInFrames: 22 });
            const checkProgress = spring({ fps, frame: frame - delay - 6, config: { damping: 20 }, durationInFrames: 18 });

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                  padding: '22px 28px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  border: `1.5px solid ${colors.border}`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <svg width={48} height={48} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                  <circle cx={24} cy={24} r={22} fill="none" stroke={colors.success} strokeWidth={2.5} opacity={0.85} />
                  <path
                    d="M13 24 L22 33 L37 17"
                    stroke={colors.success}
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={50}
                    strokeDashoffset={interpolate(checkProgress, [0, 1], [50, 0])}
                    style={{ filter: `drop-shadow(0 0 8px ${colors.success})` }}
                  />
                </svg>
                <span style={{ fontFamily: fonts.body, fontSize: pointSize, color: colors.textPrimary, lineHeight: 1.35, fontWeight: 500 }}>
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
