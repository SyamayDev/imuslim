// Bukti QR terbaca: ambil frame dari VIDEO FINAL (setelah kompresi H.264), lalu decode dengan
// jsQR — juga pada versi diperkecil (simulasi kamera jauh / layar kecil).
//   node scripts/verify-qr.mjs out/imuslim-reel-1080x1920.mp4 85
import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import jsQR from 'jsqr';
import sharp from 'sharp';
import qr from '../src/data/qr.json' with { type: 'json' };
import { ffmpegBin } from './ffmpeg-bin.mjs';

const run = promisify(execFile);
const [file, ...times] = process.argv.slice(2);
let ok = true;
for (const t of times.length ? times : ['80', '85', '89']) {
  const png = join(tmpdir(), `qr-${process.pid}-${t}.png`);
  await run(ffmpegBin('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-y', '-ss', t, '-i', file, '-frames:v', '1', png]);
  for (const width of [1080, 540, 360]) {
    const { data, info } = await sharp(png).resize(width).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const res = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    const pass = res?.data === qr.url;
    ok &&= pass;
    console.log(`t=${t}s lebar ${width}px → ${res ? `"${res.data}"` : 'tidak terbaca'} ${pass ? 'LOLOS' : 'GAGAL'}`);
  }
  await unlink(png);
}
if (!ok) process.exitCode = 1;
