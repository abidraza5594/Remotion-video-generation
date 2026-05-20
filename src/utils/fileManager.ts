import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

export const PATHS = {
  root: ROOT,
  temp: path.join(ROOT, 'temp'),
  tempAudio: path.join(ROOT, 'temp', 'audio'),
  tempSubs: path.join(ROOT, 'temp', 'subs'),
  output: path.join(ROOT, 'output'),
  generated: path.join(ROOT, 'src', 'remotion', 'generated'),
  authFile: path.join(ROOT, '.auth.json'),
  storyboardFile: path.join(ROOT, 'src', 'remotion', 'generated', 'storyboard.json'),
  timingFile: path.join(ROOT, 'src', 'remotion', 'generated', 'timing.json'),
};

export function ensureDirs(): void {
  for (const dir of [PATHS.temp, PATHS.tempAudio, PATHS.tempSubs, PATHS.output, PATHS.generated]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function cleanTemp(): void {
  if (fs.existsSync(PATHS.temp)) {
    fs.rmSync(PATHS.temp, { recursive: true, force: true });
  }
}

export function writeJSON(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function readJSON<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

export function timestampString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function fileSizeMB(filePath: string): number {
  const stats = fs.statSync(filePath);
  return Math.round((stats.size / (1024 * 1024)) * 10) / 10;
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
