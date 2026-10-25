// Animatic: satu still per shot, diambil dari video hasil render → JPEG ringan untuk STORYBOARD.md.
//   node scripts/make-animatic.mjs film   (out/imuslim-film-1080p.mp4 → storyboard-animatic.jpg)
//   node scripts/make-animatic.mjs reel   (out/imuslim-reel-1080x1920.mp4 → storyboard-reel-animatic.jpg)
import { execFile } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { VARIANTS } from '../src/timeline.js';
import { ffmpegBin } from './ffmpeg-bin.mjs';

const run = promisify(execFile);
const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const key = process.argv[2] ?? 'film';
const SRC = { film: 'out/imuslim-film-1080p.mp4', reel: 'out/imuslim-reel-1080x1920.mp4' };
const OUT = { film: 'storyboard-animatic.jpg', reel: 'storyboard-reel-animatic.jpg' };
const v = VARIANTS[key];
// satu frame per segmen, di 60% durasinya (gerak sudah tenang)
const shots = v.segments.map((s, i) => ({ n: i + 1, scene: s.scene, frame: Math.round(s.from + s.dur * 0.6) }));
const tw = key === 'reel' ? 216 : 384;
const th = key === 'reel' ? 384 : 216;
const tiles = [];
for (const s of shots) {
  const png = join(tmpdir(), `anim-${process.pid}-${s.n}.png`);
  await run(ffmpegBin('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-y', '-ss', (s.frame / 60).toFixed(3), '-i', resolve(motion, SRC[key]), '-frames:v', '1', png]);
  const label = Buffer.from(`<svg width="${tw}" height="${th}"><rect x="0" y="${th - 24}" width="${tw}" height="24" fill="rgba(0,0,0,.7)"/><text x="6" y="${th - 7}" font-family="Arial" font-size="13" fill="#fff">${s.n}. ${s.scene} · f${s.frame} · ${(s.frame / 60).toFixed(1)} dtk</text></svg>`);
  tiles.push(await sharp(png).resize(tw, th).composite([{ input: label }]).png().toBuffer());
  await unlink(png);
}
const cols = key === 'reel' ? 6 : 4;
const rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * (tw + 4), height: rows * (th + 4), channels: 3, background: '#111' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * (tw + 4), top: Math.floor(i / cols) * (th + 4) })))
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(resolve(motion, OUT[key]));
console.log(resolve(motion, OUT[key]));
