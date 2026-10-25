// Inti DSP: bus stereo, filter biquad, reverb Freeverb, kompresor, limiter, WAV 24-bit.
// Semua suara film disintesis dari nol (tanpa sampel berhak cipta).
import { writeFile } from 'node:fs/promises';

export const SR = 48000;

/* ---------------------------------------------------------------- acak deterministik */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
export const db = (d) => 10 ** (d / 20);

/* ---------------------------------------------------------------- bus stereo */
export class Bus {
  constructor(seconds) {
    this.length = Math.ceil(seconds * SR);
    this.L = new Float32Array(this.length);
    this.R = new Float32Array(this.length);
  }
  /** Tambah sinyal mono (pan −1..1, hukum daya-sama) atau stereo {L,R} pada waktu t (dtk). */
  add(sig, t, gain = 1, pan = 0) {
    const start = Math.round(t * SR);
    if (sig.L) {
      const n = Math.min(sig.L.length, this.length - start);
      for (let i = Math.max(0, -start); i < n; i++) {
        this.L[start + i] += sig.L[i] * gain;
        this.R[start + i] += sig.R[i] * gain;
      }
      return this;
    }
    const a = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(a) * gain * Math.SQRT2;
    const gr = Math.sin(a) * gain * Math.SQRT2;
    const n = Math.min(sig.length, this.length - start);
    for (let i = Math.max(0, -start); i < n; i++) {
      this.L[start + i] += sig[i] * gl;
      this.R[start + i] += sig[i] * gr;
    }
    return this;
  }
  mixInto(target, gain = 1) {
    for (let i = 0; i < this.length; i++) {
      target.L[i] += this.L[i] * gain;
      target.R[i] += this.R[i] * gain;
    }
    return target;
  }
  /** Volume sepanjang waktu: fn(tDetik) → faktor. */
  automate(fn) {
    for (let i = 0; i < this.length; i++) {
      const g = fn(i / SR);
      this.L[i] *= g;
      this.R[i] *= g;
    }
    return this;
  }
}

/* ---------------------------------------------------------------- filter biquad (RBJ) */
export function biquad(type, freq, q = 0.707, gainDb = 0) {
  const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
  const cos = Math.cos(w);
  const sin = Math.sin(w);
  const alpha = sin / (2 * q);
  const A = 10 ** (gainDb / 40);
  let b0;
  let b1;
  let b2;
  let a0;
  let a1;
  let a2;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A;
      b1 = -2 * cos;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cos;
      a2 = 1 - alpha / A;
      break;
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cos + s);
      b1 = -2 * A * (A - 1 + (A + 1) * cos);
      b2 = A * (A + 1 + (A - 1) * cos - s);
      a0 = A + 1 - (A - 1) * cos + s;
      a1 = 2 * (A - 1 - (A + 1) * cos);
      a2 = A + 1 - (A - 1) * cos - s;
      break;
    }
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cos + s);
      b1 = 2 * A * (A - 1 - (A + 1) * cos);
      b2 = A * (A + 1 - (A - 1) * cos - s);
      a0 = A + 1 + (A - 1) * cos + s;
      a1 = -2 * (A - 1 + (A + 1) * cos);
      a2 = A + 1 + (A - 1) * cos - s;
      break;
    }
    default:
      throw new Error(`biquad ${type}?`);
  }
  const c = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (x) => {
    const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

/** Terapkan rangkaian filter ke Float32Array (di tempat). */
export function filt(sig, ...filters) {
  for (const f of filters) for (let i = 0; i < sig.length; i++) sig[i] = f(sig[i]);
  return sig;
}

/** Filter bandpass dengan frekuensi berubah (sapuan) — fq(t) → Hz. */
export function sweepBandpass(sig, fq, q = 2) {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let cc = [0, 0, 0, 0, 0];
  for (let i = 0; i < sig.length; i++) {
    // Koefisien diperbarui tiap 32 sampel (cukup halus, jauh lebih cepat).
    if (i % 32 === 0) {
      const w = (2 * Math.PI * Math.min(fq(i / SR), SR * 0.45)) / SR;
      const alpha = Math.sin(w) / (2 * q);
      const a0 = 1 + alpha;
      cc = [alpha / a0, 0, -alpha / a0, (-2 * Math.cos(w)) / a0, (1 - alpha) / a0];
    }
    const x = sig[i];
    const y = cc[0] * x + cc[1] * x1 + cc[2] * x2 - cc[3] * y1 - cc[4] * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    sig[i] = y;
  }
  return sig;
}

/* ---------------------------------------------------------------- reverb Freeverb */
const COMB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => Math.round((n * SR) / 44100));
const ALLP = [556, 441, 341, 225].map((n) => Math.round((n * SR) / 44100));
function makeChannel(spread, room, damp) {
  const combs = COMB.map((n) => ({ buf: new Float32Array(n + spread), i: 0, store: 0 }));
  const alls = ALLP.map((n) => ({ buf: new Float32Array(n + spread), i: 0 }));
  return (x) => {
    let out = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.store = y * (1 - damp) + c.store * damp;
      c.buf[c.i] = x + c.store * room;
      c.i = (c.i + 1) % c.buf.length;
      out += y;
    }
    for (const a of alls) {
      const b = a.buf[a.i];
      a.buf[a.i] = out + b * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      out = b - out;
    }
    return out;
  };
}
/** Reverb stereo (hanya sinyal basah). size 0..1 (ruang), damp 0..1, preDelay detik. */
export function reverb(bus, { size = 0.86, damp = 0.32, wet = 0.35, preDelay = 0.02, width = 1, lowCut = 180, highCut = 9000 } = {}) {
  const out = new Bus(bus.length / SR);
  const room = 0.7 + size * 0.28;
  const l = makeChannel(0, room, damp);
  const r = makeChannel(23, room, damp);
  const pd = Math.round(preDelay * SR);
  const hpL = biquad('highpass', lowCut);
  const hpR = biquad('highpass', lowCut);
  const lpL = biquad('lowpass', highCut);
  const lpR = biquad('lowpass', highCut);
  for (let i = 0; i < bus.length; i++) {
    const j = i - pd;
    const inp = j >= 0 ? (bus.L[j] + bus.R[j]) * 0.015 : 0;
    const yl = lpL(hpL(l(inp)));
    const yr = lpR(hpR(r(inp)));
    const mid = (yl + yr) / 2;
    const side = ((yl - yr) / 2) * width;
    out.L[i] = (mid + side) * wet;
    out.R[i] = (mid - side) * wet;
  }
  return out;
}

/** Delay stereo ping-pong (sinyal basah). */
export function pingPong(bus, { time = 0.3, feedback = 0.35, wet = 0.18, highCut = 5000 } = {}) {
  const out = new Bus(bus.length / SR);
  const d = Math.round(time * SR);
  const bl = new Float32Array(d);
  const br = new Float32Array(d);
  const lp1 = biquad('lowpass', highCut);
  const lp2 = biquad('lowpass', highCut);
  let k = 0;
  for (let i = 0; i < bus.length; i++) {
    const yl = bl[k];
    const yr = br[k];
    bl[k] = lp1((bus.L[i] + bus.R[i]) * 0.5 + yr * feedback);
    br[k] = lp2(yl * feedback);
    k = (k + 1) % d;
    out.L[i] = yl * wet;
    out.R[i] = yr * wet;
  }
  return out;
}

/* ---------------------------------------------------------------- dinamika */
/** Kompresor RMS stereo-linked (perekat bus). */
export function compress(bus, { threshold = -16, ratio = 2.5, attack = 0.01, release = 0.15, makeup = 0 } = {}) {
  const at = Math.exp(-1 / (attack * SR));
  const rt = Math.exp(-1 / (release * SR));
  let env = 0;
  const mk = db(makeup);
  for (let i = 0; i < bus.length; i++) {
    const x = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i]));
    env = x > env ? at * env + (1 - at) * x : rt * env + (1 - rt) * x;
    const lvl = 20 * Math.log10(env + 1e-9);
    const over = lvl - threshold;
    const g = over > 0 ? db(-over * (1 - 1 / ratio)) : 1;
    bus.L[i] *= g * mk;
    bus.R[i] *= g * mk;
  }
  return bus;
}

/**
 * Limiter look-ahead offline: kebutuhan gain → min-hold ±la → rata-rata kotak ±la (gain mulus,
 * dijamin ≤ kebutuhan di puncak) → pelepasan eksponensial. `peaks` (opsional) = amplop
 * true-peak per sampel (mis. dari interpolasi sinc) yang dikalikan `peakScale`.
 */
export function limit(bus, { ceilingDb = -1.2, lookahead = 0.005, release = 0.1, peaks = null, peakScale = 1 } = {}) {
  const ceil = db(ceilingDb);
  const la = Math.max(1, Math.round(lookahead * SR));
  const n = bus.length;
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let p;
    if (peaks) p = peaks[i] * peakScale;
    else {
      p = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i]));
      if (i > 0) p = Math.max(p, Math.abs(bus.L[i - 1] + bus.L[i]) * 0.53, Math.abs(bus.R[i - 1] + bus.R[i]) * 0.53);
    }
    need[i] = p > ceil ? ceil / p : 1;
  }
  // min-hold simetris (deque monoton)
  const held = new Float32Array(n);
  const q = new Int32Array(n);
  let h = 0;
  let t = 0;
  for (let i = 0, j = 0; i < n; i++) {
    for (; j < n && j <= i + la; j++) {
      while (t > h && need[q[t - 1]] >= need[j]) t--;
      q[t++] = j;
    }
    while (q[h] < i - la) h++;
    held[i] = need[q[h]];
  }
  // rata-rata kotak ±la
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + held[i];
  const rel = Math.exp(-1 / (release * SR));
  let g = 1;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - la);
    const b = Math.min(n, i + la + 1);
    const target = (cum[b] - cum[a]) / (b - a);
    g = target < g ? target : rel * g + (1 - rel) * target;
    bus.L[i] *= g;
    bus.R[i] *= g;
  }
  return bus;
}

/** Kliping lembut (saturasi hangat). */
export function softClip(bus, drive = 1.2) {
  const k = Math.tanh(drive);
  for (let i = 0; i < bus.length; i++) {
    bus.L[i] = Math.tanh(bus.L[i] * drive) / k;
    bus.R[i] = Math.tanh(bus.R[i] * drive) / k;
  }
  return bus;
}

export function scale(bus, gain) {
  for (let i = 0; i < bus.length; i++) {
    bus.L[i] *= gain;
    bus.R[i] *= gain;
  }
  return bus;
}

/* ---------------------------------------------------------------- WAV 24-bit */
export async function writeWav(path, bus) {
  const n = bus.length;
  const bytes = 44 + n * 2 * 3;
  const buf = Buffer.alloc(bytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(bytes - 8, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 6, 28);
  buf.writeUInt16LE(6, 32);
  buf.writeUInt16LE(24, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 6, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const ch of [bus.L, bus.R]) {
      const v = Math.max(-1, Math.min(1, ch[i]));
      const s = Math.round(v * 8388607);
      buf.writeIntLE(s, o, 3);
      o += 3;
    }
  }
  await writeFile(path, buf);
}
