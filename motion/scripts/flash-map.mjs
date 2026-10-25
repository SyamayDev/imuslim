// QA: peta panas kedipan (jumlah transisi maksimum per piksel dalam jendela 1 dtk) → PNG.
//   node scripts/flash-map.mjs <video> <mulaiDtk> <durasiDtk> <out.png>
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { ffmpegBin } from './ffmpeg-bin.mjs';

const [file, ss = '0', dur = '60', out = 'flash-map.png'] = process.argv.slice(2);
const W = 192;
const H = 108;
const px = W * H;
const proc = spawn(ffmpegBin('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-ss', ss, '-t', dur, '-i', file, '-vf', `scale=${W}:${H}:flags=area`, '-pix_fmt', 'gray', '-c:v', 'rawvideo', '-f', 'image2pipe', '-']);
const chunks = [];
for await (const c of proc.stdout) chunks.push(c);
const buf = Buffer.concat(chunks);
const frames = Math.floor(buf.length / px);
const lin = (y) => {
  const v = Math.min(1, Math.max(0, (y - 16) / 219));
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const turn = new Float32Array(px);
const dir = new Int8Array(px);
for (let i = 0; i < px; i++) turn[i] = lin(buf[i]);
const ev = Array.from({ length: frames }, () => []);
for (let f = 1; f < frames; f++) {
  for (let i = 0; i < px; i++) {
    const L = lin(buf[f * px + i]);
    const T = turn[i];
    if (dir[i] === 1 && L > T) turn[i] = L;
    else if (dir[i] === -1 && L < T) turn[i] = L;
    else if (Math.abs(L - T) >= 0.1 && Math.min(L, T) < 0.8) {
      ev[f].push(i);
      dir[i] = L > T ? 1 : -1;
      turn[i] = L;
    }
  }
}
const cnt = new Uint16Array(px);
const max = new Uint16Array(px);
for (let f = 1; f < frames; f++) {
  for (const i of ev[f]) cnt[i]++;
  if (f - 60 >= 1) for (const i of ev[f - 60]) cnt[i]--;
  for (let i = 0; i < px; i++) if (cnt[i] > max[i]) max[i] = cnt[i];
}
const img = Buffer.alloc(px * 3);
let over = 0;
for (let i = 0; i < px; i++) {
  const m = max[i];
  if (m >= 7) over++;
  img[i * 3] = m >= 7 ? 255 : Math.min(255, m * 30);
  img[i * 3 + 1] = m >= 7 ? 40 : Math.min(255, m * 30);
  img[i * 3 + 2] = m >= 7 ? 40 : Math.min(255, m * 30);
}
await sharp(img, { raw: { width: W, height: H, channels: 3 } }).resize(W * 4, H * 4, { kernel: 'nearest' }).png().toFile(out);
console.log(`${out}: ${((100 * over) / px).toFixed(2)}% piksel ≥ 7 transisi/dtk`);
