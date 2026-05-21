import inquirer from 'inquirer';
import { logger } from '../utils/logger';
import { ensureDirs, writeJSON, cleanTemp, PATHS } from '../utils/fileManager';
import { generateTopicSuggestions } from '../ai/topicGenerator';
import { generateStoryboard } from '../ai/storyboardEngine';
import { generateAllAudio } from '../tts/voiceGenerator';
import { mergeAllAudio } from '../tts/audioMerger';
import { buildTiming } from '../export/timingBuilder';
import { renderAndExport, formatDuration } from '../export/ffmpegPipeline';
import { generateYouTubeCopy, generateInstagramCopy, generateLinkedInCopy, chaptersFromStoryboard } from '../ai/seoGenerator';
import { uploadToYouTube } from '../social/youtubeUploader';
import { uploadToInstagram } from '../social/instagramUploader';
import { uploadToLinkedIn } from '../social/linkedinUploader';
import { gatherStatus } from '../auth/authManager';
import type { GenerationContext, TopicSuggestion, VideoFormat } from '../types';

export async function pickTopic(): Promise<{ topic: string; estimatedDuration: number; style?: string }> {
  const { mode } = await inquirer.prompt<{ mode: 'ai' | 'manual' }>([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to choose your topic?',
      choices: [
        { name: 'AI Choose Topic (recommended)', value: 'ai' },
        { name: 'Manual Topic Input', value: 'manual' },
      ],
    },
  ]);

  if (mode === 'ai') {
    logger.step('Asking AI for trending developer topics...');
    const suggestions = await generateTopicSuggestions();

    const { pick } = await inquirer.prompt<{ pick: number }>([
      {
        type: 'list',
        name: 'pick',
        message: 'Pick a topic:',
        choices: suggestions.map((s, idx) => ({
          name: `${s.title}  (${s.difficulty}, ~${Math.round(s.estimatedDuration / 60)}m)\n     ↳ ${s.hook}`,
          value: idx,
          short: s.title,
        })),
        pageSize: 10,
      },
    ]);
    const chosen: TopicSuggestion = suggestions[pick];
    return { topic: chosen.title, estimatedDuration: chosen.estimatedDuration };
  }

  const answers = await inquirer.prompt<{ topic: string; style: string; minutes: string }>([
    { type: 'input', name: 'topic', message: 'Enter your topic:', validate: (v) => v.trim().length > 3 || 'Topic too short.' },
    {
      type: 'list',
      name: 'style',
      message: 'Style:',
      choices: ['tutorial', 'explainer', 'tips'],
    },
    {
      type: 'input',
      name: 'minutes',
      message: 'Target duration (minutes, optional):',
      default: '3',
      validate: (v) => !v || /^\d+(\.\d+)?$/.test(v) || 'Must be a number',
    },
  ]);
  const minutes = parseFloat(answers.minutes || '3');
  return { topic: answers.topic.trim(), estimatedDuration: minutes * 60, style: answers.style };
}

export async function pickFormat(): Promise<VideoFormat> {
  const { format } = await inquirer.prompt<{ format: VideoFormat }>([
    {
      type: 'list',
      name: 'format',
      message: 'Pick a video format:',
      choices: [
        { name: 'YouTube Shorts / Reels (9:16, ≤ 90s)', value: 'shorts' },
        { name: 'Long Tutorial Video (16:9, 5–30 min)', value: 'long' },
      ],
    },
  ]);
  return format;
}

export async function runPipeline(ctx: { topic: string; format: VideoFormat; estimatedDuration: number; style?: string }): Promise<GenerationContext> {
  ensureDirs();

  logger.step('Generating storyboard via AI (Gemini → Mistral fallback)...');
  let storyboard = await generateStoryboard({
    topic: ctx.topic,
    format: ctx.format,
    estimatedDuration: ctx.estimatedDuration,
    style: ctx.style,
  });
  logger.success(`Storyboard: ${storyboard.scenes.length} scenes, ${storyboard.totalDuration.toFixed(1)}s total`);

  logger.step(`Generating voice narration (${storyboard.scenes.length} scenes)...`);
  storyboard = await generateAllAudio(storyboard);

  logger.step('Merging audio into single track...');
  const audioPath = await mergeAllAudio(storyboard);
  logger.success(`Audio merged: ${audioPath}`);

  logger.step('Building Remotion composition data...');
  const timing = buildTiming(storyboard);
  writeJSON(PATHS.storyboardFile, storyboard);
  writeJSON(PATHS.timingFile, timing);
  logger.success(`Timing: ${timing.totalFrames} frames @ ${timing.fps}fps (${formatDuration(timing.totalFrames / timing.fps)})`);

  logger.step('Rendering video (this may take a few minutes)...');
  const result = await renderAndExport({
    storyboard,
    timing,
    audioPath,
    format: ctx.format,
  });

  logger.divider();
  logger.success(`Video exported: ${result.videoPath}`);
  logger.success(`Duration: ${formatDuration(result.durationSeconds)} | Size: ${result.fileSizeMB} MB | ${result.width}x${result.height}`);

  return {
    topic: ctx.topic,
    format: ctx.format,
    storyboard,
    timing,
    videoPath: result.videoPath,
    thumbnailPath: result.thumbnailPath,
    durationSeconds: result.durationSeconds,
  };
}

export async function offerSocialUpload(ctx: GenerationContext): Promise<void> {
  if (!ctx.videoPath || !ctx.storyboard) return;
  const statuses = await gatherStatus();
  const ytAvail = statuses.find((s) => s.platform === 'youtube')?.connected;
  const igAvail = statuses.find((s) => s.platform === 'instagram')?.connected;
  const liAvail = statuses.find((s) => s.platform === 'linkedin')?.connected;

  const choices = [
    { name: ytAvail ? 'YouTube  — connected' : 'YouTube  (not connected)', value: 'youtube', disabled: !ytAvail },
    { name: igAvail ? 'Instagram — connected' : 'Instagram (not connected)', value: 'instagram', disabled: !igAvail },
    { name: liAvail ? 'LinkedIn  — connected' : 'LinkedIn  (not connected)', value: 'linkedin', disabled: !liAvail },
  ];

  if (!ytAvail && !igAvail && !liAvail) {
    logger.warn('No social accounts connected — skipping upload step.');
    logger.info('Run: npm run auth:youtube  /  auth:instagram  /  auth:linkedin');
    return;
  }

  const { picks } = await inquirer.prompt<{ picks: string[] }>([
    {
      type: 'checkbox',
      name: 'picks',
      message: 'Post to which platforms?',
      choices,
    },
  ]);

  if (!picks || picks.length === 0) {
    logger.info('Skipped social posting. MP4 saved to: ' + ctx.videoPath);
    return;
  }

  if (picks.includes('youtube')) {
    try {
      logger.step('Generating YouTube SEO copy...');
      const chapters = chaptersFromStoryboard(ctx.storyboard.scenes);
      const copy = await generateYouTubeCopy({
        topic: ctx.topic,
        durationSeconds: ctx.durationSeconds || 0,
        chapters,
      });
      logger.info(`Title: ${copy.title}`);
      const res = await uploadToYouTube({
        videoPath: ctx.videoPath,
        thumbnailPath: ctx.thumbnailPath,
        copy,
        format: ctx.format,
      });
      logger.success(`YouTube live: ${res.url}`);
    } catch (err: any) {
      logger.error('YouTube upload failed: ' + err.message);
    }
  }

  if (picks.includes('instagram')) {
    try {
      logger.step('Generating Instagram caption...');
      const copy = await generateInstagramCopy({ topic: ctx.topic });
      const res = await uploadToInstagram({ videoPath: ctx.videoPath, copy });
      logger.success(`Instagram posted: ${res.permalink || res.mediaId}`);
    } catch (err: any) {
      logger.error('Instagram upload failed: ' + err.message);
    }
  }

  if (picks.includes('linkedin')) {
    try {
      logger.step('Generating LinkedIn post...');
      const copy = await generateLinkedInCopy({ topic: ctx.topic });
      const res = await uploadToLinkedIn({ videoPath: ctx.videoPath, copy, topic: ctx.topic });
      logger.success(`LinkedIn posted: ${res.url || res.postId}`);
    } catch (err: any) {
      logger.error('LinkedIn upload failed: ' + err.message);
    }
  }
}

export async function cleanupTemp(): Promise<void> {
  try {
    cleanTemp();
  } catch {
    /* ignore */
  }
}

