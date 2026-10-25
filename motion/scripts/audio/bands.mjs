// QA: energi per oktaf (dB relatif) untuk seluruh berkas atau rentang detik tertentu.
//   node scripts/audio/bands.mjs file.wav [startSec endSec]
import { readFile } from 'node:fs/promises';
import { biquad } from './dsp.mjs';

const [file, a = '0', z = '1e9'] = process.argv.slice(2);
const buf = await readFile(file);
let off = 12;
while (buf.toString('ascii', off, off + 4) !== 'data') off += 8 + buf.readUInt32LE(off + 4);
const n = buf.readUInt32LE(off + 4) / 6;
const s0 = Math.max(0, Math.round(+a * 48000));
const s1 = Math.min(n, Math.round(+z * 48000));
const x = new Float32Array(s1 - s0);
for (let i = s0, o = off + 8 + s0 * 6; i < s1; i++, o += 6) x[i - s0] = (buf.readIntLE(o, 3) + buf.readIntLE(o + 3, 3)) / 2 / 8388608;
const centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const out = [];
for (const fc of centres) {
  const f1 = biquad('bandpass', fc, 1.41);
  const f2 = biquad('bandpass', fc, 1.41);
  let e = 0;
  for (let i = 0; i < x.length; i++) {
    const y = f2(f1(x[i]));
    e += y * y;
  }
  out.push(10 * Math.log10(e / x.length + 1e-20));
}
const ref = Math.max(...out);
console.log(centres.map((c, i) => `${c >= 1000 ? c / 1000 + 'k' : c}:${(out[i] - ref).toFixed(1)}`).join('  '));
