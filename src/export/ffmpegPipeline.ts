import fs from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { PATHS, timestampString, fileSizeMB } from '../utils/fileManager';
import { logger } from '../utils/logger';
import type { Storyboard, TimingFile, VideoFormat } from '../types';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);

export interface RenderOptions {
  storyboard: Storyboard;
  timing: TimingFile;
  audioPath: string;
  format: VideoFormat;
}

export interface RenderResult {
  videoPath: string;
  thumbnailPath: string;
  durationSeconds: number;
  fileSizeMB: number;
  width: number;
  height: number;
}

const ENTRY = path.resolve(process.cwd(), 'src', 'remotion', 'index.ts');

export async function renderAndExport(opts: RenderOptions): Promise<RenderResult> {
  if (!fs.existsSync(PATHS.output)) fs.mkdirSync(PATHS.output, { recursive: true });

  const noAudioPath = path.join(PATHS.temp, `video_no_audio.mp4`);
  const stamp = timestampString();
  const finalPath = path.join(PATHS.output, `final_${stamp}.mp4`);
  const thumbnailPath = path.join(PATHS.output, `thumbnail_${stamp}.jpg`);

  logger.step('Bundling Remotion project...');
  const bundleLocation = await bundle({
    entryPoint: ENTRY,
    webpackOverride: (config) => config,
  });

  logger.step('Selecting composition...');
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'MainComposition',
    inputProps: {
      storyboard: opts.storyboard,
      timing: opts.timing,
      audioSrc: undefined,
      vttBySceneId: collectVtts(opts.storyboard),
    },
  });

  logger.step(`Rendering ${composition.durationInFrames} frames at ${composition.fps}fps...`);

  let lastPct = -1;
  await renderMedia({
    composition: {
      ...composition,
      width: opts.timing.width,
      height: opts.timing.height,
      durationInFrames: opts.timing.totalFrames,
      fps: opts.timing.fps,
    },
    serveUrl: bundleLocation,
    codec: 'h264',
    crf: 18,
    outputLocation: noAudioPath,
    inputProps: {
      storyboard: opts.storyboard,
      timing: opts.timing,
      audioSrc: undefined,
      vttBySceneId: collectVtts(opts.storyboard),
    },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        logger.progress('Render', pct, 100);
      }
    },
  });

  logger.step('Merging audio + video...');
  await mergeAudioVideo(noAudioPath, opts.audioPath, finalPath);

  logger.step('Extracting thumbnail...');
  await extractThumbnail(finalPath, thumbnailPath);

  const stats = fs.statSync(finalPath);
  const duration = opts.timing.totalFrames / opts.timing.fps;

  return {
    videoPath: finalPath,
    thumbnailPath,
    durationSeconds: duration,
    fileSizeMB: fileSizeMB(finalPath),
    width: opts.timing.width,
    height: opts.timing.height,
  };
}

function collectVtts(storyboard: Storyboard): Record<string, string> {
  const result: Record<string, string> = {};
  for (const scene of storyboard.scenes) {
    const vttPath = path.join(PATHS.tempSubs, `scene_${scene.id}.vtt`);
    if (fs.existsSync(vttPath)) result[scene.id] = fs.readFileSync(vttPath, 'utf-8');
  }
  return result;
}

function mergeAudioVideo(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',
        '-c:a aac',
        '-b:a 192k',
        '-shortest',
      ])
      .on('error', reject)
      .on('end', () => resolve())
      .save(outputPath);
  });
}

function extractThumbnail(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(['-vf', 'select=eq(n\\,0)', '-vframes', '1'])
      .on('error', reject)
      .on('end', () => resolve())
      .save(outputPath);
  });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
