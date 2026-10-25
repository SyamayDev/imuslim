// Pengukuran loudness ITU-R BS.1770-4 / EBU R128 (K-weighting, gating −70 LUFS & −10 LU)
// dan true-peak (oversampling 4× dengan filter interpolasi windowed-sinc).
import { SR } from './dsp.mjs';

if (SR !== 48000) throw new Error('Koefisien K-weighting di berkas ini untuk 48 kHz.');

function kWeight(x) {
  const y = new Float64Array(x.length);
  // tahap 1: high-shelf (efek kepala)
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = 1.53512485958697 * x[i] - 2.69169618940638 * x1 + 1.19839281085285 * x2 + 1.69065929318241 * y1 - 0.73248077421585 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  // tahap 2: high-pass RLB
  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;
  for (let i = 0; i < y.length; i++) {
    const xi = y[i];
    const v = xi - 2 * x1 + x2 + 1.99004745483398 * y1 - 0.99007225036621 * y2;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/** Loudness terintegrasi (LUFS) untuk rentang sampel [from, to). */
export function integrated(bus, from = 0, to = bus.length) {
  const L = kWeight(bus.L.subarray(from, to));
  const R = kWeight(bus.R.subarray(from, to));
  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const z = [];
  // jumlah kuadrat kumulatif → blok cepat
  const cum = new Float64Array(L.length + 1);
  for (let i = 0; i < L.length; i++) cum[i + 1] = cum[i] + L[i] * L[i] + R[i] * R[i];
  for (let s = 0; s + block <= L.length; s += hop) z.push((cum[s + block] - cum[s]) / block);
  if (!z.length) return -Infinity;
  const lk = (m) => -0.691 + 10 * Math.log10(m + 1e-30);
  const abs = z.filter((m) => lk(m) > -70);
  if (!abs.length) return -Infinity;
  const rel = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((m) => lk(m) > rel);
  return lk(gated.reduce((a, b) => a + b, 0) / gated.length);
}

/** Jangkauan loudness (LRA) sederhana: P95 − P10 dari loudness jangka pendek (3 dtk). */
export function lra(bus) {
  const L = kWeight(bus.L);
  const R = kWeight(bus.R);
  const block = 3 * SR;
  const hop = Math.round(0.1 * SR);
  const cum = new Float64Array(L.length + 1);
  for (let i = 0; i < L.length; i++) cum[i + 1] = cum[i] + L[i] * L[i] + R[i] * R[i];
  const st = [];
  for (let s = 0; s + block <= L.length; s += hop) st.push(-0.691 + 10 * Math.log10((cum[s + block] - cum[s]) / block + 1e-30));
  const abs = st.filter((v) => v > -70);
  if (abs.length < 2) return 0;
  const mean = 10 * Math.log10(abs.map((v) => 10 ** (v / 10)).reduce((a, b) => a + b, 0) / abs.length);
  const g = abs.filter((v) => v > mean - 20).sort((a, b) => a - b);
  const q = (p) => g[Math.min(g.length - 1, Math.floor(p * (g.length - 1)))];
  return q(0.95) - q(0.1);
}

// Interpolasi 4× (windowed-sinc Hann, 48 tap): nilai di t = i + p/4 = Σ x[i+m]·k_p(m).
const HALF = 24;
const KER = [1, 2, 3].map((p) => {
  const row = new Float64Array(2 * HALF);
  for (let j = 0; j < 2 * HALF; j++) {
    const m = j - HALF + 1;
    const d = p / 4 - m;
    const sinc = Math.abs(d) < 1e-12 ? 1 : Math.sin(Math.PI * d) / (Math.PI * d);
    row[j] = sinc * (0.5 + 0.5 * Math.cos((Math.PI * d) / HALF));
  }
  return row;
});

/** True-peak (dBTP) maksimum dari kedua kanal. */
export function truePeak(bus) {
  let peak = 0;
  for (const x of [bus.L, bus.R]) {
    for (let i = 0; i < x.length; i++) {
      const s = Math.abs(x[i]);
      if (s > peak) peak = s;
      if (i < HALF || i + HALF >= x.length) continue;
      // antar-sampel hanya bisa melampaui puncak bila sampel sekitarnya sudah tinggi
      if (Math.max(s, Math.abs(x[i + 1])) < peak * 0.5) continue;
      for (const row of KER) {
        let acc = 0;
        for (let j = 0; j < 2 * HALF; j++) acc += x[i + j - HALF + 1] * row[j];
        const a = Math.abs(acc);
        if (a > peak) peak = a;
      }
    }
  }
  return 20 * Math.log10(peak + 1e-12);
}

/** Amplop true-peak per sampel (maks |x| dan 3 titik antar-sampel), gabungan dua kanal. */
export function tpEnvelope(bus) {
  const n = bus.length;
  const env = new Float32Array(n);
  let gmax = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i]));
    env[i] = s;
    if (s > gmax) gmax = s;
  }
  const floor = gmax * 0.3;
  for (const x of [bus.L, bus.R]) {
    for (let i = HALF; i + HALF < n; i++) {
      if (Math.max(Math.abs(x[i]), Math.abs(x[i + 1])) < floor) continue;
      let m = 0;
      for (const row of KER) {
        let acc = 0;
        for (let j = 0; j < 2 * HALF; j++) acc += x[i + j - HALF + 1] * row[j];
        if (Math.abs(acc) > m) m = Math.abs(acc);
      }
      if (m > env[i]) env[i] = m;
      if (m > env[i + 1]) env[i + 1] = m;
    }
  }
  return env;
}

export function samplePeak(bus) {
  let p = 0;
  for (let i = 0; i < bus.length; i++) p = Math.max(p, Math.abs(bus.L[i]), Math.abs(bus.R[i]));
  return 20 * Math.log10(p + 1e-12);
}
