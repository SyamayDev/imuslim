// Lokasi ffmpeg/ffprobe bawaan Remotion (tidak perlu instalasi ffmpeg terpisah).
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function ffmpegBin(name = 'ffmpeg') {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const base = resolve(motion, 'node_modules/@remotion');
  const dir = readdirSync(base).find((d) => d.startsWith('compositor-') && existsSync(resolve(base, d, exe)));
  if (!dir) throw new Error(`${name} bawaan Remotion tidak ditemukan`);
  return resolve(base, dir, exe);
}
