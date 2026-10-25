// Instrumen bernuansa Timur Tengah/Islami yang disintesis dari nol:
// oud & qanun (senar dipetik, Karplus-Strong), ney (seruling napas), darbuka, daf/rebana, riq,
// bass, pad gesek, drone, dan efek sinematik (impact, riser, whoosh, bel, detik jam, angin).
import { biquad, filt, midiHz, rng, SR, sweepBandpass } from './dsp.mjs';

const N = (sec) => Math.max(1, Math.round(sec * SR));
/** Pudar singkat di ujung agar bunyi yang terpotong tidak menimbulkan klik. */
function tail(out, sec = 0.02) {
  const n = Math.min(out.length, N(sec));
  for (let i = 0; i < n; i++) out[out.length - 1 - i] *= i / n;
  return out;
}

/* ---------------------------------------------------------------- senar dipetik */
/**
 * Karplus-Strong dengan delay pecahan (penalaan akurat), eksitasi berbentuk (posisi petik),
 * dan T60 per nada. bright 0..1 mengatur kecerahan petikan.
 */
function ksString(freq, dur, { t60 = 2, bright = 0.5, pick = 0.18, seed = 1 } = {}) {
  const out = new Float32Array(N(dur));
  const D = SR / freq - 0.5;
  const decay = 0.001 ** (1 / (t60 * freq));
  const r = rng(seed);
  const exLen = Math.ceil(D) + 2;
  const ex = new Float32Array(exLen);
  let lp = 0;
  const a = 0.15 + bright * 0.8;
  for (let i = 0; i < exLen; i++) {
    lp += a * (r() * 2 - 1 - lp);
    ex[i] = lp;
  }
  const pp = Math.max(1, Math.round(exLen * pick));
  for (let i = exLen - 1; i >= pp; i--) ex[i] -= ex[i - pp];
  const read = (pos) => {
    if (pos < 0) return 0;
    const i0 = Math.floor(pos);
    const f = pos - i0;
    return out[i0] * (1 - f) + (out[i0 + 1] ?? 0) * f;
  };
  for (let i = 0; i < out.length; i++) {
    const y1 = read(i - D);
    const y2 = read(i - D - 1);
    out[i] = (i < exLen ? ex[i] : 0) + decay * 0.5 * (y1 + y2);
  }
  return out;
}

/** Oud: dua senar sepasang (sedikit sumbang), badan kayu, sedikit "petikan" plektrum. */
export function oud(midi, dur = 1.6, { vel = 1, seed = 7 } = {}) {
  const f = midiHz(midi);
  const t60 = Math.max(0.7, 2.6 - (midi - 48) * 0.045);
  const a = ksString(f * 2 ** (2.5 / 1200), dur, { t60, bright: 0.42 + vel * 0.2, pick: 0.13, seed });
  const b = ksString(f * 2 ** (-2.5 / 1200), dur, { t60: t60 * 0.92, bright: 0.38 + vel * 0.2, pick: 0.17, seed: seed + 101 });
  const out = new Float32Array(a.length);
  const d = N(0.004);
  for (let i = 0; i < out.length; i++) out[i] = a[i] + (i >= d ? b[i - d] : 0) * 0.85;
  // plektrum: klik singkat
  const r = rng(seed + 9);
  for (let i = 0; i < N(0.006); i++) out[i] += (r() * 2 - 1) * 0.25 * vel * (1 - i / N(0.006));
  filt(out, biquad('peaking', 210, 1.1, 6), biquad('peaking', 620, 1.4, 3.5), biquad('peaking', 1900, 2, -3), biquad('highshelf', 4200, 0.7, -9), biquad('highpass', 70));
  // pelepasan halus di ujung
  const rl = N(0.05);
  for (let i = 0; i < rl; i++) out[out.length - 1 - i] *= i / rl;
  for (let i = 0; i < out.length; i++) out[i] *= vel * 0.55;
  return out;
}

/** Qanun: senar terang, dering panjang. */
export function qanun(midi, dur = 2.2, { vel = 1, seed = 3 } = {}) {
  const f = midiHz(midi);
  const out = ksString(f, dur, { t60: Math.max(1, 3.2 - (midi - 60) * 0.05), bright: 0.8, pick: 0.09, seed });
  filt(out, biquad('peaking', 2600, 1.2, 3), biquad('highpass', 140), biquad('highshelf', 7000, 0.7, -4));
  const rl = N(0.04);
  for (let i = 0; i < rl; i++) out[out.length - 1 - i] *= i / rl;
  for (let i = 0; i < out.length; i++) out[i] *= vel * 0.42;
  return out;
}

/* ---------------------------------------------------------------- ney (seruling napas) */
/**
 * Frasa ney: notes = [[midi, durDetik], ...] legato dengan portamento, vibrato yang tumbuh,
 * dan desis napas. Mengembalikan satu sinyal mono.
 */
export function ney(notes, { vel = 1, seed = 11, breath = 0.22 } = {}) {
  const total = notes.reduce((s, [, d]) => s + d, 0) + 0.6;
  const out = new Float32Array(N(total));
  const r = rng(seed);
  const bp = biquad('bandpass', 1800, 0.8);
  let phase = 0;
  let t = 0;
  let prevF = midiHz(notes[0][0]);
  const glide = 0.07;
  for (let ni = 0; ni < notes.length; ni++) {
    const [m, d] = notes[ni];
    const f = midiHz(m);
    const start = N(t);
    const len = N(d);
    for (let i = 0; i < len && start + i < out.length; i++) {
      const tt = i / SR;
      const g = Math.min(1, tt / glide);
      const vibDepth = Math.min(1, Math.max(0, (tt - 0.22) / 0.45)) * 0.011;
      const ff = (prevF + (f - prevF) * (g * g * (3 - 2 * g))) * (1 + vibDepth * Math.sin(2 * Math.PI * 5.3 * (t + tt)));
      phase += (2 * Math.PI * ff) / SR;
      const tone = Math.sin(phase) + 0.32 * Math.sin(2 * phase + 0.4) + 0.1 * Math.sin(3 * phase + 1.1) + 0.04 * Math.sin(4 * phase);
      const noise = bp(r() * 2 - 1);
      out[start + i] = tone * 0.6 + noise * breath * (1.2 - 0.2 * Math.min(1, tt / 0.3));
    }
    prevF = f;
    t += d;
  }
  // amplop frasa: serangan 0,14 dtk, pelepasan 0,45 dtk, sedikit "tekanan" di awal tiap frasa
  const att = N(0.14);
  const endAt = N(total - 0.6);
  const rel = N(0.45);
  for (let i = 0; i < out.length; i++) {
    let e = i < att ? i / att : 1;
    if (i > endAt) e *= Math.max(0, 1 - (i - endAt) / rel);
    out[i] *= e * vel * 0.32;
  }
  filt(out, biquad('lowpass', 5200, 0.6), biquad('highpass', 180));
  return out;
}

/* ---------------------------------------------------------------- perkusi */
/** Darbuka: 'dum' (bass), 'tek' (tepi, nyaring), 'ka' (tepi, tangan lemah). */
export function darbuka(kind, { vel = 1, seed = 5 } = {}) {
  const r = rng(seed);
  if (kind === 'dum') {
    const len = N(0.55);
    const out = new Float32Array(len);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const f = 82 + 95 * Math.exp(-t / 0.018);
      ph += (2 * Math.PI * f) / SR;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.28) + (r() * 2 - 1) * Math.exp(-t / 0.006) * 0.35;
    }
    filt(out, biquad('lowpass', 1800), biquad('peaking', 110, 1, 4));
    for (let i = 0; i < len; i++) out[i] = Math.tanh(out[i] * 1.4 * vel) * 0.75;
    return tail(out, 0.03);
  }
  const len = N(kind === 'tek' ? 0.22 : 0.16);
  const out = new Float32Array(len);
  const ringF = kind === 'tek' ? 920 : 760;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * ringF) / SR;
    out[i] = (r() * 2 - 1) * Math.exp(-t / (kind === 'tek' ? 0.03 : 0.022)) + Math.sin(ph) * 0.28 * Math.exp(-t / 0.07);
  }
  filt(out, biquad('bandpass', kind === 'tek' ? 3400 : 2300, 0.9), biquad('highpass', 400));
  for (let i = 0; i < len; i++) out[i] *= vel * (kind === 'tek' ? 1.25 : 0.7);
  return tail(out, 0.03);
}

/** Daf/rebana: 'boom' (dentum dalam) atau 'jingle' (kerincingan). */
export function daf(kind, { vel = 1, seed = 13 } = {}) {
  const r = rng(seed);
  if (kind === 'boom') {
    const len = N(1.1);
    const out = new Float32Array(len);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const f = 62 + 70 * Math.exp(-t / 0.03);
      ph += (2 * Math.PI * f) / SR;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.55) + (r() * 2 - 1) * Math.exp(-t / 0.02) * 0.25;
    }
    filt(out, biquad('lowpass', 900));
    for (let i = 0; i < len; i++) out[i] *= vel * 0.9;
    return tail(out, 0.06);
  }
  // kerincingan: beberapa logam kecil dengan saat sedikit berbeda
  const len = N(0.32);
  const out = new Float32Array(len);
  for (let k = 0; k < 5; k++) {
    const off = Math.floor(r() * N(0.012));
    const f = biquad('bandpass', 5200 + r() * 3600, 6);
    for (let i = 0; i + off < len; i++) {
      const t = i / SR;
      out[i + off] += f((r() * 2 - 1) * Math.exp(-t / 0.09));
    }
  }
  filt(out, biquad('highpass', 3000));
  for (let i = 0; i < len; i++) out[i] *= vel * 1.6;
  return tail(out, 0.03);
}

/* ---------------------------------------------------------------- bass, pad, drone */
export function bass(midi, dur = 0.55, { vel = 1 } = {}) {
  const f = midiHz(midi);
  const out = new Float32Array(N(dur + 0.08));
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.006) * Math.exp(-t / (dur * 0.9));
    out[i] = (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)) * env;
  }
  filt(out, biquad('lowpass', 900), biquad('highpass', 30));
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.3) * vel * 0.55;
  return tail(out, 0.04);
}

/** Pad gesek hangat: beberapa saw sumbang per nada, dibuka perlahan. Stereo {L,R}. */
export function pad(chord, dur, { attack = 0.9, release = 1.6, cutoff = 1800, vel = 1, seed = 21 } = {}) {
  const len = N(dur + release);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  const r = rng(seed);
  chord.forEach((m) => {
    for (let v = 0; v < 5; v++) {
      const det = (v - 2) * 7 + (r() - 0.5) * 4;
      const f = midiHz(m) * 2 ** (det / 1200);
      let ph = r();
      const pan = (v - 2) / 2.2;
      const gl = Math.cos(((pan + 1) * Math.PI) / 4);
      const gr = Math.sin(((pan + 1) * Math.PI) / 4);
      for (let i = 0; i < len; i++) {
        ph += f / SR;
        if (ph >= 1) ph -= 1;
        const s = 2 * ph - 1;
        L[i] += s * gl;
        R[i] += s * gr;
      }
    }
  });
  const fl = [biquad('lowpass', cutoff, 0.6), biquad('lowpass', cutoff * 1.3, 0.5)];
  const fr = [biquad('lowpass', cutoff, 0.6), biquad('lowpass', cutoff * 1.3, 0.5)];
  const att = N(attack);
  const relS = N(dur);
  const relN = N(release);
  const norm = (vel * 0.05) / Math.sqrt(chord.length);
  for (let i = 0; i < len; i++) {
    let e = i < att ? (i / att) ** 1.5 : 1;
    if (i > relS) e *= Math.max(0, 1 - (i - relS) / relN);
    L[i] = fl[1](fl[0](L[i])) * e * norm;
    R[i] = fr[1](fr[0](R[i])) * e * norm;
  }
  return { L, R };
}

/** Drone D (tanpura-ish): akar + kelima + oktaf, filter bernapas pelan. */
export function drone(rootMidi, dur, { vel = 1 } = {}) {
  const len = N(dur);
  const out = new Float32Array(len);
  const notes = [rootMidi, rootMidi + 7, rootMidi + 12];
  const phs = notes.map(() => 0);
  for (let i = 0; i < len; i++) {
    let s = 0;
    notes.forEach((m, k) => {
      phs[k] += midiHz(m) / SR;
      if (phs[k] >= 1) phs[k] -= 1;
      s += (2 * phs[k] - 1) * (k === 0 ? 1 : 0.5);
    });
    out[i] = s;
  }
  const lp = biquad('lowpass', 700, 0.7);
  const att = N(Math.min(2, dur / 3));
  const rel = N(Math.min(2.5, dur / 3));
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = Math.min(1, i / att) * Math.min(1, (len - i) / rel);
    out[i] = lp(out[i]) * e * vel * 0.06 * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.13 * t));
  }
  return out;
}

/* ---------------------------------------------------------------- efek sinematik */
/** Impact: dentum sub, retakan tengah, dan semburan udara. */
export function impact({ vel = 1, seed = 31, size = 1 } = {}) {
  const r = rng(seed);
  const len = N(2.6 * size);
  const out = new Float32Array(len);
  let ph = 0;
  const lpN = biquad('lowpass', 380);
  const bpC = biquad('bandpass', 1400, 1.2);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 44 + 110 * Math.exp(-t / 0.05);
    ph += (2 * Math.PI * f) / SR;
    const n = r() * 2 - 1;
    out[i] = Math.sin(ph) * Math.exp(-t / (0.6 * size)) * 0.75 + lpN(n) * Math.exp(-t / 0.22) * 0.8 + bpC(n) * Math.exp(-t / 0.06) * 0.8;
  }
  for (let i = 0; i < len; i++) out[i] = Math.tanh(out[i] * 1.6) * vel * 0.85;
  return tail(out, 0.08);
}

/** Riser: desis yang naik (sapuan bandpass) + nada naik samar. Berakhir tepat di `dur`. */
export function riser(dur, { vel = 1, seed = 41, from = 300, to = 7000 } = {}) {
  const r = rng(seed);
  const len = N(dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = r() * 2 - 1;
  sweepBandpass(out, (t) => from * (to / from) ** (t / dur), 1.4);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = t / dur;
    ph += (2 * Math.PI * (120 + 900 * p * p)) / SR;
    out[i] = (out[i] * 1.6 + Math.sin(ph) * 0.12) * p ** 2.2 * vel;
  }
  return tail(out, 0.012);
}

/** Ayunan terbalik (reverse swell) yang memuncak tepat di akhir. */
export function swell(dur, { vel = 1, seed = 43 } = {}) {
  const r = rng(seed);
  const len = N(dur);
  const out = new Float32Array(len);
  const lp = biquad('lowpass', 2400);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    out[i] = lp(r() * 2 - 1) * p ** 3 * vel * 0.9;
  }
  return tail(out, 0.012);
}

/** Whoosh stereo: desis bandpass yang menyapu dan berpindah kiri→kanan. */
export function whoosh(dur = 0.6, { vel = 1, seed = 51, dir = 1, low = 400, high = 3200 } = {}) {
  const r = rng(seed);
  const len = N(dur);
  const mono = new Float32Array(len);
  for (let i = 0; i < len; i++) mono[i] = r() * 2 - 1;
  sweepBandpass(mono, (t) => {
    const p = t / dur;
    return low + (high - low) * Math.sin(Math.PI * p);
  }, 1.1);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const env = Math.sin(Math.PI * p) ** 2 * vel * 1.4;
    const pan = dir * (p * 2 - 1) * 0.8;
    const a = ((pan + 1) * Math.PI) / 4;
    L[i] = mono[i] * env * Math.cos(a);
    R[i] = mono[i] * env * Math.sin(a);
  }
  return { L, R };
}

/** Bel FM (lonceng logam lembut) — untuk momen "mengunci" & kilau. */
export function bell(midi, { vel = 1, dur = 2.4, ratio = 3.5, index = 2.2 } = {}) {
  const f = midiHz(midi);
  const len = N(dur);
  const out = new Float32Array(len);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    pm += (2 * Math.PI * f * ratio) / SR;
    const idx = index * Math.exp(-t / 0.35);
    pc += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(pc + idx * Math.sin(pm)) * Math.exp(-t / (dur * 0.35)) * Math.min(1, t / 0.002);
  }
  for (let i = 0; i < len; i++) out[i] *= vel * 0.32;
  return tail(out, 0.08);
}

/** Detik jam / klik halus. */
export function tick({ vel = 1, seed = 61, tone = 4200 } = {}) {
  const r = rng(seed);
  const len = N(0.03);
  const out = new Float32Array(len);
  const bp = biquad('bandpass', tone, 3);
  for (let i = 0; i < len; i++) out[i] = bp(r() * 2 - 1) * Math.exp(-(i / SR) / 0.005);
  for (let i = 0; i < len; i++) out[i] *= vel * 2.2;
  return tail(out, 0.004);
}

/** Riser sub-bass: sinus rendah yang naik perlahan (terasa, nyaris tak terdengar). */
export function subRise(dur, { from = 30, to = 58, vel = 1 } = {}) {
  const len = N(dur);
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    ph += (2 * Math.PI * (from + (to - from) * p * p)) / SR;
    out[i] = (Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * Math.min(1, p * 3) * (0.35 + 0.65 * p) * Math.min(1, (len - i) / N(0.08)) * vel * 0.5;
  }
  return out;
}

/** Kilau: desis tinggi yang menyapu naik singkat (untuk kilap emas). */
export function glint({ vel = 1, seed = 81, dur = 0.42 } = {}) {
  const r = rng(seed);
  const len = N(dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = r() * 2 - 1;
  sweepBandpass(out, (t) => 5000 * 2.4 ** (t / dur), 5);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    out[i] *= Math.sin(Math.PI * p) ** 1.5 * vel * 1.3;
  }
  return out;
}

/** Kicau burung fajar: beberapa suku kata sinus yang menyapu cepat. */
export function bird({ vel = 1, seed = 91 } = {}) {
  const r = rng(seed);
  const syll = 3 + Math.floor(r() * 4);
  const base = 2600 + r() * 1600;
  const len = N(0.12 * syll + 0.3);
  const out = new Float32Array(len);
  let t0 = 0;
  for (let s = 0; s < syll; s++) {
    const d = 0.04 + r() * 0.06;
    const f0 = base * (0.85 + r() * 0.3);
    const f1 = f0 * (r() < 0.5 ? 1.5 : 0.7);
    let ph = 0;
    const st = N(t0);
    const n = N(d);
    for (let i = 0; i < n && st + i < len; i++) {
      const p = i / n;
      ph += (2 * Math.PI * (f0 + (f1 - f0) * p + 180 * Math.sin(2 * Math.PI * 38 * (i / SR)))) / SR;
      out[st + i] += Math.sin(ph) * Math.sin(Math.PI * p) ** 2;
    }
    t0 += d + 0.025 + r() * 0.05;
  }
  filt(out, biquad('highpass', 1500));
  for (let i = 0; i < len; i++) out[i] *= vel * 0.22;
  return out;
}

/** Tepuk tangan (sahbe): tiga tepukan beruntun yang sangat rapat + ekor ruang pendek. */
export function clap({ vel = 1, seed = 101 } = {}) {
  const r = rng(seed);
  const len = N(0.26);
  const out = new Float32Array(len);
  [0, 0.009, 0.02].forEach((t0, k) => {
    const st = N(t0 + r() * 0.002);
    const decay = k === 2 ? 0.055 : 0.007;
    for (let i = 0; st + i < len; i++) out[st + i] += (r() * 2 - 1) * Math.exp(-(i / SR) / decay) * (k === 2 ? 1 : 0.7);
  });
  filt(out, biquad('bandpass', 1250, 0.8), biquad('highpass', 450), biquad('peaking', 2600, 1, 3));
  for (let i = 0; i < len; i++) out[i] *= vel * 1.6;
  return tail(out, 0.03);
}

/** Angin malam: desis rendah yang bernapas, stereo tak berkorelasi. */
export function wind(dur, { vel = 1, seed = 71 } = {}) {
  const len = N(dur);
  const mk = (sd) => {
    const r = rng(sd);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) out[i] = r() * 2 - 1;
    sweepBandpass(out, (t) => 380 + 260 * Math.sin(2 * Math.PI * 0.07 * t + sd) + 120 * Math.sin(2 * Math.PI * 0.19 * t), 0.9);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      out[i] *= vel * 0.35 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.11 * t + sd * 2));
    }
    return out;
  };
  return { L: mk(seed), R: mk(seed + 1) };
}
