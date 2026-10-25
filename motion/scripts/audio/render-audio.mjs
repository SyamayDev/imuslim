// Render audio semua varian: tiga versi mix + stem, dinormalisasi −14 LUFS / ≤ −1 dBTP.
//   node scripts/audio/render-audio.mjs            → semua varian
//   node scripts/audio/render-audio.mjs film reel  → varian tertentu
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { biquad, Bus, compress, db, limit, pingPong, reverb, SR, writeWav } from './dsp.mjs';
import { integrated, lra, samplePeak, tpEnvelope, truePeak } from './loudness.mjs';
import { FPS, scoreVariant } from './score.mjs';

const OUT = fileURLToPath(new URL('../../out/audio/', import.meta.url));
const TARGET_LUFS = -14;
const CEILING = -1.6; // dBTP sebelum encode AAC (memberi ruang ±0,5 dB)

/** Versi audio: bobot tiap bus. */
export const VERSIONS = {
  // Pilihan pemilik: instrumen bernuansa Islami (oud, qanun, ney, darbuka, rebana).
  musik: { mus: 1, darb: 1, daf: 1, hit: 1, sfx: 0.75, amb: 0.55 },
  // Versi bawaan master prompt: desain suara + rebana sederhana, tanpa alat musik lain.
  'tanpa-alat-musik': { mus: 0, darb: 0, daf: 1, hit: 1, sfx: 1, amb: 1 },
  // Hanya ambience: tanpa perkusi & tanpa impact.
  ambience: { mus: 0, darb: 0, daf: 0, hit: 0, sfx: 0.7, amb: 1.25 },
};
const STEM_GAIN = { mus: 1, darb: 0.64, daf: 0.8, hit: 0.75, sfx: 0.7, amb: 0.7 };
const SEND = { mus: 0.3, darb: 0.12, daf: 0.18, hit: 0.28, sfx: 0.34, amb: 0.06 };

function copy(bus) {
  const c = new Bus(bus.length / SR);
  c.L.set(bus.L);
  c.R.set(bus.R);
  return c;
}

function mix(b, seconds, w) {
  const dry = new Bus(seconds);
  const send = new Bus(seconds);
  for (const k of Object.keys(w)) {
    if (!w[k]) continue;
    b[k].mixInto(dry, w[k] * STEM_GAIN[k]);
    b[k].mixInto(send, w[k] * STEM_GAIN[k] * SEND[k]);
  }
  reverb(send, { size: 0.9, damp: 0.38, wet: 2.2, preDelay: 0.028, lowCut: 220, highCut: 8000 }).mixInto(dry, 1);
  if (w.mus) pingPong(b.mus, { time: 0.45, feedback: 0.3, wet: 0.09, highCut: 4200 }).mixInto(dry, w.mus * STEM_GAIN.mus);
  return dry;
}

function master(bus, seconds) {
  // EQ master: buang subsonik, kurangi dentum < 100 Hz, beri kehadiran 3 kHz & udara 9 kHz
  // agar tetap jelas di speaker ponsel.
  const eq = () => [biquad('highpass', 32, 0.7), biquad('lowshelf', 100, 0.7, -3.5), biquad('peaking', 3000, 0.8, 2), biquad('highshelf', 9000, 0.7, 1.5)];
  const el = eq();
  const er = eq();
  for (let i = 0; i < bus.length; i++) {
    let l = bus.L[i];
    let r = bus.R[i];
    for (let k = 0; k < 4; k++) {
      l = el[k](l);
      r = er[k](r);
    }
    bus.L[i] = l;
    bus.R[i] = r;
  }
  compress(bus, { threshold: -20, ratio: 2, attack: 0.015, release: 0.22 });
  // fade-in 8 ms & fade-out 0,9 dtk (gambar ikut memudar ke hitam)
  const fi = Math.round(0.008 * SR);
  const fo = Math.round(Math.min(0.9, seconds * 0.15) * SR);
  for (let i = 0; i < fi; i++) {
    bus.L[i] *= i / fi;
    bus.R[i] *= i / fi;
  }
  for (let i = 0; i < fo; i++) {
    const g = 0.5 + 0.5 * Math.cos((Math.PI * i) / fo);
    const j = bus.length - fo + i;
    bus.L[j] *= g;
    bus.R[j] *= g;
  }
  return bus;
}

/** Normalisasi ke target LUFS dengan limiter; iterasi sampai selisih < 0,1 LU. */
function normalize(pre) {
  let gainDb = TARGET_LUFS - integrated(pre);
  const peaks = tpEnvelope(pre);
  let out;
  let lu;
  for (let it = 0; it < 6; it++) {
    out = copy(pre);
    const g = db(gainDb);
    for (let i = 0; i < out.length; i++) {
      out.L[i] *= g;
      out.R[i] *= g;
    }
    limit(out, { ceilingDb: CEILING, lookahead: 0.005, release: 0.12, peaks, peakScale: g });
    lu = integrated(out);
    if (Math.abs(lu - TARGET_LUFS) < 0.1) break;
    gainDb += TARGET_LUFS - lu;
  }
  // pengaman akhir: true-peak (interpolasi sinc) harus ≤ ceiling
  let tp = truePeak(out);
  let guard = 0;
  while (tp > CEILING + 0.05 && guard++ < 4) {
    const g = db(CEILING - tp - 0.05);
    for (let i = 0; i < out.length; i++) {
      out.L[i] *= g;
      out.R[i] *= g;
    }
    tp = truePeak(out);
    lu = integrated(out);
  }
  // statistik limiter: seberapa sering & seberapa dalam puncak ditekan
  const ceil = db(CEILING);
  const gl = db(gainDb);
  let over = 0;
  let worst = 1;
  for (let i = 0; i < peaks.length; i++) {
    const p = peaks[i] * gl;
    if (p > ceil) {
      over++;
      if (p / ceil > worst) worst = p / ceil;
    }
  }
  return { out, gainDb, lufs: lu, tp, limitPct: (100 * over) / peaks.length, limitMaxDb: 20 * Math.log10(worst) };
}

function checkClean(bus, name) {
  let nan = 0;
  let dcL = 0;
  let dcR = 0;
  for (let i = 0; i < bus.length; i++) {
    if (!Number.isFinite(bus.L[i]) || !Number.isFinite(bus.R[i])) nan++;
    dcL += bus.L[i];
    dcR += bus.R[i];
  }
  if (nan) throw new Error(`${name}: ${nan} sampel NaN/Inf`);
  return { dc: Math.max(Math.abs(dcL), Math.abs(dcR)) / bus.length };
}

/** Loudness per segmen per bus (untuk memeriksa keseimbangan mix). */
function balance(v, b) {
  const rows = [];
  for (const seg of v.segments) {
    const a = Math.round((seg.from / FPS) * SR);
    const z = Math.round(((seg.from + seg.dur) / FPS) * SR);
    const row = { scene: seg.scene };
    for (const k of Object.keys(b)) {
      const val = integrated(b[k], a, z) + 20 * Math.log10(STEM_GAIN[k]);
      row[k] = Number.isFinite(val) ? Math.round(val * 10) / 10 : null;
    }
    rows.push(row);
  }
  return rows;
}

const keys = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const wantStems = !process.argv.includes('--no-stems');
const variants = keys.length ? keys : ['film', 'reel', 'teaser', 'ident'];
await mkdir(`${OUT}stems`, { recursive: true });
const report = {};
for (const key of variants) {
  const t0 = Date.now();
  const { v, seconds, b } = scoreVariant(key);
  const name = `imuslim-${key}`;
  report[key] = { seconds, balance: balance(v, b), versions: {} };
  let musikGain = 0;
  for (const [ver, w] of Object.entries(VERSIONS)) {
    const pre = master(mix(b, seconds, w), seconds);
    const { out, gainDb, lufs, tp, limitPct, limitMaxDb } = normalize(pre);
    const { dc } = checkClean(out, `${name}-${ver}`);
    if (ver === 'musik') musikGain = gainDb;
    await writeWav(`${OUT}${name}-${ver}.wav`, out);
    report[key].versions[ver] = { lufs: +lufs.toFixed(2), truePeak: +tp.toFixed(2), samplePeak: +samplePeak(out).toFixed(2), lra: +lra(out).toFixed(1), gainDb: +gainDb.toFixed(2), limiterPct: +limitPct.toFixed(2), limiterMaxDb: +limitMaxDb.toFixed(1), dc: +dc.toExponential(1) };
    console.log(`${name}-${ver}.wav  ${lufs.toFixed(2)} LUFS  ${tp.toFixed(2)} dBTP  LRA ${lra(out).toFixed(1)}  limiter ${limitPct.toFixed(2)}% maks ${limitMaxDb.toFixed(1)} dB`);
  }
  if (wantStems && (key === 'film' || key === 'reel')) {
    // stem pra-master (skala sama dengan mix musik, tanpa limiter)
    const g = db(musikGain);
    const stems = { musik: ['mus'], perkusi: ['darb', 'daf'], efek: ['hit', 'sfx'], ambience: ['amb'] };
    for (const [stem, ks] of Object.entries(stems)) {
      const s = new Bus(seconds);
      for (const k of ks) b[k].mixInto(s, STEM_GAIN[k] * VERSIONS.musik[k] * g);
      const pk = samplePeak(s);
      if (pk > -0.3) for (let i = 0; i < s.length; i++) {
        s.L[i] *= db(-0.3 - pk);
        s.R[i] *= db(-0.3 - pk);
      }
      await writeWav(`${OUT}stems/${name}-stem-${stem}.wav`, s);
    }
  }
  console.log(`  ${key}: ${((Date.now() - t0) / 1000).toFixed(1)} dtk`);
  console.table(report[key].balance);
}
await writeFile(`${OUT}loudness-js.json`, JSON.stringify(report, null, 2));
