// QA visual audio: spektrogram (frekuensi log) + amplop puncak + batas adegan → PNG.
//   node scripts/audio/spectrogram.mjs out/audio/imuslim-film-musik.wav film out.png
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { VARIANTS } from '../../src/timeline.js';

const [file, variant = 'film', outPng = file.replace(/\.wav$/, '.png')] = process.argv.slice(2);
const buf = await readFile(file);
const sr = buf.readUInt32LE(24);
const bits = buf.readUInt16LE(34);
let dataOff = 12;
while (buf.toString('ascii', dataOff, dataOff + 4) !== 'data') dataOff += 8 + buf.readUInt32LE(dataOff + 4);
const n = buf.readUInt32LE(dataOff + 4) / (2 * (bits / 8));
const mono = new Float32Array(n);
const L = new Float32Array(n);
const R = new Float32Array(n);
for (let i = 0, o = dataOff + 8; i < n; i++) {
  L[i] = buf.readIntLE(o, 3) / 8388608;
  R[i] = buf.readIntLE(o + 3, 3) / 8388608;
  mono[i] = (L[i] + R[i]) / 2;
  o += 6;
}

const W = 1600;
const SH = 420;
const EH = 120;
const H = SH + EH;
const FFT = 4096;
const img = Buffer.alloc(W * H * 3);
const win = new Float32Array(FFT).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT - 1)));

function fft(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const ar = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const ai = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
      }
    }
  }
}

const fLo = 30;
const fHi = 18000;
const colour = (v) => {
  // v 0..1 → hitam → hijau zamrud → emas → putih
  const stops = [
    [0, [4, 10, 8]],
    [0.35, [10, 80, 60]],
    [0.65, [200, 160, 70]],
    [0.85, [250, 220, 150]],
    [1, [255, 255, 255]],
  ];
  for (let s = 1; s < stops.length; s++) {
    if (v <= stops[s][0]) {
      const [a, ca] = stops[s - 1];
      const [b, cb] = stops[s];
      const p = (v - a) / (b - a);
      return ca.map((c, k) => Math.round(c + (cb[k] - c) * p));
    }
  }
  return [255, 255, 255];
};

for (let x = 0; x < W; x++) {
  const c = Math.floor((x / W) * n);
  const re = new Float32Array(FFT);
  const im = new Float32Array(FFT);
  for (let i = 0; i < FFT; i++) {
    const j = c - FFT / 2 + i;
    re[i] = j >= 0 && j < n ? mono[j] * win[i] : 0;
  }
  fft(re, im);
  for (let y = 0; y < SH; y++) {
    const f = fLo * (fHi / fLo) ** (1 - y / SH);
    const bin = Math.min(FFT / 2 - 1, Math.round((f / sr) * FFT));
    const mag = Math.hypot(re[bin], im[bin]) / (FFT / 4);
    const dbv = 20 * Math.log10(mag + 1e-9);
    const v = Math.max(0, Math.min(1, (dbv + 90) / 80));
    const [r, g, b] = colour(v);
    const o = (y * W + x) * 3;
    img[o] = r;
    img[o + 1] = g;
    img[o + 2] = b;
  }
  // amplop puncak (dB) di bawah
  const a = Math.floor((x / W) * n);
  const z = Math.floor(((x + 1) / W) * n);
  let pk = 0;
  for (let i = a; i < z; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const pdb = 20 * Math.log10(pk + 1e-9);
  const hgt = Math.max(0, Math.min(EH, ((pdb + 48) / 48) * EH));
  for (let y = 0; y < EH; y++) {
    const o = ((SH + y) * W + x) * 3;
    const on = EH - y <= hgt;
    const over = pdb > -1;
    img[o] = on ? (over ? 255 : 210) : 12;
    img[o + 1] = on ? (over ? 60 : 180) : 16;
    img[o + 2] = on ? (over ? 60 : 110) : 14;
  }
}
// garis frekuensi acuan & batas adegan
for (const f of [100, 1000, 10000]) {
  const y = Math.round(SH * (1 - Math.log(f / fLo) / Math.log(fHi / fLo)));
  for (let x = 0; x < W; x += 3) {
    const o = (y * W + x) * 3;
    img[o] = img[o + 1] = img[o + 2] = 120;
  }
}
const v = VARIANTS[variant];
for (const seg of v.segments) {
  const x = Math.round((seg.from / v.durationInFrames) * W);
  for (let y = 0; y < H; y += 2) {
    const o = (y * W + x) * 3;
    img[o] = 255;
    img[o + 1] = 255;
    img[o + 2] = 255;
  }
}
// −14 dBFS & −1 dBFS penanda di amplop
for (const d of [-1, -14]) {
  const y = SH + Math.round(EH - ((d + 48) / 48) * EH);
  for (let x = 0; x < W; x += 2) {
    const o = (y * W + x) * 3;
    img[o] = 120;
    img[o + 1] = 120;
    img[o + 2] = 255;
  }
}
const labels = v.segments.map((s) => `<text x="${(s.from / v.durationInFrames) * W + 4}" y="16" font-family="sans-serif" font-size="14" fill="#fff">${s.scene}</text>`).join('');
const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${labels}<text x="${W - 8}" y="${H - 8}" text-anchor="end" font-family="sans-serif" font-size="13" fill="#9cf">${file.split(/[\\/]/).pop()}</text></svg>`);
await sharp(img, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: svg }]).png().toFile(outPng);
console.log(outPng);
