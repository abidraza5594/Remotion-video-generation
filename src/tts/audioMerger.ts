import fs from 'fs';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { PATHS } from '../utils/fileManager';
import { logger } from '../utils/logger';
import { getAudioDurationSeconds } from './audioDuration';
import type { Storyboard } from '../types';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);

export async function mergeAllAudio(storyboard: Storyboard): Promise<string> {
  if (!fs.existsSync(PATHS.tempAudio)) fs.mkdirSync(PATHS.tempAudio, { recursive: true });

  for (const scene of storyboard.scenes) {
    if (!scene.audioFile || !fs.existsSync(scene.audioFile)) {
      throw new Error(`Missing audio for scene ${scene.id} (${scene.audioFile})`);
    }
    const size = fs.statSync(scene.audioFile).size;
    if (size === 0) throw new Error(`Empty audio file for scene ${scene.id}`);
  }

  const finalMp3 = path.join(PATHS.tempAudio, 'full_narration.mp3');

  try {
    await concatWithFilter(storyboard, finalMp3);
  } catch (err: any) {
    logger.warn(`Audio concat-filter failed (${err.message}). Retrying with demuxer + re-encode...`);
    await concatWithDemuxer(storyboard, finalMp3);
  }

  if (!fs.existsSync(finalMp3) || fs.statSync(finalMp3).size === 0) {
    throw new Error('Final narration MP3 is missing or empty after merge.');
  }

  const totalSec = await getAudioDurationSeconds(finalMp3);
  logger.info(`  full_narration.mp3: ${(fs.statSync(finalMp3).size / 1048576).toFixed(2)} MB, ${totalSec.toFixed(2)}s`);
  return finalMp3;
}

function concatWithFilter(storyboard: Storyboard, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    for (const scene of storyboard.scenes) cmd.input(scene.audioFile!);

    const n = storyboard.scenes.length;
    const filter = storyboard.scenes
      .map((_, i) => `[${i}:a]`)
      .join('') + `concat=n=${n}:v=0:a=1[outa]`;

    let stderrTail = '';
    cmd
      .addOption('-filter_complex', filter)
      .outputOptions([
        '-map', '[outa]',
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        '-ar', '48000',
      ])
      .on('stderr', (line) => {
        stderrTail = (stderrTail + '\n' + line).slice(-1500);
      })
      .on('error', (err) => reject(new Error(`${err.message}\n${stderrTail}`)))
      .on('end', () => resolve())
      .save(output);
  });
}

function concatWithDemuxer(storyboard: Storyboard, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const concatList = path.join(PATHS.tempAudio, 'concat.txt');
    const lines: string[] = [];
    for (const scene of storyboard.scenes) {
      const safePath = scene.audioFile!.replace(/\\/g, '/').replace(/'/g, "'\\''");
      lines.push(`file '${safePath}'`);
    }
    fs.writeFileSync(concatList, lines.join('\n'), 'utf-8');

    let stderrTail = '';
    ffmpeg()
      .input(concatList)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        '-ar', '48000',
      ])
      .on('stderr', (line) => {
        stderrTail = (stderrTail + '\n' + line).slice(-1500);
      })
      .on('error', (err) => reject(new Error(`${err.message}\n${stderrTail}`)))
      .on('end', () => resolve())
      .save(output);
  });
}
