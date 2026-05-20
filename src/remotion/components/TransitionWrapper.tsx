import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export type TransitionKind = 'cross-dissolve' | 'slide-wipe' | 'zoom-punch';

interface TransitionWrapperProps {
  durationInFrames: number;
  inFrames?: number;
  outFrames?: number;
  kind?: TransitionKind;
  children: React.ReactNode;
}

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  durationInFrames,
  inFrames = 10,
  outFrames = 10,
  kind = 'cross-dissolve',
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inProgress = Math.min(1, frame / Math.max(1, inFrames));
  const outStart = durationInFrames - outFrames;
  const outProgress = frame >= outStart
    ? Math.min(1, (frame - outStart) / Math.max(1, outFrames))
    : 0;

  let opacity = 1;
  let transform = '';

  if (kind === 'cross-dissolve') {
    opacity = (1 - outProgress) * inProgress;
  } else if (kind === 'slide-wipe') {
    const inSpring = spring({ fps, frame, config: { damping: 20, stiffness: 100 }, durationInFrames: inFrames });
    const tx = frame < outStart
      ? interpolate(inSpring, [0, 1], [-100, 0])
      : interpolate(outProgress, [0, 1], [0, 100]);
    transform = `translateX(${tx}%)`;
    opacity = frame < outStart ? 1 : 1 - outProgress;
  } else if (kind === 'zoom-punch') {
    const scaleIn = interpolate(inProgress, [0, 1], [1.15, 1]);
    const scaleOut = interpolate(outProgress, [0, 1], [1, 0.9]);
    const opIn = inProgress;
    const opOut = 1 - outProgress;
    transform = `scale(${frame < outStart ? scaleIn : scaleOut})`;
    opacity = frame < outStart ? opIn : opOut;
  }

  return (
    <AbsoluteFill style={{ opacity, transform, transformOrigin: 'center' }}>
      {children}
    </AbsoluteFill>
  );
};
