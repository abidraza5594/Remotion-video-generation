import React from 'react';
import { HookScene } from './HookScene';
import { CodeScene } from './CodeScene';
import { ExplanationScene } from './ExplanationScene';
import { SummaryScene } from './SummaryScene';
import { OutroScene } from './OutroScene';
import { TransitionWrapper, TransitionKind } from '../components/TransitionWrapper';
import { DEFAULT_BRANDING, Branding } from '../../utils/branding';
import type { Scene, VideoFormat } from '../../types';

interface SceneRouterProps {
  scene: Scene;
  durationInFrames: number;
  format: VideoFormat;
  storyTitle: string;
  branding?: Branding;
}

function pickTransition(type: Scene['type'], format: VideoFormat): TransitionKind {
  if (format === 'shorts') {
    if (type === 'hook' || type === 'outro') return 'zoom-punch';
    return 'cross-dissolve';
  }
  return 'cross-dissolve';
}

function splitSentences(narration: string): string[] {
  return narration
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 220);
}

function expandShortPoint(text: string, fallback: string): string {
  if (text.length >= 18) return text;
  return text.length > fallback.length ? text : fallback;
}

function bulletsForExplanation(scene: Scene, maxBullets: number): string[] {
  const captions = scene.textOverlays
    .filter((o) => o.style === 'caption' || o.style === 'highlight')
    .map((o) => o.text);

  const sentences = splitSentences(scene.narration);

  const pool: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const norm = s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    pool.push(s);
  };

  for (const cap of captions) push(cap);
  for (const sent of sentences) push(sent);

  while (pool.length < Math.min(3, sentences.length + captions.length)) {
    if (!sentences[pool.length]) break;
    push(sentences[pool.length]);
  }

  return pool.slice(0, maxBullets).map((p, i) => expandShortPoint(p, sentences[i] || p));
}

function bulletsForSummary(scene: Scene): string[] {
  const captions = scene.textOverlays
    .filter((o) => o.style === 'caption' || o.style === 'highlight')
    .map((o) => o.text);
  if (captions.length >= 3) return captions.slice(0, 6);

  const sentences = splitSentences(scene.narration);
  const combined: string[] = [];
  const seen = new Set<string>();
  for (const s of [...captions, ...sentences]) {
    const norm = s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      combined.push(s);
    }
  }
  return combined.slice(0, 6);
}

export const SceneRouter: React.FC<SceneRouterProps> = ({ scene, durationInFrames, format, storyTitle, branding }) => {
  const brand = branding || DEFAULT_BRANDING;
  const kind = pickTransition(scene.type, format);
  const inOutFrames = format === 'shorts' ? 8 : 12;
  const maxBullets = format === 'shorts' ? 4 : 5;

  let content: React.ReactNode;
  const effectiveType = scene.type === 'outro' && !brand.outroEnabled ? 'explanation' : scene.type;

  switch (effectiveType) {
    case 'hook':
      content = (
        <HookScene
          title={scene.textOverlays.find((o) => o.style === 'headline')?.text || storyTitle}
          subtitle={scene.textOverlays.find((o) => o.style === 'caption')?.text || scene.narration.slice(0, 100)}
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
          narrationFallback={scene.narration}
        />
      );
      break;
    }
    case 'summary':
      content = (
        <SummaryScene
          title={scene.textOverlays.find((o) => o.style === 'headline')?.text || 'Key Takeaways'}
          items={bulletsForSummary(scene)}
        />
      );
      break;
    case 'outro':
      content = (
        <OutroScene
          channelName={brand.channelName}
          ctaLine={brand.ctaLine || scene.narration}
          subscribeText={brand.subscribeText}
          showSubscribeButton={brand.showSubscribeButton}
          handles={brand.handles}
        />
      );
      break;
    default:
      content = (
        <ExplanationScene
          title={scene.textOverlays.find((o) => o.style === 'headline')?.text}
          points={bulletsForExplanation(scene, maxBullets)}
          format={format}
        />
      );
  }

  return (
    <TransitionWrapper durationInFrames={durationInFrames} inFrames={inOutFrames} outFrames={inOutFrames} kind={kind}>
      {content}
    </TransitionWrapper>
  );
};
