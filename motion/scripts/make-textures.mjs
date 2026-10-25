// Tekstur film grain (deterministik) — 8 ubin 512×512, diputar bergantian per frame.
// Dibuat sekali sebagai PNG agar render 4K tidak perlu menghitung noise tiap frame.
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public/textures');
await mkdir(out, { recursive: true });

// PRNG mulberry32 → hasil sama setiap kali dijalankan.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE = 512;
for (let i = 0; i < 8; i++) {
  const r = rng(1000 + i);
  const buf = Buffer.alloc(SIZE * SIZE);
  for (let p = 0; p < buf.length; p++) {
    // Distribusi mendekati Gauss (jumlah 3 uniform) → grain halus, bukan "salju".
    const v = (r() + r() + r()) / 3;
    buf[p] = Math.max(0, Math.min(255, Math.round(128 + (v - 0.5) * 2.4 * 128)));
  }
  await sharp(buf, { raw: { width: SIZE, height: SIZE, channels: 1 } }).png().toFile(resolve(out, `grain-${i}.png`));
}
console.log('make-textures: 8 ubin grain siap');
