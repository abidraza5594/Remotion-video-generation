import fs from 'fs';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { PATHS } from '../utils/fileManager';
import type { Storyboard } from '../types';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);

export async function mergeAllAudio(storyboard: Storyboard): Promise<string> {
  if (!fs.existsSync(PATHS.tempAudio)) fs.mkdirSync(PATHS.tempAudio, { recursive: true });

  const concatList = path.join(PATHS.tempAudio, 'concat.txt');
  const finalMp3 = path.join(PATHS.tempAudio, 'full_narration.mp3');

  const lines: string[] = [];
  for (const scene of storyboard.scenes) {
    if (!scene.audioFile || !fs.existsSync(scene.audioFile)) {
      throw new Error(`Missing audio for scene ${scene.id} (${scene.audioFile})`);
    }
    const safePath = scene.audioFile.replace(/\\/g, '/').replace(/'/g, "'\\''");
    lines.push(`file '${safePath}'`);
  }
  fs.writeFileSync(concatList, lines.join('\n'), 'utf-8');

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(concatList)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .on('error', reject)
      .on('end', () => resolve())
      .save(finalMp3);
  });

  return finalMp3;
}
