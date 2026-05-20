import type { Storyboard, TimingFile, CursorKeyframe } from '../types';

export interface BuildTimingOptions {
  fps?: number;
  width?: number;
  height?: number;
}

export function buildTiming(storyboard: Storyboard, options: BuildTimingOptions = {}): TimingFile {
  const fps = options.fps ?? storyboard.fps ?? 30;
  const isShorts = storyboard.format === 'shorts';
  const width = options.width ?? (isShorts ? 1080 : 1920);
  const height = options.height ?? (isShorts ? 1920 : 1080);

  let runningFrame = 0;
  const scenes = storyboard.scenes.map((scene) => {
    const startFrame = runningFrame;
    const durationFrames = Math.max(1, Math.round(scene.duration * fps));
    const endFrame = startFrame + durationFrames;

    const cursorKeyframes: CursorKeyframe[] = scene.cursorActions
      .slice()
      .sort((a, b) => a.time - b.time)
      .map((action) => ({
        frame: startFrame + Math.round(action.time * fps),
        x: clamp(action.x, 0, width),
        y: clamp(action.y, 0, height),
        action: action.action,
        target: action.target,
      }));

    runningFrame = endFrame;
    return {
      id: scene.id,
      type: scene.type,
      startFrame,
      endFrame,
      durationFrames,
      cursorKeyframes,
    };
  });

  return {
    fps,
    totalFrames: runningFrame,
    width,
    height,
    format: storyboard.format,
    scenes,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return Math.round((min + max) / 2);
  return Math.max(min, Math.min(max, Math.round(value)));
}
