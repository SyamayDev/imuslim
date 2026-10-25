// Lagu utuh untuk reel 90 dtk — maqam Hijaz pada D, 100 BPM, 37,5 bar.
// Berbeda dengan partitur per adegan (score.mjs), reel memakai SATU aransemen yang mengalir:
// groove tidak pernah berhenti mendadak; bagian tenang (Basmalah) turun perlahan & denyutnya
// tetap dijaga ostinato qanun; setiap klimaks mendarat di ketukan berikutnya, bukan di hening.
import { spring } from 'remotion';
import { VARIANTS } from '../../src/timeline.js';
import { Bus, rng, scale, SR } from './dsp.mjs';
import * as I from './instruments.mjs';

const FPS = 60;
const BAR = 144;
const BEAT = 36;
const S16 = 9;
const S8 = 18;
const T = (frame) => frame / FPS;

/* ---------------------------------------------------------------- bahan */
const CH = {
  D: [50, 57, 62, 66, 69],
  Dopen: [50, 57, 62, 69],
  Gm: [43, 55, 58, 62, 67],
  Cm: [48, 55, 60, 63, 67],
  Eb: [51, 58, 63, 67, 70],
};
const ROOT = { D: 38, Dopen: 38, Gm: 43, Cm: 36, Eb: 39 };
const RUN = [60, 62, 63, 66, 67, 69, 70, 72, 74, 75, 78, 79, 81, 82, 84, 86];

/** Frasa 1 bar (satuan seperdelapan, total 8) + akor. */
const PHRASES = {
  // hook utama (oud)
  A1: [
    { chord: 'D', notes: [[69, 2], [70, 1], [69, 1], [67, 1], [66, 1], [67, 2]] },
    { chord: 'D', notes: [[66, 1], [63, 1], [66, 1], [67, 1], [66, 2], [62, 2]] },
  ],
  A2: [
    { chord: 'Gm', notes: [[62, 1], [63, 1], [66, 1], [67, 1], [69, 2], [72, 1], [70, 1]] },
    { chord: 'D', notes: [[69, 3], [67, 1], [66, 1], [63, 1], [62, 2]] },
  ],
  // bait (oud, register tinggi)
  B1: [
    { chord: 'Gm', notes: [[74, 2], [72, 1], [70, 1], [69, 2], [67, 2]] },
    { chord: 'Cm', notes: [[72, 1], [70, 1], [72, 1], [75, 1], [74, 2], [72, 2]] },
  ],
  B2: [
    { chord: 'D', notes: [[69, 1], [70, 1], [69, 1], [67, 1], [66, 2], [69, 2]] },
    { chord: 'D', notes: [[66, 1], [67, 1], [66, 1], [63, 1], [62, 4]] },
  ],
  // jembatan (ney memimpin)
  C1: [
    { chord: 'Cm', notes: [[75, 4], [74, 2], [72, 2]] },
    { chord: 'Gm', notes: [[70, 3], [69, 1], [67, 4]] },
  ],
  C2: [
    { chord: 'Eb', notes: [[70, 2], [67, 2], [63, 2], [67, 2]] },
    { chord: 'D', notes: [[66, 2], [69, 2], [74, 4]] },
  ],
  // jeda tenang saat Basmalah (ney), berakhir di A4 → disambut hook oud
  N: [
    { chord: 'Dopen', notes: [[74, 3], [75, 1], [74, 2], [72, 2]] },
    { chord: 'Gm', notes: [[70, 2], [69, 2], [67, 2], [69, 2]] },
  ],
};

/**
 * Aransemen per 2 bar: [barMulai, jenis, frasa, opsi].
 * jenis: intro · build · full · mid · light · calm · run · outro
 */
const ARR = [
  [0, 'intro'],
  [1, 'build'],
  [2, 'full', 'A1', { crash: 'mid' }],
  [4, 'full', 'A2'],
  [6, 'full', 'B1', { fadeToCalm: true }],
  [8, 'calm', 'N'],
  [10, 'full', 'A1', { crash: 'mid' }],
  [12, 'light', 'B1'],
  [14, 'full', 'B2', { crash: 'mid' }],
  [16, 'mid', 'C1'],
  [18, 'mid', 'C2', { buildLast: true }],
  [20, 'full', 'A1', { crash: 'mid', double: true }],
  [22, 'full', 'A2', { double: true }],
  [24, 'full', 'B1'],
  [26, 'mid', 'B2', { buildLast: true }],
  [28, 'full1', 'A1', { crash: 'mid' }],
  [29, 'run'],
  [30, 'full', 'A1', { crash: 'big', double: true, octave: 1 }],
  [32, 'full', 'A1', { crash: 'big', double: true, ney: true }],
  [34, 'full', 'A2', { double: true, ney: true }],
  [36, 'outro'],
];

const PAT = {
  maqsum: [['D', 1], null, ['T', 0.9], null, ['k', 0.45], null, ['T', 0.85], null, ['D', 0.95], null, ['k', 0.45], null, ['T', 0.9], null, ['k', 0.45], ['k', 0.3]],
  light: [null, null, ['k', 0.45], null, ['T', 0.65], null, ['k', 0.4], null, ['D', 0.5], null, ['k', 0.45], null, ['T', 0.65], null, ['k', 0.4], null],
};
const BASS_STEPS = [
  [0, 0, 0.38],
  [3, 0, 0.2],
  [6, 7, 0.2],
  [8, 0, 0.3],
  [11, 12, 0.18],
  [14, 7, 0.2],
];

/* ---------------------------------------------------------------- mesin */
export function scoreReel() {
  const v = VARIANTS.reel;
  const seconds = v.durationInFrames / FPS;
  const mk = () => new Bus(seconds);
  const b = { mus: mk(), darb: mk(), daf: mk(), hit: mk(), sfx: mk(), amb: mk() };
  const r = rng(9090);
  const seed = () => 1 + Math.floor(r() * 1e6);
  const jit = () => (r() - 0.5) * 0.006;
  const end = v.durationInFrames;
  const put = (bus, frame, sig, gain = 1, pan = 0, j = 0) => {
    if (frame < 0 || frame >= end) return;
    bus.add(sig, Math.max(0, T(frame) + j), gain, pan);
  };
  const putEnd = (bus, frameEnd, durF, make, gain = 1, pan = 0) => {
    const f0 = Math.max(0, frameEnd - durF);
    bus.add(make((frameEnd - f0) / FPS), T(f0), gain, pan);
  };
  const whooshAt = (frame, dur, opts, gain) => {
    const start = frame - Math.round((dur / 2) * FPS);
    if (start < 0) return;
    b.sfx.add(I.whoosh(dur, opts), T(start), gain);
  };

  /* ---------- lapisan dasar ---------- */
  function pad(bar, chord, { vel = 0.7, cutoff = 1700, bars = 1, attack = 0.35 } = {}) {
    put(b.mus, bar * BAR, I.pad(CH[chord], T(BAR * bars) + 0.15, { attack, release: 1.3, cutoff, vel, seed: seed() }), 1);
  }
  function melody(bar, notes, inst, { gain = 1, pan = 0, octave = 0, ring = 0.14, vel = 1 } = {}) {
    let f = bar * BAR;
    for (const [m, u] of notes) {
      put(b.mus, f, inst(m + 12 * octave, T(u * S8) + ring, { vel: vel * (0.92 + r() * 0.14), seed: seed() }), gain, pan, jit());
      f += u * S8;
    }
  }
  function neyLine(bar, notes, { gain = 0.85, vel = 0.85, octave = 0 } = {}) {
    put(b.mus, bar * BAR, I.ney(notes.map(([m, u]) => [m + 12 * octave, T(u * S8)]), { vel, seed: seed(), breath: 0.2 }), gain, 0.08);
  }
  function bassBar(bar, chord, { vel = 1, steps = BASS_STEPS, long = false } = {}) {
    for (const [s, iv, dur] of steps) {
      put(b.mus, bar * BAR + s * S16, I.bass(ROOT[chord] + iv, long ? dur * 3 : dur, { vel: vel * (s === 0 ? 1 : 0.85) }), 0.62, 0, jit());
    }
  }
  function drums(bar, { style = 'maqsum', vel = 1, ghosts = true, riq = true, daf = [0, 8], clap = true, ramp = null, fill = false } = {}) {
    const pat = PAT[style];
    for (let s = 0; s < 16; s++) {
      const f = bar * BAR + s * S16;
      const rv = ramp ? ramp(s) : 1;
      const v = vel * rv * (0.9 + r() * 0.2);
      if (fill && s >= 12) {
        // isian akhir bar: 16-an tek-ka menanjak menuju bar berikutnya
        put(b.darb, f, I.darbuka(s % 2 ? 'ka' : 'tek', { vel: v * (0.55 + (s - 12) * 0.13), seed: seed() }), 0.85, 0.1, jit());
        if (s === 12) put(b.darb, f, I.darbuka('dum', { vel: v * 0.8, seed: seed() }), 0.9, 0, jit());
        continue;
      }
      const p = pat[s];
      if (p) {
        const [k, w] = p;
        put(b.darb, f, I.darbuka(k === 'D' ? 'dum' : k === 'T' ? 'tek' : 'ka', { vel: v * w, seed: seed() }), k === 'D' ? 0.95 : 0.8, k === 'D' ? 0 : 0.12, jit());
      } else if (ghosts && s % 2 === 1 && r() < 0.4) {
        put(b.darb, f, I.darbuka('ka', { vel: v * 0.22, seed: seed() }), 0.6, 0.18, jit());
      }
      if (riq) {
        if (s % 4 === 2) put(b.darb, f, I.daf('jingle', { vel: v * 0.5, seed: seed() }), 0.5, -0.35, jit());
        else if (s % 2 === 1) put(b.darb, f, I.daf('jingle', { vel: v * 0.16, seed: seed() }), 0.45, -0.3, jit());
      }
      if (daf.includes(s)) put(b.daf, f, I.daf('boom', { vel: v * (s === 0 ? 0.75 : 0.55), seed: seed() }), 0.62, 0, jit());
      if (clap && (s === 4 || s === 12)) put(b.darb, f, I.clap({ vel: v * 0.75, seed: seed() }), 0.5, s === 4 ? -0.15 : 0.15, jit());
    }
  }
  function ostinato(bar, chord, { vel = 0.4, gain = 0.5 } = {}) {
    const [t0, t1, t2] = CH[chord].slice(-3).map((m) => (m < 60 ? m + 12 : m));
    const pattern = [t0, t1, t2, t1 + 12, t2, t1, t0, t1];
    pattern.forEach((m, i) => put(b.mus, bar * BAR + i * S8, I.qanun(m, 0.9, { vel: vel * (i % 2 ? 0.8 : 1), seed: seed() }), gain, -0.25 + (i % 4) * 0.17, jit()));
  }
  function crash(bar, kind) {
    const f = bar * BAR;
    put(b.daf, f, I.daf('boom', { vel: 1, seed: seed() }), kind === 'big' ? 0.9 : 0.7);
    put(b.darb, f, I.daf('jingle', { vel: 1, seed: seed() }), 0.6, 0.25);
    put(b.sfx, f + 2, I.glint({ vel: kind === 'big' ? 0.8 : 0.5, seed: seed() }), 0.35);
    if (kind === 'big') put(b.hit, f, I.impact({ vel: 0.75, size: 0.9, seed: seed() }), 0.8);
  }

  /* ---------- aransemen ---------- */
  for (let i = 0; i < ARR.length; i++) {
    const [bar, kind, phraseKey, opt = {}] = ARR[i];
    const next = ARR[i + 1];
    const phrase = PHRASES[phraseKey];
    if (kind === 'intro') {
      pad(bar, 'Dopen', { vel: 0.55, cutoff: 1100, attack: 1.2 });
      [62, 66, 69, 74, 66, 69, 74, 78, 69, 74, 78, 81, 74, 78, 81, 86].forEach((m, k) =>
        put(b.mus, bar * BAR + k * S16, I.qanun(m, 1.2, { vel: 0.3 + k * 0.025, seed: seed() }), 0.55, -0.45 + (k / 15) * 0.9),
      );
      put(b.mus, bar * BAR + 6, I.ney([[69, 1.6], [70, 0.35], [69, 0.5]], { vel: 0.7, seed: seed() }), 0.7, 0.05);
      put(b.sfx, bar * BAR, I.subRise(T(BAR), { from: 32, to: 50 }), 0.3);
      drums(bar, { style: 'light', vel: 0.55, riq: true, daf: [], clap: false, ghosts: false, fill: true });
    }
    if (kind === 'build') {
      pad(bar, 'Eb', { vel: 0.85, cutoff: 2000, attack: 0.6 });
      // logo tergambar: satu nada qanun per bagian (arch, batang, buku) + bel sabit
      [[152, 69], [188, 74], [210, 78]].forEach(([f, m]) => put(b.mus, f, I.qanun(m, 2, { vel: 0.5, seed: seed() }), 0.55, 0.25));
      put(b.sfx, 254, I.bell(81, { vel: 0.5, dur: 2.4 }), 0.45, 0.2);
      // darbuka menanjak 8-an → 16-an, tanpa jeda sebelum hit
      for (let s = 0; s < 16; s++) {
        if (s < 8 && s % 2) continue;
        const f = bar * BAR + s * S16;
        put(b.darb, f, I.darbuka(s % 4 === 0 ? 'dum' : s % 2 ? 'ka' : 'tek', { vel: 0.4 + (s / 15) * 0.55, seed: seed() }), 0.85, 0.08, jit());
      }
      for (let s = 0; s < 16; s += 2) put(b.mus, bar * BAR + s * S16, I.bass(39, 0.2, { vel: 0.5 + s * 0.03 }), 0.55);
      putEnd(b.sfx, (bar + 1) * BAR, BAR, (d) => I.riser(d, { vel: 0.9 }), 0.4);
      putEnd(b.sfx, (bar + 1) * BAR, 40, (d) => I.swell(d, { vel: 0.7 }), 0.45);
    }
    if (kind === 'full' || kind === 'full1' || kind === 'mid' || kind === 'light' || kind === 'calm') {
      const nBars = kind === 'full1' ? 1 : 2;
      if (opt.crash) crash(bar, opt.crash);
      for (let k = 0; k < nBars; k++) {
        const bb = bar + k;
        const { chord, notes } = phrase[k];
        const last = k === nBars - 1;
        const nextKind = next?.[1];
        const fill = last && ['full', 'full1', 'mid', 'run'].includes(nextKind) && !opt.fadeToCalm;
        if (kind === 'full' || kind === 'full1') {
          pad(bb, chord, { vel: 0.62, cutoff: 1800 });
          bassBar(bb, chord);
          const ramp = opt.fadeToCalm && last ? (s) => (s < 8 ? 1 : 1 - ((s - 8) / 8) * 0.75) : null;
          drums(bb, { style: 'maqsum', vel: 1, clap: !(opt.fadeToCalm && last), ramp, fill });
          melody(bb, notes, I.oud, { gain: 1.15, pan: -0.1, octave: opt.octave ?? 0 });
          if (opt.double) melody(bb, notes, I.qanun, { gain: 0.28, pan: 0.38, octave: (opt.octave ?? 0) + 1, ring: 0.4, vel: 0.7 });
          if (opt.ney && k === 0) neyLine(bb, [...phrase[0].notes, ...phrase[1].notes], { gain: 0.42, vel: 0.7 });
        } else if (kind === 'mid') {
          pad(bb, chord, { vel: 0.68, cutoff: 1600 });
          bassBar(bb, chord, { vel: 0.85 });
          drums(bb, { style: 'maqsum', vel: 0.82, ghosts: false, clap: false, daf: [0], fill: fill || (opt.buildLast && last) });
          ostinato(bb, chord, { vel: 0.32, gain: 0.45 });
          if (k === 0) neyLine(bb, [...phrase[0].notes, ...phrase[1].notes], { gain: 0.95, vel: 0.9 });
          if (opt.buildLast && last) putEnd(b.sfx, (bb + 1) * BAR, BAR, (d) => I.riser(d, { vel: 0.7 }), 0.32);
        } else if (kind === 'light') {
          pad(bb, chord, { vel: 0.62, cutoff: 1500 });
          bassBar(bb, chord, { vel: 0.75, steps: BASS_STEPS.filter(([s]) => s % 6 === 0 || s === 8) });
          drums(bb, { style: 'light', vel: 0.85, ghosts: false, clap: false, daf: [0], fill });
          melody(bb, notes, I.oud, { gain: 0.85, pan: -0.1 });
        } else if (kind === 'calm') {
          // Basmalah: tanpa perkusi; pad, bass panjang, ostinato qanun menjaga denyut, ney melantun
          pad(bb, chord, { vel: 0.7, cutoff: 1300, attack: 0.6 });
          bassBar(bb, chord, { vel: 0.55, steps: [[0, 0, 0.6], [8, 0, 0.5]], long: true });
          ostinato(bb, chord, { vel: 0.3 + (last ? 0.12 : 0), gain: 0.5 });
          if (k === 0) neyLine(bb, [...phrase[0].notes, ...phrase[1].notes], { gain: 0.8, vel: 0.85 });
          if (last) putEnd(b.sfx, (bb + 1) * BAR, 72, (d) => I.swell(d, { vel: 0.5 }), 0.35);
        }
      }
      if (opt.fadeToCalm) putEnd(b.mus, (bar + 2) * BAR, 54, (d) => I.swell(d, { vel: 0.35 }), 0.4);
    }
    if (kind === 'run') {
      const f0 = bar * BAR;
      pad(bar, 'D', { vel: 0.75, cutoff: 2600 });
      RUN.forEach((m, k) => put(b.mus, f0 + k * S16, I.qanun(m, k < 15 ? 0.9 : 2.2, { vel: 0.42 + k * 0.025, seed: seed() }), 0.6, -0.5 + k / 15));
      for (let k = 0; k < 16; k++) {
        put(b.darb, f0 + k * S16, I.darbuka(k % 4 === 0 ? 'dum' : k % 2 ? 'ka' : 'tek', { vel: 0.45 + k * 0.035, seed: seed() }), 0.85, 0.08, jit());
        if (k % 2 === 0) put(b.mus, f0 + k * S16, I.bass(38, 0.2, { vel: 0.6 + k * 0.02 }), 0.58);
      }
      put(b.daf, f0, I.daf('boom', { vel: 0.8, seed: seed() }), 0.7);
      putEnd(b.sfx, f0 + BAR, BAR, (d) => I.riser(d, { vel: 0.85 }), 0.38);
    }
    if (kind === 'outro') {
      // dua ketukan groove + isian, lalu kadens akhir tepat di ketukan 3 (ney mendarat di D),
      // akor dibiarkan berdering hingga video memudar — selesai, bukan terputus.
      const f0 = bar * BAR;
      const fin = f0 + 2 * BEAT;
      pad(bar, 'D', { vel: 0.75, cutoff: 1700, bars: 1.5 });
      bassBar(bar, 'D', { vel: 0.75, steps: BASS_STEPS.filter(([s]) => s < 8) });
      drums(bar, { style: 'maqsum', vel: 0.85, ghosts: false, clap: true, daf: [0], ramp: (s) => (s < 8 ? 1 : 0), fill: false });
      for (let s = 4; s < 8; s++) put(b.darb, f0 + s * S16, I.darbuka(s % 2 ? 'ka' : 'tek', { vel: 0.5 + (s - 4) * 0.12, seed: seed() }), 0.8, 0.1);
      put(b.mus, f0, I.ney([[69, 0.5], [67, 0.25], [66, 0.25], [63, 0.2], [62, 2.0]], { vel: 0.85, seed: seed() }), 0.9, 0.05);
      put(b.daf, fin, I.daf('boom', { vel: 0.95, seed: seed() }), 0.8);
      put(b.darb, fin, I.daf('jingle', { vel: 0.8, seed: seed() }), 0.5, 0.25);
      put(b.mus, fin, I.bass(38, 1.8, { vel: 0.85 }), 0.6);
      [...RUN].reverse().slice(0, 10).forEach((m, k) => put(b.mus, fin + 6 + k * 2, I.qanun(m, 2.2, { vel: 0.3, seed: seed() }), 0.4, 0.5 - k / 10));
      [50, 57, 62, 66, 69].forEach((m, k) => put(b.mus, fin, I.oud(m, 3, { vel: 0.85, seed: seed() }), 0.55, -0.25 + k * 0.12, k * 0.014));
      put(b.sfx, fin, I.bell(86, { vel: 0.35, dur: 3 }), 0.3, 0.2);
    }
  }

  /* ---------- efek suara yang mengunci ke gambar ---------- */
  const seg = (scene, n = 0) => v.segments.filter((s) => s.scene === scene)[n];
  // pergantian adegan: whoosh lembut memuncak tepat di potongan (kecuali saat hit)
  for (const s of v.segments) if (s.from > 0 && ![288].includes(s.from)) whooshAt(s.from, 0.7, { vel: 0.5, dir: s.from % 288 ? 1 : -1, low: 400, high: 3200 }, 0.32);
  // hit logo (kilau) — musik juga mendarat di sini
  put(b.hit, 288, I.impact({ vel: 1, size: 1.2, seed: 37 }), 0.9);
  put(b.sfx, 292, I.glint({ vel: 0.9, seed: 47, dur: 0.6 }), 0.45);
  put(b.sfx, 288, I.bell(86, { vel: 0.4, dur: 3 }), 0.32, -0.2);
  // kartu fitur (babak A)
  const s5 = seg('S5');
  for (let k = 1; k < 4; k++) {
    put(b.sfx, s5.from + k * 108, I.tick({ vel: 0.9, seed: 60 + k }), 0.4, 0.15);
    whooshAt(s5.from + k * 108, 0.5, { vel: 0.5, dir: k % 2 ? 1 : -1, low: 500, high: 3000 }, 0.3);
  }
  // Basmalah: kilau lembut saat iris membuka
  put(b.sfx, seg('S6').from + 4, I.glint({ vel: 0.4, seed: 70 }), 0.2);
  // jadwal sholat: detik jam tiap ketukan + kicau burung fajar
  const s7 = seg('S7');
  for (let k = 0; k < 8; k++) put(b.sfx, s7.from + k * BEAT, I.tick({ vel: 0.7, seed: 80 + k, tone: k % 2 ? 3100 : 4300 }), 0.55, k % 2 ? 0.2 : -0.2);
  [8, 30, 58, 84].forEach((f, k) => put(b.amb, s7.from + f, I.bird({ vel: 0.9, seed: 900 + k }), 0.5, k % 2 ? 0.6 : -0.5));
  // kiblat: bel Ka'bah + bunyi "kunci" tepat saat jarum pertama mencapai sasaran
  const s8 = seg('S8');
  let cross = 30;
  for (let f = 0; f < 240; f++) {
    if (spring({ frame: f, fps: FPS, config: { damping: 9, stiffness: 70, mass: 0.9 } }) >= 1) {
      cross = f;
      break;
    }
  }
  put(b.sfx, s8.from + 168, I.bell(74, { vel: 0.5, dur: 2.6, ratio: 2, index: 1.6 }), 0.45, -0.1);
  put(b.sfx, s8.from + 176 + cross, I.tick({ vel: 1.2, seed: 141, tone: 2600 }), 0.6);
  put(b.sfx, s8.from + 178 + cross, I.bell(81, { vel: 0.5, dur: 2.4 }), 0.42, 0.15);
  // pendalaman fitur: "pop" tiap chip (ketukan 1–3) + kartu pop-out (ketukan 4)
  for (const s of v.segments.filter((x) => x.scene.startsWith('R'))) {
    [36, 72, 108].forEach((f, k) => put(b.sfx, s.from + f, I.tick({ vel: 0.55, seed: s.from + k, tone: 2800 + k * 400 }), 0.35, k % 2 ? 0.3 : -0.3));
    if (s.scene !== 'RNyaman') {
      put(b.sfx, s.from + 144, I.glint({ vel: 0.45, seed: s.from + 9 }), 0.25);
      whooshAt(s.from + 146, 0.4, { vel: 0.4, low: 600, high: 3600 }, 0.22);
    } else {
      [96, 214].forEach((f) => whooshAt(s.from + f + 16, 0.6, { vel: 0.45, low: 300, high: 2400 }, 0.25));
    }
  }
  // carousel & flip-book
  const bc = seg('S5', 1);
  for (let k = 1; k < 4; k++) put(b.sfx, bc.from + k * BEAT, I.tick({ vel: 0.8, seed: 300 + k, tone: 5000 }), 0.35, -0.15);
  // skor Lighthouse: tik hitungan
  const s10 = seg('S10');
  for (let f = 40; f < 110; f += 6) put(b.sfx, s10.from + f, I.tick({ vel: 0.3, seed: 400 + f, tone: 5200 }), 0.3, (f / 6) % 2 ? 0.25 : -0.25);
  // penutup: QR muncul → denting lembut
  const s11 = seg('S11QR');
  put(b.sfx, s11.from + 176, I.bell(86, { vel: 0.45, dur: 3.2 }), 0.4, 0.1);
  put(b.sfx, s11.from + 178, I.glint({ vel: 0.6, seed: 500, dur: 0.6 }), 0.3);

  /* ---------- bed: drone & angin sepanjang lagu ---------- */
  const energy = (t) => {
    const bar = (t * FPS) / BAR;
    const calm = bar >= 7.6 && bar < 10 ? 1 : 0;
    return 0.6 + 0.25 * calm;
  };
  const drone = new Bus(seconds).add(I.drone(50, seconds), 0);
  drone.automate((t) => energy(t) * Math.min(1, t / 1.5));
  drone.mixInto(b.mus, 0.8);
  const wind = new Bus(seconds).add(I.wind(seconds), 0);
  wind.automate((t) => 0.35 + 0.4 * Math.max(0, 1 - t / 3));
  wind.mixInto(b.amb, 2.4);
  // perkusi sedikit di bawah melodi agar hook oud tetap di depan
  scale(b.darb, 0.8);
  return { v, seconds, b };
}
