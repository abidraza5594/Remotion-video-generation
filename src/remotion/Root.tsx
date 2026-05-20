import React from 'react';
import { Composition } from 'remotion';
import { MainComposition } from './compositions/MainComposition';
import type { Storyboard, TimingFile } from '../types';

function loadGenerated(): { storyboard: Storyboard; timing: TimingFile } {
  try {
    const storyboard = require('./generated/storyboard.json') as Storyboard;
    const timing = require('./generated/timing.json') as TimingFile;
    return { storyboard, timing };
  } catch {
    return { storyboard: PLACEHOLDER_STORYBOARD(), timing: PLACEHOLDER_TIMING() };
  }
}

const { storyboard, timing } = loadGenerated();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MainComposition"
      component={MainComposition as any}
      durationInFrames={Math.max(30, timing.totalFrames)}
      fps={timing.fps}
      width={timing.width}
      height={timing.height}
      defaultProps={{
        storyboard,
        timing,
        audioSrc: undefined,
        vttBySceneId: {},
      }}
    />
  );
};

function PLACEHOLDER_STORYBOARD(): Storyboard {
  return {
    title: 'Cinematic AI Studio',
    topic: 'Preview',
    format: 'long',
    totalDuration: 6,
    fps: 30,
    scenes: [
      {
        id: 'placeholder',
        type: 'hook',
        startTime: 0,
        duration: 6,
        narration: 'Run npm run generate-video to create real content.',
        visualDescription: '',
        codeSnippet: null,
        language: null,
        cursorActions: [],
        animations: [],
        textOverlays: [
          { time: 0, text: 'Cinematic AI Studio', style: 'headline', position: 'center' },
          { time: 0, text: 'Preview composition — run the CLI to generate real videos.', style: 'caption', position: 'center' },
        ],
      },
    ],
  };
}

function PLACEHOLDER_TIMING(): TimingFile {
  return {
    fps: 30,
    totalFrames: 180,
    width: 1920,
    height: 1080,
    format: 'long',
    scenes: [
      {
        id: 'placeholder',
        type: 'hook',
        startFrame: 0,
        endFrame: 180,
        durationFrames: 180,
        cursorKeyframes: [],
      },
    ],
  };
}
