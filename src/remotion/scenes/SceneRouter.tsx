import React from 'react';
import { HookScene } from './HookScene';
import { CodeScene } from './CodeScene';
import { ExplanationScene } from './ExplanationScene';
import { SummaryScene } from './SummaryScene';
import { OutroScene } from './OutroScene';
import { TransitionWrapper, TransitionKind } from '../components/TransitionWrapper';
import type { Scene, VideoFormat } from '../../types';

interface SceneRouterProps {
  scene: Scene;
  durationInFrames: number;
  format: VideoFormat;
  storyTitle: string;
}

function pickTransition(type: Scene['type'], format: VideoFormat): TransitionKind {
  if (format === 'shorts') {
    if (type === 'hook' || type === 'outro') return 'zoom-punch';
    return 'cross-dissolve';
  }
  return 'cross-dissolve';
}

function pointsFromOverlays(scene: Scene): string[] {
  const overlays = scene.textOverlays
    .filter((o) => o.style === 'caption' || o.style === 'highlight')
    .map((o) => o.text);
  if (overlays.length) return overlays;
  return scene.narration
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 6)
    .slice(0, 4);
}

export const SceneRouter: React.FC<SceneRouterProps> = ({ scene, durationInFrames, format, storyTitle }) => {
  const kind = pickTransition(scene.type, format);
  const inOutFrames = format === 'shorts' ? 8 : 12;

  let content: React.ReactNode;
  switch (scene.type) {
    case 'hook':
      content = (
        <HookScene
          title={scene.textOverlays.find((o) => o.style === 'headline')?.text || storyTitle}
          subtitle={scene.textOverlays.find((o) => o.style === 'caption')?.text || scene.narration.slice(0, 80)}
        />
      );
      break;
    case 'code': {
      const title = scene.textOverlays.find((o) => o.style === 'headline')?.text;
      content = (
        <CodeScene
          code={scene.codeSnippet || '// code unavailable'}
          language={(scene.language || 'typescript') as string}
          title={title}
          filename={`scene.${(scene.language || 'ts').slice(0, 3)}`}
          durationInFrames={durationInFrames}
          animations={scene.animations}
          format={format}
        />
      );
      break;
    }
    case 'summary':
      content = (
        <SummaryScene
          title={scene.textOverlays.find((o) => o.style === 'headline')?.text || 'Key Takeaways'}
          items={pointsFromOverlays(scene)}
        />
      );
      break;
    case 'outro':
      content = (
        <OutroScene
          ctaLine={scene.narration.length < 100 ? scene.narration : 'Follow for more developer tutorials.'}
        />
      );
      break;
    default:
      content = (
        <ExplanationScene
          title={scene.textOverlays.find((o) => o.style === 'headline')?.text}
          points={pointsFromOverlays(scene)}
          format={format}
          visualHint={scene.visualDescription?.slice(0, 80)}
        />
      );
  }

  return (
    <TransitionWrapper durationInFrames={durationInFrames} inFrames={inOutFrames} outFrames={inOutFrames} kind={kind}>
      {content}
    </TransitionWrapper>
  );
};
