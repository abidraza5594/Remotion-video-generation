import React from 'react';
import { AbsoluteFill, Sequence, Audio } from 'remotion';
import { SceneRouter } from '../scenes/SceneRouter';
import { CursorOverlay } from '../components/CursorOverlay';
import { CaptionBar } from '../components/CaptionBar';
import type { Storyboard, TimingFile } from '../../types';

interface MainCompositionProps {
  storyboard: Storyboard;
  timing: TimingFile;
  audioSrc?: string;
  vttBySceneId?: Record<string, string>;
}

export const MainComposition: React.FC<MainCompositionProps> = ({
  storyboard,
  timing,
  audioSrc,
  vttBySceneId = {},
}) => {
  const isShorts = timing.format === 'shorts';

  return (
    <AbsoluteFill style={{ background: '#0D0D0D' }}>
      {storyboard.scenes.map((scene) => {
        const entry = timing.scenes.find((s) => s.id === scene.id);
        if (!entry) return null;
        return (
          <Sequence
            key={scene.id}
            from={entry.startFrame}
            durationInFrames={entry.durationFrames}
            name={`Scene: ${scene.type}`}
          >
            <SceneRouter
              scene={scene}
              durationInFrames={entry.durationFrames}
              format={timing.format}
              storyTitle={storyboard.title}
            />
          </Sequence>
        );
      })}

      <CursorOverlay
        keyframes={timing.scenes.flatMap((s) => s.cursorKeyframes)}
      />

      {isShorts && storyboard.scenes.map((scene) => {
        const entry = timing.scenes.find((s) => s.id === scene.id);
        if (!entry) return null;
        const vtt = vttBySceneId[scene.id];
        if (!vtt) return null;
        return (
          <Sequence
            key={`cap-${scene.id}`}
            from={entry.startFrame}
            durationInFrames={entry.durationFrames}
            name={`Captions: ${scene.id}`}
          >
            <CaptionBar vttContent={vtt} sceneStartFrame={0} />
          </Sequence>
        );
      })}

      {audioSrc && <Audio src={audioSrc} />}
    </AbsoluteFill>
  );
};
