import { spring, SpringConfig } from 'remotion';

export const SPRING_GENTLE: SpringConfig = { damping: 20, stiffness: 80, mass: 1 };
export const SPRING_BOUNCY: SpringConfig = { damping: 12, stiffness: 100, mass: 1 };
export const SPRING_SNAPPY: SpringConfig = { damping: 18, stiffness: 200, mass: 0.8 };
export const SPRING_CURSOR: SpringConfig = { damping: 22, stiffness: 90, mass: 0.9 };

export function springAt(
  fps: number,
  frame: number,
  delayFrames = 0,
  config: SpringConfig = SPRING_GENTLE,
  durationInFrames?: number,
): number {
  return spring({
    fps,
    frame: Math.max(0, frame - delayFrames),
    config,
    durationInFrames,
  });
}
