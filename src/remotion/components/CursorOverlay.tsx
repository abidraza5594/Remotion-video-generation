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
    if (framesSince >= 0 && framesSince <= 4) {
      scale = interpolate(framesSince, [0, 4], [1, 0.7]);
    } else if (framesSince > 4 && framesSince <= 12) {
      const s = spring({ fps, frame: framesSince - 4, config: { damping: 10, stiffness: 200 }, durationInFrames: 8 });
      scale = interpolate(s, [0, 1], [0.7, 1]);
    }
    if (framesSince >= 0 && framesSince <= 24) {
      clickPulse = interpolate(framesSince, [0, 24], [1, 0]);
    }
  }

  let highlight = { active: false, opacity: 0, target: { x: current.x, y: current.y } };
  if (current.action === 'highlight') {
    const total = 45;
    if (framesSince >= 0 && framesSince <= total) {
      const o = framesSince < 6
        ? interpolate(framesSince, [0, 6], [0, 1])
        : framesSince > total - 8
          ? interpolate(framesSince, [total - 8, total], [1, 0])
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

  if (keyframes.length === 0) return null;

  const trailOffsets = [6, 14, 22, 30];
  const trailOpacities = [0.45, 0.3, 0.18, 0.09];

  const cursorSize = 64;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {state.highlight.active && (
        <div
          style={{
            position: 'absolute',
            left: state.highlight.target.x - 130,
            top: state.highlight.target.y - 50,
            width: 260,
            height: 100,
            border: `3px solid ${colors.codeHighlight}`,
            borderRadius: 14,
            boxShadow: `0 0 40px rgba(255, 215, 0, ${state.highlight.opacity * 0.9}), inset 0 0 30px rgba(255, 215, 0, ${state.highlight.opacity * 0.3})`,
            background: `rgba(255, 215, 0, ${state.highlight.opacity * 0.12})`,
            opacity: state.highlight.opacity,
          }}
        />
      )}

      {trailOffsets.map((offset, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: state.x - cursorSize / 2,
            top: state.y - cursorSize / 2,
            width: cursorSize,
            height: cursorSize,
            borderRadius: '50%',
            background: colors.accentPrimary,
            opacity: trailOpacities[i] * 0.5,
            transform: `translate(${-offset * 0.4}px, ${-offset * 0.4}px) scale(${state.scale * (1 - i * 0.12)})`,
            filter: 'blur(3px)',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: state.x - cursorSize,
          top: state.y - cursorSize,
          width: cursorSize * 2,
          height: cursorSize * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(0,212,255,0.45) 0%, rgba(0,212,255,0.15) 30%, rgba(0,212,255,0) 70%)`,
          transform: `scale(${state.scale})`,
          pointerEvents: 'none',
        }}
      />

      <svg
        width={cursorSize}
        height={cursorSize}
        viewBox="0 0 64 64"
        style={{
          position: 'absolute',
          left: state.x - cursorSize / 2,
          top: state.y - cursorSize / 2,
          transform: `scale(${state.scale})`,
          transformOrigin: 'center',
          filter: `drop-shadow(0 0 14px rgba(0, 212, 255, 0.9)) drop-shadow(0 0 6px rgba(255,255,255,0.6))`,
        }}
      >
        <defs>
          <linearGradient id="cursor-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.accentPrimary} />
            <stop offset="100%" stopColor={colors.accentSecondary} />
          </linearGradient>
        </defs>
        <circle cx={32} cy={32} r={28} fill="rgba(13,13,13,0.6)" stroke="url(#cursor-grad)" strokeWidth={4} />
        <circle cx={32} cy={32} r={20} fill="none" stroke={colors.accentPrimary} strokeWidth={2.5} opacity={0.7} />
        <circle cx={32} cy={32} r={6} fill={colors.textPrimary} />
      </svg>

      {state.clickPulse > 0 && (
        <div
          style={{
            position: 'absolute',
            left: state.x - 70,
            top: state.y - 70,
            width: 140,
            height: 140,
            borderRadius: '50%',
            border: `4px solid ${colors.accentPrimary}`,
            opacity: state.clickPulse,
            transform: `scale(${interpolate(state.clickPulse, [0, 1], [2.5, 0.5])})`,
            boxShadow: `0 0 30px rgba(0, 212, 255, ${state.clickPulse * 0.8})`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
