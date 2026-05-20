import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PATHS } from '../utils/fileManager';
import { logger } from '../utils/logger';
import { getAudioDurationSeconds } from './audioDuration';
import { recalculateTimings } from '../ai/storyboardEngine';
import type { Storyboard, VideoFormat } from '../types';

export interface VoiceOptions {
  voice?: string;
  rate?: string;
  pitch?: string;
}

const DEFAULT_VOICE_LONG = 'en-US-GuyNeural';
const DEFAULT_VOICE_SHORTS = 'en-US-AriaNeural';

function defaultVoice(format: VideoFormat): string {
  return format === 'shorts' ? DEFAULT_VOICE_SHORTS : DEFAULT_VOICE_LONG;
}

function runCommand(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: false });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`${cmd} exited ${code}: ${stderr.trim()}`));
      else resolve({ stdout, stderr });
    });
  });
}

async function detectEdgeTTSCommand(): Promise<string> {
  const candidates = process.platform === 'win32'
    ? ['edge-tts.exe', 'edge-tts']
    : ['edge-tts'];
  for (const cmd of candidates) {
    try {
      await runCommand(cmd, ['--list-voices']);
      return cmd;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'edge-tts CLI not found. Install with: pip install edge-tts\n' +
      'Verify with: edge-tts --list-voices',
  );
}

let cachedEdgeCmd: string | null = null;

export async function getEdgeTTSCommand(): Promise<string> {
  if (cachedEdgeCmd) return cachedEdgeCmd;
  cachedEdgeCmd = await detectEdgeTTSCommand();
  return cachedEdgeCmd;
}

export async function synthesizeScene(
  text: string,
  outputMp3: string,
  outputVtt: string,
  options: VoiceOptions = {},
): Promise<void> {
  const cmd = await getEdgeTTSCommand();
  const voice = options.voice || DEFAULT_VOICE_LONG;
  const args = [
    '--voice', voice,
    '--text', text,
    '--write-media', outputMp3,
    '--write-subtitles', outputVtt,
  ];
  if (options.rate) args.push('--rate', options.rate);
  if (options.pitch) args.push('--pitch', options.pitch);

  await runCommand(cmd, args);
  if (!fs.existsSync(outputMp3) || fs.statSync(outputMp3).size === 0) {
    throw new Error('edge-tts produced no audio file.');
  }
}

export async function generateAllAudio(storyboard: Storyboard, options: VoiceOptions = {}): Promise<Storyboard> {
  const voice = options.voice || defaultVoice(storyboard.format);
  if (!fs.existsSync(PATHS.tempAudio)) fs.mkdirSync(PATHS.tempAudio, { recursive: true });
  if (!fs.existsSync(PATHS.tempSubs)) fs.mkdirSync(PATHS.tempSubs, { recursive: true });

  for (let i = 0; i < storyboard.scenes.length; i++) {
    const scene = storyboard.scenes[i];
    const mp3 = path.join(PATHS.tempAudio, `scene_${scene.id}.mp3`);
    const vtt = path.join(PATHS.tempSubs, `scene_${scene.id}.vtt`);

    await synthesizeScene(scene.narration, mp3, vtt, { ...options, voice });
    const actualDuration = await getAudioDurationSeconds(mp3);
    const padded = Math.max(1, actualDuration + 0.5);

    scene.audioFile = mp3;
    scene.subtitleFile = vtt;
    scene.duration = padded;

    logger.success(`Scene ${i + 1}/${storyboard.scenes.length} audio ready (${actualDuration.toFixed(1)}s)`);
  }

  recalculateTimings(storyboard);
  return storyboard;
}
