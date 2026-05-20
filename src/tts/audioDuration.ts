import { spawn } from 'child_process';

function ffprobePath(): string {
  try {
    const installer = require('@ffprobe-installer/ffprobe');
    if (installer?.path) return installer.path as string;
  } catch {
    /* fall through to system ffprobe */
  }
  return 'ffprobe';
}

export function getAudioDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = ffprobePath();
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ];
    const proc = spawn(probe, args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err) => {
      reject(new Error(`ffprobe spawn failed (${probe}): ${err.message}. Try: npm install @ffprobe-installer/ffprobe`));
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe exited with ${code}: ${stderr}`));
      }
      const value = parseFloat(stdout.trim());
      if (isNaN(value)) {
        return reject(new Error(`Could not parse duration from: ${stdout}`));
      }
      resolve(value);
    });
  });
}
