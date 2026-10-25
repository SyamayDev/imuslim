// Satu sumber timeline untuk video DAN audio (scripts/audio/*.mjs mengimpor berkas ini),
// sehingga setiap potongan & hentakan musik jatuh di frame yang sama. 60 fps · 100 BPM ·
// 1 ketukan = 36 frame · 1 bar = 144 frame. File ini sengaja tanpa JSX.

/**
 * Segmen: { scene, from, dur, offset?, props?, enter? }
 *  - offset: mulai dari frame ke-n adegan (memotong awal adegan)
 *  - enter : 'iris' (iris bintang di atas frame terakhir adegan sebelumnya) | 'dip' (lewat hitam)
 */
export const VARIANTS = {
  film: {
    id: 'IMuslimFilm',
    width: 1920,
    height: 1080,
    durationInFrames: 3600,
    segments: [
      { scene: 'S1', from: 0, dur: 288 },
      { scene: 'S2', from: 288, dur: 288 },
      { scene: 'S3', from: 576, dur: 288 },
      { scene: 'S4', from: 864, dur: 288 },
      { scene: 'S5', from: 1152, dur: 720 },
      { scene: 'S6', from: 1872, dur: 288 },
      { scene: 'S7', from: 2160, dur: 288, enter: 'dip' },
      { scene: 'S8', from: 2448, dur: 288 },
      { scene: 'S9', from: 2736, dur: 288, enter: 'iris' },
      { scene: 'S10', from: 3024, dur: 288, enter: 'iris' },
      { scene: 'S11', from: 3312, dur: 288 },
    ],
  },
  reel: {
    id: 'IMuslimReel',
    width: 1080,
    height: 1920,
    // Reel Instagram 90 dtk (5400 frame = 37,5 bar). Semua potongan jatuh di awal bar sehingga
    // musik (scripts/audio/song-reel.mjs) bisa berupa satu lagu utuh tanpa jeda.
    durationInFrames: 5400,
    segments: [
      { scene: 'S1', from: 0, dur: 72, offset: 120 },
      { scene: 'S2', from: 72, dur: 72, offset: 216 },
      { scene: 'S4', from: 144, dur: 288 },
      { scene: 'S5', from: 432, dur: 432, props: { parts: 'A' } },
      { scene: 'RHome', from: 864, dur: 288 },
      { scene: 'S6', from: 1152, dur: 288 },
      { scene: 'RQuran', from: 1440, dur: 288 },
      { scene: 'S7', from: 1728, dur: 288, enter: 'dip' },
      { scene: 'RSholat', from: 2016, dur: 288 },
      { scene: 'S8', from: 2304, dur: 288 },
      { scene: 'RDoa', from: 2592, dur: 288 },
      { scene: 'RHadits', from: 2880, dur: 288 },
      { scene: 'RKalender', from: 3168, dur: 288 },
      { scene: 'RZakat', from: 3456, dur: 288 },
      { scene: 'RNyaman', from: 3744, dur: 288 },
      // potret: flip-book 8 halaman × ½ ketukan (≤ 3,3 ganti/dtk, aman WCAG 2.3.1)
      { scene: 'S5', from: 4032, dur: 288, props: { parts: 'BC', cLen: 18, flipCount: 8 } },
      { scene: 'S10', from: 4320, dur: 288, enter: 'iris' },
      { scene: 'S11QR', from: 4608, dur: 792, props: { len: 792 } },
    ],
  },
  teaser: {
    id: 'IMuslimTeaser',
    width: 1080,
    height: 1080,
    durationInFrames: 900,
    segments: [
      { scene: 'S2', from: 0, dur: 144, offset: 144 },
      { scene: 'S4', from: 144, dur: 288 },
      { scene: 'S5', from: 432, dur: 144, props: { parts: 'C' } },
      { scene: 'S11', from: 576, dur: 324, props: { len: 324 } },
    ],
  },
  ident: {
    id: 'IMuslimIdent',
    width: 1920,
    height: 1080,
    durationInFrames: 360,
    segments: [
      { scene: 'S2', from: 0, dur: 72, offset: 216 },
      { scene: 'S4', from: 72, dur: 288 },
    ],
  },
};

/** Durasi bagian montase sesuai props (dipakai audio untuk menaruh aksen per kartu). */
export function montageParts({ aLen = 108, bLen = 36, cLen = 9, parts = 'ABC', flipCount = 16 } = {}) {
  return {
    aLen,
    bLen,
    cLen,
    flipCount,
    a: parts.includes('A') ? 4 * aLen : 0,
    b: parts.includes('B') ? 4 * bLen : 0,
    c: parts.includes('C') ? flipCount * cLen : 0,
  };
}

/** Titik penting di dalam adegan (frame lokal) — sumber sinkron efek suara. */
export const SCENE_CUES = {
  S1: { ignite: 48, split: 216 },
  S2: { draw: 0, bloom: 210 },
  S3: { hit: 0, lockStart: 6, morph: 112, inside: 176, dolly: 206 },
  S4: { arch: 8, stem: 44, book: 66, crescent: 110, hit: 144, tagline: 174, exit: 262 },
  S6: { words: 28 },
  S7: { morph: 0 },
  S8: { arc: 92, kaaba: 168, lockStart: 176 },
  S9: { cuts: [0, 108, 198] },
  S10: { rings: 40 },
  S11: { hit: 0 },
};
