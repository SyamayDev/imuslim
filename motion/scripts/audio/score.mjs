// Partitur film: maqam Hijaz pada D, 100 BPM, 4/4 — dikunci ke frame video lewat src/timeline.js.
// Setiap adegan menulis bunyinya dalam frame LOKAL adegan; segmen varian (reel/teaser/ident)
// otomatis memotongnya, jadi semua varian tetap sinkron dengan gambar.
import { spring } from 'remotion';
import { montageParts, SCENE_CUES, VARIANTS } from '../../src/timeline.js';
import { Bus, rng, SR } from './dsp.mjs';
import * as I from './instruments.mjs';
import { scoreReel } from './song-reel.mjs';

export const FPS = 60;
const BAR = 144;
const S16 = 9;
const S8 = 18;

/* ---------------------------------------------------------------- bahan musik */
// Hijaz D: D Eb F# G A Bb C
const CH = {
  D: [50, 57, 62, 66, 69],
  Dopen: [50, 57, 62, 69],
  Dbig: [50, 57, 62, 66, 69, 74],
  Gm: [43, 55, 58, 62, 67],
  Eb: [51, 58, 63, 67, 70],
  Cm: [48, 55, 60, 63, 67],
};
const ROOT = { D: 38, Dopen: 38, Dbig: 38, Gm: 43, Eb: 39, Cm: 36 };
/** Tangga Hijaz naik C4 → D6 (16 nada). */
const RUN = [60, 62, 63, 66, 67, 69, 70, 72, 74, 75, 78, 79, 81, 82, 84, 86];

/** Hook oud 4 bar (satuan seperdelapan, tiap bar = 8). */
const HOOK = [
  { chord: 'D', notes: [[69, 2], [70, 1], [69, 1], [67, 1], [66, 1], [67, 2]] },
  { chord: 'D', notes: [[66, 1], [63, 1], [66, 1], [67, 1], [66, 2], [62, 2]] },
  { chord: 'Gm', notes: [[62, 1], [63, 1], [66, 1], [67, 1], [69, 2], [72, 1], [70, 1]] },
  { chord: 'D', notes: [[69, 3], [67, 1], [66, 1], [63, 1], [62, 2]] },
];

/** Pola darbuka per 16-an: [jenis, kekuatan]. D = dum, T = tek, k = ka. */
const PATTERNS = {
  maqsum: [['D', 1], null, ['T', 0.9], null, ['k', 0.45], null, ['T', 0.85], null, ['D', 0.95], null, ['k', 0.45], null, ['T', 0.9], null, ['k', 0.45], ['k', 0.3]],
  saidi: [['D', 1], null, ['T', 0.85], null, ['k', 0.4], null, ['D', 0.9], null, ['D', 0.95], null, ['k', 0.45], null, ['T', 0.9], null, ['k', 0.45], null],
  light: [null, null, ['k', 0.4], null, ['T', 0.6], null, ['k', 0.35], null, null, null, ['k', 0.4], null, ['T', 0.6], null, ['k', 0.35], null],
};

/* ---------------------------------------------------------------- penempatan */
function makeCtx(variant, i) {
  const seg = variant.segments[i];
  const off = seg.offset ?? 0;
  const end = off + seg.dur;
  return {
    seg,
    off,
    end,
    props: seg.props ?? {},
    prev: variant.segments[i - 1],
    next: variant.segments[i + 1],
    T: (f) => (seg.from + f - off) / FPS,
    has: (f) => f >= off && f < end,
  };
}

/** Bunyi yang MULAI di frame f (hanya bila f terlihat di segmen). */
function put(ctx, bus, f, make, gain = 1, pan = 0, jitter = 0) {
  if (!ctx.has(f)) return;
  bus.add(make(), Math.max(0, ctx.T(f) + jitter), gain, pan);
}
/** Bunyi yang BERAKHIR (memuncak) di frame fEnd, panjang maks durF. */
function putEnd(ctx, bus, fEnd, durF, make, gain = 1, pan = 0) {
  if (!(fEnd > ctx.off && fEnd <= ctx.end)) return;
  const f0 = Math.max(fEnd - durF, ctx.off);
  if (fEnd - f0 < 12) return;
  bus.add(make((fEnd - f0) / FPS), ctx.T(f0), gain, pan);
}
/** Rentang [a,b] yang terlihat, atau null. */
function span(ctx, f0, f1) {
  const a = Math.max(f0, ctx.off);
  const b = Math.min(f1, ctx.end);
  return b - a >= 24 ? [a, b] : null;
}
function padSpan(ctx, bus, f0, f1, chord, opts = {}, gain = 1) {
  const s = span(ctx, f0, f1);
  if (!s) return;
  const late = s[0] > f0; // dipotong di awal → serangan lebih cepat agar tidak "bolong"
  bus.add(I.pad(chord, (s[1] - s[0]) / FPS, { ...opts, attack: late ? Math.min(0.25, opts.attack ?? 0.9) : opts.attack }), ctx.T(s[0]), gain);
}

/** Melodi: notes [[midi|null, satuan]], satuan = `unit` frame. */
function line(ctx, bus, f0, notes, inst, r, { unit = S8, gain = 1, pan = 0, octave = 0, ring = 0.12, vel = 1 } = {}) {
  let f = f0;
  for (const [m, u] of notes) {
    if (m != null) {
      const dur = (u * unit) / FPS + ring;
      const v = vel * (0.9 + r() * 0.16);
      const seed = 1 + Math.floor(r() * 1e6);
      put(ctx, bus, f, () => inst(m + octave * 12, dur, { vel: v, seed }), gain, pan, (r() - 0.5) * 0.008);
    }
    f += u * unit;
  }
}

/** Groove perkusi (darbuka + riq + daf + bass) selama `bars` bar mulai f0. */
function groove(ctx, b, r, f0, bars, { style = 'maqsum', chord = 'D', vel = 1, daf = true, bass = true, riq = true, ghosts = true } = {}) {
  const pat = PATTERNS[style];
  for (let bar = 0; bar < bars; bar++) {
    for (let s = 0; s < 16; s++) {
      const f = f0 + bar * BAR + s * S16;
      const p = pat[s];
      const j = (r() - 0.5) * 0.007;
      const seed = 1 + Math.floor(r() * 1e6);
      const v = vel * (0.88 + r() * 0.22);
      if (p) {
        const [k, w] = p;
        const kind = k === 'D' ? 'dum' : k === 'T' ? 'tek' : 'ka';
        put(ctx, b.darb, f, () => I.darbuka(kind, { vel: v * w, seed }), k === 'D' ? 0.95 : 0.8, k === 'D' ? 0 : 0.12, j);
        if (k === 'D' && bass) put(ctx, b.mus, f, () => I.bass(ROOT[chord], 0.42, { vel: v * w }), 0.6, 0, j);
      } else if (ghosts && s % 2 === 1 && r() < 0.35) {
        put(ctx, b.darb, f, () => I.darbuka('ka', { vel: v * 0.22, seed }), 0.6, 0.18, j);
      }
      if (riq) {
        if (s % 4 === 2) put(ctx, b.darb, f, () => I.daf('jingle', { vel: v * 0.5, seed: seed + 3 }), 0.55, -0.35, j);
        else if (s % 2 === 1) put(ctx, b.darb, f, () => I.daf('jingle', { vel: v * 0.18, seed: seed + 5 }), 0.5, -0.3, j);
      }
      if (daf && s === 0) put(ctx, b.daf, f, () => I.daf('boom', { vel: v * 0.75, seed: seed + 7 }), 0.6, 0, j);
    }
  }
}

/** Gesekan senar oud (akor dipetik cepat). */
function strum(ctx, bus, f, chord, r, { gain = 0.7, dur = 2.6, vel = 0.9, spread = 0.014 } = {}) {
  chord.forEach((m, i) => put(ctx, bus, f, () => I.oud(m, dur, { vel, seed: 1 + Math.floor(r() * 1e6) }), gain, -0.25 + (i / Math.max(1, chord.length - 1)) * 0.5, i * spread));
}
/** Glissando qanun (deret nada cepat) mulai frame f. */
function gliss(ctx, bus, f, notes, { step = 0.026, gain = 0.5, vel = 0.4, ring = 2.2 } = {}) {
  if (!ctx.has(f)) return;
  notes.forEach((m, i) => bus.add(I.qanun(m, ring, { vel: vel + (i / notes.length) * 0.15, seed: 700 + m }), ctx.T(f) + i * step, gain, -0.5 + i / Math.max(1, notes.length - 1)));
}
function hit(ctx, b, f, { size = 1, vel = 1, bassNote = 38, daf = true, seed = 31 } = {}) {
  put(ctx, b.hit, f, () => I.impact({ vel, size, seed }), 1);
  if (daf) put(ctx, b.daf, f, () => I.daf('boom', { vel, seed: seed + 1 }), 0.7);
  if (bassNote) put(ctx, b.mus, f, () => I.bass(bassNote, 1.6 * size, { vel }), 0.6);
}
/** Whoosh yang memuncak tepat di frame f. */
function whooshAt(ctx, bus, f, dur, opts = {}, gain = 0.6) {
  if (!(f > ctx.off && f <= ctx.end)) return;
  const start = f - Math.round((dur / 2) * FPS);
  const w = I.whoosh(dur, opts);
  const cut = Math.max(0, ctx.off - start);
  const n = Math.round((cut / FPS) * SR);
  const L = w.L.slice(n);
  const R = w.R.slice(n);
  if (n) for (let i = 0, k = Math.min(L.length, 240); i < k; i++) {
    L[i] *= i / k;
    R[i] *= i / k;
  }
  bus.add({ L, R }, ctx.T(start + cut), gain);
}

/** Frame (relatif mulai) saat spring kompas pertama kali mencapai sasaran. */
function springCross(config, fps = FPS) {
  for (let f = 0; f < 240; f++) if (spring({ frame: f, fps, config: { damping: 11, stiffness: 120, mass: 0.9, ...config } }) >= 1) return f;
  return 30;
}

/* ---------------------------------------------------------------- adegan */
const SCENES = {
  S1(ctx, b, r) {
    const c = SCENE_CUES.S1;
    const s = span(ctx, 0, 288);
    if (s) b.sfx.add(I.subRise((s[1] - s[0]) / FPS, { from: 30, to: 52 }), ctx.T(s[0]), 0.35);
    padSpan(ctx, b.mus, 20, 288, CH.Dopen, { attack: 2.2, release: 2, cutoff: 900, vel: 0.6 });
    put(ctx, b.sfx, c.ignite, () => I.glint({ vel: 0.7, seed: 11 }), 0.5, -0.1);
    put(ctx, b.sfx, c.ignite, () => I.bell(81, { vel: 0.4, dur: 3.2 }), 0.45, 0.15);
    put(ctx, b.mus, c.ignite + 12, () => I.ney([[69, 1.2], [70, 0.45], [69, 0.35], [67, 0.35], [66, 0.9], [67, 0.3], [66, 0.3], [63, 0.5], [62, 1.9]], { seed: 101, vel: 0.9 }), 0.9, 0.05);
    putEnd(ctx, b.sfx, c.split, 90, (d) => I.swell(d, { vel: 0.55 }), 0.55);
    whooshAt(ctx, b.sfx, c.split + 6, 1.0, { vel: 0.7, low: 500, high: 5200 }, 0.6);
    put(ctx, b.mus, c.split, () => I.qanun(86, 3, { vel: 0.5, seed: 12 }), 0.55, 0.35);
    // reel: S1 terpotong — beri kilau pendek agar tidak sunyi
    if (ctx.off > c.ignite) put(ctx, b.sfx, ctx.off + 6, () => I.glint({ vel: 0.6, seed: 13 }), 0.45);
  },

  S2(ctx, b, r) {
    const toHit = ctx.next?.scene === 'S3';
    whooshAt(ctx, b.sfx, 24, 1.2, { vel: 0.55, dir: 1, low: 300, high: 2600 }, 0.55);
    padSpan(ctx, b.mus, 0, 144, CH.D, { attack: 1.2, cutoff: 1400, vel: 0.8 });
    padSpan(ctx, b.mus, 144, 288, CH.Eb, { attack: 0.8, cutoff: 1900, vel: 0.9 });
    [62, 66, 69, 74, 78, 74, 69, 66].forEach((m, i) => put(ctx, b.mus, i * S8, () => I.qanun(m, 1.8, { vel: 0.42 + i * 0.03, seed: 200 + i }), 0.7, 0.45 * Math.sin(i * 1.3)));
    [63, 67, 70, 75, 67, 70, 75, 79, 70, 75, 79, 82, 75, 79, 82, 87].forEach((m, i) =>
      put(ctx, b.mus, 144 + i * S16, () => I.qanun(m, 1.3, { vel: 0.38 + i * 0.03, seed: 300 + i }), 0.62, -0.45 + 0.9 * (i / 15)),
    );
    [36, 72, 108, 180, 216].forEach((f, i) => put(ctx, b.sfx, f, () => I.glint({ vel: 0.45, seed: 400 + i }), 0.3, i % 2 ? 0.55 : -0.55));
    put(ctx, b.sfx, SCENE_CUES.S2.bloom, () => I.bell(86, { vel: 0.35, dur: 2.6 }), 0.4);
    if (toHit) {
      putEnd(ctx, b.sfx, 288, 150, (d) => I.riser(d, { vel: 0.9 }), 0.7);
      putEnd(ctx, b.sfx, 288, 60, (d) => I.swell(d, { vel: 0.9 }), 0.8);
      [252, 261, 270].forEach((f, i) => put(ctx, b.darb, f, () => I.darbuka(i % 2 ? 'ka' : 'tek', { vel: 0.55 + i * 0.15, seed: 500 + i }), 0.8, 0.1));
    } else {
      putEnd(ctx, b.sfx, 288, 72, (d) => I.swell(d, { vel: 0.6 }), 0.6);
    }
  },

  S3(ctx, b, r) {
    const c = SCENE_CUES.S3;
    hit(ctx, b, c.hit, { size: 1.1, vel: 1, seed: 31 });
    padSpan(ctx, b.mus, 0, 144, CH.Gm, { attack: 0.12, cutoff: 2200, vel: 1 });
    padSpan(ctx, b.mus, 144, 288, CH.Cm, { attack: 0.6, cutoff: 2000, vel: 0.9 });
    const ost = [[55, 1], [55, 1], [58, 1], [55, 1], [62, 1], [58, 1], [57, 1], [55, 1], [60, 1], [60, 1], [63, 1], [60, 1], [67, 1], [63, 1], [62, 1], [60, 1]];
    line(ctx, b.mus, 0, ost, I.oud, r, { gain: 0.75, pan: -0.15, ring: 0.25, vel: 0.85 });
    [72, 144, 216].forEach((f) => put(ctx, b.daf, f, () => I.daf('boom', { vel: 0.6, seed: f }), 0.75));
    [36, 108, 180, 252].forEach((f) => put(ctx, b.darb, f, () => I.daf('jingle', { vel: 0.55, seed: f }), 0.5, -0.3));
    for (let k = 0; k < 8; k++) put(ctx, b.darb, 144 + k * S8 + S16, () => I.daf('jingle', { vel: 0.2 + k * 0.03, seed: 600 + k }), 0.45, 0.3);
    whooshAt(ctx, b.sfx, c.morph + 20, 1.1, { vel: 0.6, dir: -1, low: 250, high: 2200 }, 0.55);
    put(ctx, b.sfx, c.inside, () => I.bell(74, { vel: 0.45, dur: 3, ratio: 2, index: 1.4 }), 0.45);
    put(ctx, b.sfx, c.inside, () => I.glint({ vel: 0.55, seed: 33 }), 0.35);
    putEnd(ctx, b.sfx, 288, 84, (d) => I.riser(d, { vel: 0.5, from: 500, to: 5000 }), 0.45);
    whooshAt(ctx, b.sfx, 276, 1.2, { vel: 0.85, low: 300, high: 4200 }, 0.65);
  },

  S4(ctx, b, r) {
    const c = SCENE_CUES.S4;
    padSpan(ctx, b.mus, 0, c.hit, CH.Eb, { attack: 1.1, cutoff: 1700, vel: 0.9 });
    putEnd(ctx, b.sfx, c.hit, 144, (d) => I.riser(d, { vel: 1 }), 0.55);
    putEnd(ctx, b.sfx, c.hit, 54, (d) => I.swell(d, { vel: 1 }), 0.7);
    put(ctx, b.mus, c.arch, () => I.qanun(69, 2.2, { vel: 0.5, seed: 41 }), 0.6, -0.3);
    put(ctx, b.mus, c.stem, () => I.qanun(74, 2.2, { vel: 0.5, seed: 42 }), 0.6, 0);
    put(ctx, b.mus, c.book, () => I.qanun(78, 2.2, { vel: 0.5, seed: 43 }), 0.6, 0.3);
    [c.arch, c.stem, c.book].forEach((f, i) => put(ctx, b.sfx, f, () => I.glint({ vel: 0.4, seed: 44 + i }), 0.25, -0.3 + i * 0.3));
    put(ctx, b.sfx, c.crescent, () => I.bell(81, { vel: 0.6, dur: 2.6 }), 0.55, 0.2);
    for (let k = 0; k < 6; k++) put(ctx, b.darb, 72 + k * S16, () => I.darbuka(k % 2 ? 'ka' : 'tek', { vel: 0.4 + k * 0.1, seed: 450 + k }), 0.8, 0.1);
    // napas 117–144, lalu hit utama tepat di kilau logo
    hit(ctx, b, c.hit, { size: 1.5, vel: 1, seed: 37 });
    padSpan(ctx, b.mus, c.hit, 288, CH.Dbig, { attack: 0.04, release: 2.4, cutoff: 2600, vel: 1.2 });
    strum(ctx, b.mus, c.hit, [50, 57, 62, 66, 69], r, { gain: 0.65, dur: 3 });
    gliss(ctx, b.mus, c.hit, RUN, { gain: 0.45 });
    put(ctx, b.sfx, c.hit + 4, () => I.glint({ vel: 0.9, seed: 47, dur: 0.6 }), 0.5);
    put(ctx, b.sfx, c.hit, () => I.bell(86, { vel: 0.4, dur: 3.2 }), 0.35, -0.2);
    put(ctx, b.darb, c.hit, () => I.daf('jingle', { vel: 0.9, seed: 48 }), 0.6, 0.3);
    const lastSeg = !ctx.next;
    const phrase = lastSeg ? [[74, 0.4], [72, 0.3], [69, 0.95]] : [[74, 0.5], [75, 0.22], [74, 0.22], [72, 0.28], [70, 0.4], [69, 0.9]];
    put(ctx, b.mus, 164, () => I.ney(phrase, { vel: 0.8, seed: 49 }), 0.85, 0.1);
    put(ctx, b.mus, c.tagline, () => I.qanun(81, 2, { vel: 0.35, seed: 50 }), 0.45, 0.35);
    if (!lastSeg) {
      whooshAt(ctx, b.sfx, 284, 0.8, { vel: 0.8, low: 400, high: 3600 }, 0.6);
      [270, 279].forEach((f, i) => put(ctx, b.darb, f, () => I.darbuka('tek', { vel: 0.65 + i * 0.15, seed: 460 + i }), 0.8, 0.1));
    }
  },

  S5(ctx, b, r) {
    const mp = montageParts(ctx.props);
    const ab = mp.a + mp.b;
    const bars = Math.round(ab / BAR);
    const hooks = bars >= 4 ? [0, 1, 2, 3] : bars === 3 ? [0, 1, 3] : bars === 2 ? [0, 3] : bars === 1 ? [3] : [];
    hooks.forEach((h, k) => {
      const f0 = k * BAR;
      const { chord, notes } = HOOK[h];
      line(ctx, b.mus, f0, notes, I.oud, r, { gain: 1, pan: -0.12, ring: 0.14 });
      if (k >= 2) line(ctx, b.mus, f0, notes, I.qanun, r, { gain: 0.32, pan: 0.38, octave: 1, ring: 0.4, vel: 0.7 });
      padSpan(ctx, b.mus, f0, f0 + BAR, CH[chord], { attack: 0.25, cutoff: 1700, vel: 0.65 });
      groove(ctx, b, r, f0, 1, { style: 'maqsum', chord, vel: k === 0 ? 0.9 : 1 });
    });
    if (bars > 0) put(ctx, b.hit, 0, () => I.impact({ vel: 0.55, size: 0.6, seed: 51 }), 0.6);
    // pergantian kartu: tick + whoosh kecil (searah gerak)
    if (mp.a) for (let i = 1; i < 4; i++) {
      put(ctx, b.sfx, i * mp.aLen, () => I.tick({ vel: 0.9, seed: 60 + i }), 0.55, 0.15);
      whooshAt(ctx, b.sfx, i * mp.aLen, 0.5, { vel: 0.55, dir: i % 2 ? 1 : -1, low: 500, high: 3000 }, 0.45);
    }
    if (mp.b) for (let i = 0; i < 4; i++) {
      const f = mp.a + i * mp.bLen;
      put(ctx, b.sfx, f, () => I.tick({ vel: 1, seed: 70 + i, tone: 5200 }), 0.6, -0.15);
      whooshAt(ctx, b.sfx, f, 0.36, { vel: 0.5, dir: -1, low: 700, high: 4200 }, 0.4);
    }
    if (mp.c) {
      const c0 = ab;
      RUN.forEach((m, i) => put(ctx, b.mus, c0 + i * mp.cLen, () => I.qanun(m, i < 12 ? 1 : 2.4, { vel: 0.45 + i * 0.025, seed: 800 + i }), 0.62, -0.5 + i / 15));
      for (let i = 0; i < 12; i++) put(ctx, b.darb, c0 + i * mp.cLen, () => I.darbuka(i % 2 ? 'ka' : 'tek', { vel: 0.35 + i * 0.05, seed: 820 + i }), 0.8, 0.1);
      [0, 8].forEach((i) => put(ctx, b.daf, c0 + i * mp.cLen, () => I.daf('boom', { vel: 0.7, seed: 840 + i }), 0.8));
      put(ctx, b.mus, c0, () => I.bass(38, 1.6, { vel: 0.9 }), 0.8);
      padSpan(ctx, b.mus, c0, c0 + mp.c, CH.D, { attack: 0.4, cutoff: 2600, vel: 0.75 });
      const s = span(ctx, c0, c0 + 12 * mp.cLen);
      if (s) b.sfx.add(I.whoosh((s[1] - s[0]) / FPS, { vel: 0.6, low: 600, high: 5200 }), ctx.T(s[0]), 0.45);
      putEnd(ctx, b.sfx, c0 + mp.c, 40, (d) => I.swell(d, { vel: 0.5 }), 0.45);
    }
  },

  S6(ctx, b) {
    // Al-Qur'an: mereda, hening yang hormat — tanpa perkusi & tanpa melodi.
    padSpan(ctx, b.mus, 0, 288, CH.Dopen, { attack: 1.4, release: 2.2, cutoff: 850, vel: 0.7 });
    whooshAt(ctx, b.sfx, 18, 1.2, { vel: 0.3, low: 200, high: 1200 }, 0.35);
    putEnd(ctx, b.sfx, 288, 60, (d) => I.swell(d, { vel: 0.35 }), 0.3);
  },

  S7(ctx, b, r) {
    for (let k = 0; k < 8; k++) put(ctx, b.sfx, k * 36, () => I.tick({ vel: 0.75, seed: 90 + k, tone: k % 2 ? 3100 : 4300 }), 0.85, k % 2 ? 0.2 : -0.2);
    [8, 30, 58, 84].forEach((f, i) => put(ctx, b.amb, f, () => I.bird({ vel: 0.9, seed: 900 + i }), 0.5, i % 2 ? 0.6 : -0.5));
    whooshAt(ctx, b.sfx, 20, 1, { vel: 0.4, low: 300, high: 2000 }, 0.4);
    groove(ctx, b, r, 0, 2, { style: 'light', vel: 0.7, daf: false, bass: false });
    put(ctx, b.daf, 0, () => I.daf('boom', { vel: 0.5, seed: 95 }), 0.6);
    put(ctx, b.daf, 144, () => I.daf('boom', { vel: 0.45, seed: 96 }), 0.55);
    line(ctx, b.mus, 0, [[62, 2], [66, 2], [69, 2], [67, 2], [66, 2], [63, 2], [62, 4]], I.oud, r, { gain: 0.75, pan: -0.15, ring: 0.6, vel: 0.75 });
    padSpan(ctx, b.mus, 0, 144, CH.D, { attack: 0.5, cutoff: 1500, vel: 0.6 });
    padSpan(ctx, b.mus, 144, 216, CH.Gm, { attack: 0.4, cutoff: 1400, vel: 0.55 });
    padSpan(ctx, b.mus, 216, 288, CH.Dopen, { attack: 0.4, cutoff: 1100, vel: 0.5 });
    [40, 52, 64].forEach((f, i) => put(ctx, b.mus, f, () => I.qanun([74, 78, 81][i], 1.8, { vel: 0.35, seed: 97 + i }), 0.45, 0.35));
  },

  S8(ctx, b, r) {
    const c = SCENE_CUES.S8;
    const cross = c.lockStart + springCross({ damping: 9, stiffness: 70 });
    whooshAt(ctx, b.sfx, 14, 1, { vel: 0.6, dir: 1, low: 300, high: 2600 }, 0.5);
    padSpan(ctx, b.mus, 0, 144, CH.Cm, { attack: 0.5, cutoff: 1500, vel: 0.65 });
    padSpan(ctx, b.mus, 144, cross, CH.Eb, { attack: 0.5, cutoff: 1800, vel: 0.7 });
    padSpan(ctx, b.mus, cross, 288, CH.D, { attack: 0.08, cutoff: 2200, vel: 0.8, release: 2 });
    [0, 72, 144].forEach((f, i) => put(ctx, b.daf, f, () => I.daf('boom', { vel: 0.5 - i * 0.05, seed: 110 + i }), 0.65));
    for (let k = 0; k < 8; k++) put(ctx, b.darb, 144 + k * S8 + S16, () => I.daf('jingle', { vel: 0.18 + k * 0.03, seed: 120 + k }), 0.45, -0.3);
    [69, 70, 72, 74, 75].forEach((m, i) => put(ctx, b.mus, c.arc + i * S8, () => I.qanun(m, 1.6, { vel: 0.4 + i * 0.04, seed: 130 + i }), 0.55, -0.4 + i * 0.2));
    putEnd(ctx, b.sfx, 172, 80, (d) => I.riser(d, { vel: 0.55, from: 400, to: 4500 }), 0.45);
    whooshAt(ctx, b.sfx, 150, 1.4, { vel: 0.6, dir: 1, low: 300, high: 2400 }, 0.45);
    put(ctx, b.sfx, c.kaaba, () => I.bell(74, { vel: 0.5, dur: 2.6, ratio: 2, index: 1.6 }), 0.5, -0.1);
    put(ctx, b.daf, c.kaaba, () => I.daf('boom', { vel: 0.55, seed: 140 }), 0.6);
    put(ctx, b.sfx, cross, () => I.tick({ vel: 1.2, seed: 141, tone: 2600 }), 0.7);
    put(ctx, b.sfx, cross + 2, () => I.bell(81, { vel: 0.55, dur: 2.4 }), 0.5, 0.15);
    put(ctx, b.mus, cross, () => I.bass(38, 1.4, { vel: 0.7 }), 0.7);
    strum(ctx, b.mus, cross, [50, 57, 62, 66], r, { gain: 0.5, dur: 2.4, vel: 0.7, spread: 0.02 });
    put(ctx, b.sfx, 190, () => I.glint({ vel: 0.4, seed: 142 }), 0.3);
  },

  S9(ctx, b, r) {
    const cuts = SCENE_CUES.S9.cuts;
    whooshAt(ctx, b.sfx, 10, 0.7, { vel: 0.7, dir: -1, low: 500, high: 4200 }, 0.5);
    const chords = ['Gm', 'Cm', 'D'];
    cuts.forEach((f, i) => {
      hit(ctx, b, f, { size: 0.55, vel: 0.75, bassNote: ROOT[chords[i]], seed: 150 + i });
      strum(ctx, b.mus, f, CH[chords[i]].slice(1), r, { gain: 0.45, dur: 1.6, vel: 0.75 });
      put(ctx, b.sfx, f + 2, () => I.glint({ vel: 0.5, seed: 160 + i }), 0.3, i % 2 ? 0.4 : -0.4);
    });
    [HOOK[2], HOOK[3]].forEach((h, k) => {
      line(ctx, b.mus, k * BAR, h.notes, I.oud, r, { gain: 0.9, pan: -0.12, ring: 0.14 });
      groove(ctx, b, r, k * BAR, 1, { style: 'maqsum', chord: h.chord, daf: false });
      padSpan(ctx, b.mus, k * BAR, (k + 1) * BAR, CH[h.chord], { attack: 0.2, cutoff: 1700, vel: 0.6 });
    });
    [216, 225, 234].forEach((f, i) => put(ctx, b.sfx, f, () => I.tick({ vel: 0.7, seed: 170 + i, tone: 4800 }), 0.45, 0.2));
  },

  S10(ctx, b, r) {
    const end = ctx.end;
    const build0 = Math.max(ctx.off, end - BAR);
    whooshAt(ctx, b.sfx, 10, 0.7, { vel: 0.6, dir: 1, low: 500, high: 4000 }, 0.45);
    if (build0 > ctx.off) {
      groove(ctx, b, r, ctx.off, Math.round((build0 - ctx.off) / BAR), { style: 'saidi', chord: 'Gm', vel: 0.9 });
      line(ctx, b.mus, ctx.off, HOOK[0].notes, I.oud, r, { gain: 0.8, pan: -0.12, octave: -1, ring: 0.2 });
      padSpan(ctx, b.mus, ctx.off, build0, CH.Gm, { attack: 0.3, cutoff: 1600, vel: 0.6 });
    }
    [74, 78, 81, 86].forEach((m, i) => put(ctx, b.mus, 40 + i * 10, () => I.qanun(m, 1.8, { vel: 0.45, seed: 180 + i }), 0.5, -0.45 + i * 0.3));
    for (let f = 40; f < 110; f += 6) put(ctx, b.sfx, f, () => I.tick({ vel: 0.35, seed: 190 + f, tone: 5200 }), 0.35, ((f / 6) % 2 ? 0.25 : -0.25));
    // build-up menuju penutup, berhenti 18 frame sebelum hit (napas)
    const stop = end - 18;
    for (let f = build0, k = 0; f < stop; f += f - build0 < 72 ? S8 : S16, k++) {
      put(ctx, b.darb, f, () => I.darbuka(k % 3 === 0 ? 'dum' : k % 2 ? 'ka' : 'tek', { vel: 0.35 + 0.65 * ((f - build0) / BAR), seed: 200 + k }), 0.85, 0.08);
    }
    put(ctx, b.daf, build0, () => I.daf('boom', { vel: 0.7, seed: 230 }), 0.75);
    padSpan(ctx, b.mus, build0, end, CH.Eb, { attack: 0.8, cutoff: 2400, vel: 0.85 });
    if (ctx.next) {
      putEnd(ctx, b.sfx, end, BAR, (d) => I.riser(d, { vel: 1 }), 0.75);
      putEnd(ctx, b.sfx, end, 50, (d) => I.swell(d, { vel: 0.9 }), 0.8);
    }
  },

  S11(ctx, b, r) {
    const len = ctx.props.len ?? 288;
    const k = len / 288;
    hit(ctx, b, 0, { size: 0.9, vel: 0.75, seed: 240 });
    padSpan(ctx, b.mus, 0, len, CH.Dbig, { attack: 0.05, release: 2.6, cutoff: 2000, vel: 1 });
    strum(ctx, b.mus, 0, [50, 57, 62, 66, 69], r, { gain: 0.6, dur: 3.2 });
    gliss(ctx, b.mus, 0, [...RUN].reverse().slice(0, 10), { gain: 0.38, step: 0.03, vel: 0.35, ring: 2.4 });
    put(ctx, b.sfx, 0, () => I.bell(86, { vel: 0.35, dur: 3.5 }), 0.35, 0.2);
    put(ctx, b.sfx, 24, () => I.glint({ vel: 0.7, seed: 241, dur: 0.6 }), 0.4, -0.2);
    put(ctx, b.sfx, 30, () => I.glint({ vel: 0.6, seed: 242, dur: 0.6 }), 0.35, 0.2);
    const phrase = [[69, 0.7], [67, 0.35], [66, 0.35], [63, 0.5], [62, 1.7]].map(([m, d]) => [m, d * Math.min(1.15, k)]);
    put(ctx, b.mus, 24, () => I.ney(phrase, { vel: 0.85, seed: 243 }), 0.9, 0.05);
    put(ctx, b.mus, 40, () => I.qanun(81, 2.2, { vel: 0.3, seed: 244 }), 0.4, 0.35);
    put(ctx, b.mus, 74, () => I.qanun(86, 2.4, { vel: 0.3, seed: 245 }), 0.4, -0.3);
  },
};

/* ---------------------------------------------------------------- bed per varian */
const WIND_GAIN = { S1: 1, S2: 0.7, S3: 0.4, S4: 0.35, S5: 0.22, S6: 0.65, S7: 0.45, S8: 0.4, S9: 0.22, S10: 0.3, S11: 0.6 };
const DRONE_GAIN = { S1: 1, S2: 0.8, S3: 0.9, S4: 0.75, S5: 0.3, S6: 0.75, S7: 0.4, S8: 0.6, S9: 0.3, S10: 0.5, S11: 0.85 };

function sceneCurve(variant, table, xfade = 0.5) {
  const pts = variant.segments.map((s) => [s.from / FPS, table[s.scene] ?? 0.5]);
  return (t) => {
    let g = pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const [t0, v] = pts[i];
      if (t >= t0 + xfade / 2) g = v;
      else if (t > t0 - xfade / 2) {
        const p = (t - (t0 - xfade / 2)) / xfade;
        g = g + (v - g) * (0.5 - 0.5 * Math.cos(Math.PI * p));
      }
    }
    return g;
  };
}

/** Membangun semua bus satu varian. */
export function scoreVariant(key) {
  // Reel 90 dtk memakai satu lagu utuh (song-reel.mjs), bukan potongan per adegan.
  if (key === 'reel') return scoreReel();
  const v = VARIANTS[key];
  const seconds = v.durationInFrames / FPS;
  const mk = () => new Bus(seconds);
  const b = { mus: mk(), darb: mk(), daf: mk(), hit: mk(), sfx: mk(), amb: mk() };
  const r = rng(4242);
  v.segments.forEach((seg, i) => SCENES[seg.scene](makeCtx(v, i), b, r));

  const wind = new Bus(seconds).add(I.wind(seconds, { vel: 1 }), 0);
  wind.automate(sceneCurve(v, WIND_GAIN, 0.8));
  wind.mixInto(b.amb, 2.4);
  const drone = new Bus(seconds).add(I.drone(50, seconds), 0);
  drone.automate(sceneCurve(v, DRONE_GAIN, 0.8));
  drone.mixInto(b.mus, 1);
  return { v, seconds, b };
}
