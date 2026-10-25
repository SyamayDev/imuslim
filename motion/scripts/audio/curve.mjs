// QA: kurva loudness per bar (jendela 2,4 dtk) dari berkas WAV → lihat lonjakan/jatuh mendadak.
//   node scripts/audio/curve.mjs out/audio/imuslim-reel-musik.wav
import { readFile } from 'node:fs/promises';
import { Bus, SR } from './dsp.mjs';
import { integrated } from './loudness.mjs';

const file = process.argv[2];
const buf = await readFile(file);
let off = 12;
while (buf.toString('ascii', off, off + 4) !== 'data') off += 8 + buf.readUInt32LE(off + 4);
const n = buf.readUInt32LE(off + 4) / 6;
const bus = new Bus(n / SR);
for (let i = 0, o = off + 8; i < n; i++, o += 6) {
  bus.L[i] = buf.readIntLE(o, 3) / 8388608;
  bus.R[i] = buf.readIntLE(o + 3, 3) / 8388608;
}
const bar = 2.4 * SR;
const rows = [];
for (let b = 0; b * bar < n; b++) {
  const a = Math.round(b * bar);
  const z = Math.min(n, Math.round((b + 1) * bar));
  const l = integrated(bus, a, z);
  rows.push(l);
  const w = Math.max(0, Math.round((l + 30) * 2));
  console.log(`bar ${String(b).padStart(2)} ${(b * 2.4).toFixed(1).padStart(5)}s ${l.toFixed(1).padStart(6)} LUFS ${'█'.repeat(w)}`);
}
let worst = 0;
for (let i = 1; i < rows.length; i++) worst = Math.max(worst, rows[i - 1] - rows[i]);
console.log(`penurunan terbesar antarbar: ${worst.toFixed(1)} LU`);
