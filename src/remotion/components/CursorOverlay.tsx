import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { colors } from '../design/tokens';
import { SPRING_CURSOR } from '../design/animations';
import type { CursorKeyframe } from '../../types';

interface CursorOverlayProps {
  keyframes: CursorKeyframe[];
}

interface InterpolatedState {
  x: number;
  y: number;
  scale: number;
  clickPulse: number;
  highlight: { active: boolean; opacity: number; target: { x: number; y: number } };
}

function computeState(frame: number, fps: number, keyframes: CursorKeyframe[]): InterpolatedState {
  if (keyframes.length === 0) {
    return { x: 0, y: 0, scale: 1, clickPulse: 0, highlight: { active: false, opacity: 0, target: { x: 0, y: 0 } } };
  }

  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);

  let current = sorted[0];
  let next = sorted[0];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].frame <= frame) {
      current = sorted[i];
      next = sorted[i + 1] || sorted[i];
    } else {
      break;
    }
  }

  let x = current.x;
  let y = current.y;

  if (next !== current) {
    const totalFrames = Math.max(1, next.frame - current.frame);
    const progress = spring({
      fps,
      frame: frame - current.frame,
      config: SPRING_CURSOR,
      durationInFrames: totalFrames,
    });
    x = interpolate(progress, [0, 1], [current.x, next.x]);
    y = interpolate(progress, [0, 1], [current.y, next.y]);
  }

  let scale = 1;
  let clickPulse = 0;
  const framesSince = frame - current.frame;
  if (current.action === 'click') {
    if (framesSince >= 0 && framesSince <= 3) {
      scale = interpolate(framesSince, [0, 3], [1, 0.7]);
    } else if (framesSince > 3 && framesSince <= 8) {
      const s = spring({ fps, frame: framesSince - 3, config: { damping: 10, stiffness: 200 }, durationInFrames: 5 });
      scale = interpolate(s, [0, 1], [0.7, 1]);
    }
    if (framesSince >= 0 && framesSince <= 15) {
      clickPulse = interpolate(framesSince, [0, 15], [1, 0]);
    }
  }

  let highlight = { active: false, opacity: 0, target: { x: current.x, y: current.y } };
  if (current.action === 'highlight') {
    const total = 30;
    if (framesSince >= 0 && framesSince <= total) {
      const o = framesSince < 5
        ? interpolate(framesSince, [0, 5], [0, 1])
        : framesSince > total - 5
          ? interpolate(framesSince, [total - 5, total], [1, 0])
          : 1;
      highlight = { active: true, opacity: o, target: { x: current.x, y: current.y } };
    }
  }

  return { x, y, scale, clickPulse, highlight };
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ keyframes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const state = computeState(frame, fps, keyframes);

  const trailOffsets = [4, 8, 12, 16, 20];
  const trailOpacities = [0.35, 0.22, 0.14, 0.08, 0.04];

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {state.highlight.active && (
        <div
          style={{
            position: 'absolute',
            left: state.highlight.target.x - 80,
            top: state.highlight.target.y - 30,
            width: 160,
            height: 60,
            border: `2px solid ${colors.accentPrimary}`,
            borderRadius: 10,
            boxShadow: `0 0 24px rgba(0, 212, 255, ${state.highlight.opacity * 0.7})`,
            background: `rgba(0, 212, 255, ${state.highlight.opacity * 0.08})`,
            opacity: state.highlight.opacity,
            transition: 'none',
          }}
        />
      )}

      {trailOffsets.map((offset, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: state.x - 12,
            top: state.y - 12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: colors.accentPrimary,
            opacity: trailOpacities[i] * 0.4,
            transform: `translate(${-offset * 0.3}px, ${-offset * 0.3}px) scale(${state.scale * (1 - i * 0.1)})`,
            filter: 'blur(2px)',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: state.x - 20,
          top: state.y - 20,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(0,212,255,0.25) 0%, rgba(0,212,255,0) 70%)`,
          transform: `scale(${state.scale})`,
          pointerEvents: 'none',
        }}
      />

      <svg
        width={32}
        height={32}
        viewBox="0 0 32 32"
        style={{
          position: 'absolute',
          left: state.x - 16,
          top: state.y - 16,
          transform: `scale(${state.scale})`,
          transformOrigin: 'center',
          filter: `drop-shadow(0 0 8px rgba(0, 212, 255, 0.6))`,
        }}
      >
        <circle cx={16} cy={16} r={11} fill="none" stroke={colors.accentPrimary} strokeWidth={2} opacity={0.9} />
        <circle cx={16} cy={16} r={3} fill={colors.textPrimary} />
      </svg>

      {state.clickPulse > 0 && (
        <div
          style={{
            position: 'absolute',
            left: state.x - 30,
            top: state.y - 30,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: `2px solid ${colors.accentPrimary}`,
            opacity: state.clickPulse,
            transform: `scale(${interpolate(state.clickPulse, [0, 1], [2.5, 0.5])})`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
