// Waktu & gerak: grid ketukan musik dan kurva easing bernama yang dipakai di seluruh film.
import { Easing, interpolate, spring } from 'remotion';

export const FPS = 60;
export const BPM = 100;
/** Frame per ketukan (60 fps × 60 dtk / 100 BPM). */
export const BEAT = 36;
/** Frame per bar 4/4. */
export const BAR = 144;
export const beats = (n) => Math.round(n * BEAT);

/** Empat kurva bernama — semua animasi memakai salah satunya. */
export const ease = {
  /** Keluar lembut & panjang: reveal teks, munculnya objek. */
  silk: Easing.bezier(0.16, 1, 0.3, 1),
  /** Masuk-keluar: gerak kamera, morph. */
  glide: Easing.bezier(0.65, 0, 0.35, 1),
  /** Menukik: whip-pan, objek yang pergi. */
  dive: Easing.bezier(0.7, 0, 0.84, 0),
  /** Mendarat dengan sedikit dorongan: kartu, kunci kompas. */
  land: Easing.bezier(0.34, 1.32, 0.64, 1),
};

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

/** interpolate dengan clamp + easing (bawaan: silk). */
export function tw(frame, range, output, easing = ease.silk) {
  return interpolate(frame, range, output, { ...CLAMP, easing });
}

/** 0..1 di antara dua frame. */
export function prog(frame, start, end, easing = ease.silk) {
  return tw(frame, [start, end], [0, 1], easing);
}

/** Spring "mengunci" (sedikit overshoot) mulai `start`. */
export function lock(frame, start, fps = FPS, config = {}) {
  return spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 120, mass: 0.9, ...config } });
}

/** Spring lembut tanpa overshoot. */
export function settle(frame, start, fps = FPS) {
  return spring({ frame: frame - start, fps, config: { damping: 200, stiffness: 90 } });
}

/** Opasitas masuk–tahan–keluar. */
export function window3(frame, inStart, inEnd, outStart, outEnd) {
  return Math.min(prog(frame, inStart, inEnd), 1 - prog(frame, outStart, outEnd, ease.glide));
}
