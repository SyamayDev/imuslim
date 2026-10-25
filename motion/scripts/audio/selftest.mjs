// Uji cepat instrumen: penalaan (autokorelasi), puncak, dan DC — tanpa perlu mendengar.
import { midiHz, SR } from './dsp.mjs';
import * as I from './instruments.mjs';

function f0(sig, from = 0.15, len = 0.25, lo = 60, hi = 2000) {
  const a = Math.round(from * SR);
  const n = Math.round(len * SR);
  const x = sig.subarray(a, a + n);
  let best = 0;
  let bestLag = 0;
  const corr = (lag) => {
    let s = 0;
    for (let i = 0; i + lag < x.length; i++) s += x[i] * x[i + lag];
    return s;
  };
  for (let lag = Math.floor(SR / hi); lag <= Math.ceil(SR / lo); lag++) {
    const c = corr(lag);
    if (c > best) {
      best = c;
      bestLag = lag;
    }
  }
  // interpolasi parabola
  const c0 = corr(bestLag - 1);
  const c1 = corr(bestLag);
  const c2 = corr(bestLag + 1);
  const d = (c0 - c2) / (2 * (c0 - 2 * c1 + c2));
  return SR / (bestLag + d);
}
const cents = (f, m) => 1200 * Math.log2(f / midiHz(m));
const stats = (s) => {
  let pk = 0;
  let dc = 0;
  for (const v of s) {
    pk = Math.max(pk, Math.abs(v));
    dc += v;
  }
  return `puncak ${pk.toFixed(2)} dc ${(dc / s.length).toExponential(1)}`;
};
for (const m of [50, 62, 69, 74, 81]) {
  const o = I.oud(m, 1.2);
  const q = I.qanun(m + 12, 1.2);
  console.log(`oud ${m}: ${cents(f0(o), m).toFixed(1)} sen, ${stats(o)} | qanun ${m + 12}: ${cents(f0(q), m + 12).toFixed(1)} sen, ${stats(q)}`);
}
const n = I.ney([[69, 1.0]]);
console.log(`ney 69: ${cents(f0(n, 0.3, 0.2), 69).toFixed(1)} sen, ${stats(n)}`);
for (const k of ['dum', 'tek', 'ka']) console.log(`darbuka ${k}: ${stats(I.darbuka(k))}`);
for (const k of ['boom', 'jingle']) console.log(`daf ${k}: ${stats(I.daf(k))}`);
console.log(`bass 38: ${cents(f0(I.bass(38, 0.6), 0.05, 0.2, 30, 400), 38).toFixed(1)} sen, ${stats(I.bass(38, 0.6))}`);
console.log(`impact: ${stats(I.impact())}  riser: ${stats(I.riser(2))}  swell: ${stats(I.swell(1))}  glint: ${stats(I.glint())}  bell: ${stats(I.bell(81))}  tick: ${stats(I.tick())}  bird: ${stats(I.bird())}`);
const p = I.pad([50, 57, 62, 66], 2);
const w = I.whoosh(1);
console.log(`pad: ${stats(p.L)}  whoosh: ${stats(w.L)}  drone: ${stats(I.drone(50, 4))}  wind: ${stats(I.wind(4).L)}  subRise: ${stats(I.subRise(3))}`);
