import { useMemo } from 'react';
import { MARK_ARCH, MARK_BOOK, MARK_CRESCENT, MARK_STEM, WORDMARK_CRESCENT, WORDMARK_LETTERS, WORDMARK_VIEWBOX } from '../brand/paths.js';
import { khatam } from '../lib/geometry.js';
import { C } from '../lib/theme.js';
import { useMorph } from './Ornaments.jsx';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Titik tengah kasar sebuah path (dari angka koordinatnya) — untuk posisi morph bintang → sabit. */
function centroid(d) {
  const nums = d.match(/-?\d*\.?\d+/g).map(Number);
  let x = 0;
  let y = 0;
  let n = 0;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x += nums[i];
    y += nums[i + 1];
    n++;
  }
  return [x / n, y / n];
}

/**
 * Mark iMuslim dari path asli (viewBox 64×64).
 * arch/stem/book: progres gambar 0..1. crescent: 0 = bintang delapan kecil, 1 = bulan sabit (morph).
 * depth: jumlah lapisan ekstrusi (kesan logo 3D tipis berbahan emas).
 */
export function Mark({ size, arch = 1, stem = 1, book = 1, crescent = 1, crescentOpacity = 1, depth = 0, depthX = 0.6, depthY = 0.9, onDark = true, glint = -1, glow = 0, id = 'mark' }) {
  const [cx, cy] = useMemo(() => centroid(MARK_CRESCENT), []);
  const star = useMemo(() => khatam(cx, cy, 4.2), [cx, cy]);
  const morph = useMorph(star, MARK_CRESCENT);
  const stroke = onDark ? C.ivoryWarm : C.emerald;
  const strokeDeep = onDark ? '#8f7c55' : '#08372a';
  const dash = (p) => ({ pathLength: 100, strokeDasharray: '100 100', strokeDashoffset: 100 - clamp01(p) * 100 });
  const crescentPath = crescent >= 1 ? MARK_CRESCENT : crescent <= 0 ? star : morph(crescent);
  const layers = Array.from({ length: depth }, (_, i) => depth - i);

  const shapes = (s, accent) => (
    <>
      <path d={MARK_ARCH} fill="none" stroke={s} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" {...dash(arch)} />
      <path d={MARK_STEM} fill="none" stroke={s} strokeWidth="3.8" strokeLinecap="round" {...dash(stem)} />
      <path d={MARK_BOOK} fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" {...dash(book)} />
      <path d={crescentPath} fill={accent} opacity={crescentOpacity} />
    </>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${glow}px ${C.goldLight})` : undefined }}>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.goldPale} />
          <stop offset="0.45" stopColor={C.goldLight} />
          <stop offset="1" stopColor={C.gold} />
        </linearGradient>
        <linearGradient id={`${id}-glint`} gradientUnits="userSpaceOnUse" x1={glint * 90 - 30} y1="0" x2={glint * 90 - 10} y2="64">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {layers.map((l) => (
        <g key={l} transform={`translate(${l * depthX * 0.12} ${l * depthY * 0.12})`} opacity={0.9}>
          {shapes(strokeDeep, '#7a5a1c')}
        </g>
      ))}
      {shapes(stroke, `url(#${id}-gold)`)}
      {glint > -1 && glint < 1.4 && (
        <g style={{ mixBlendMode: 'screen' }}>
          {shapes(`url(#${id}-glint)`, `url(#${id}-glint)`)}
        </g>
      )}
    </svg>
  );
}

/**
 * Wordmark "iMuslim" dari path asli. reveal 0..1 = sapuan kiri→kanan; glint = posisi kilau (0..1, -1 mati).
 */
export function Wordmark({ height, reveal = 1, glint = -1, color = C.ivoryWarm, id = 'wm', depth = 0 }) {
  const [vx, vy, vw, vh] = WORDMARK_VIEWBOX.split(/\s+/).map(Number);
  const width = (height * vw) / vh;
  const edge = vw * 0.08;
  const revealX = vx - edge + (vw + edge * 2) * clamp01(reveal);
  return (
    <svg width={width} height={height} viewBox={WORDMARK_VIEWBOX} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}-mask-g`} gradientUnits="userSpaceOnUse" x1={revealX - edge} y1="0" x2={revealX} y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={vx - edge * 2} y={vy - 20} width={vw + edge * 4} height={vh + 40}>
          <rect x={vx - edge * 2} y={vy - 20} width={vw + edge * 4} height={vh + 40} fill={`url(#${id}-mask-g)`} />
        </mask>
        <linearGradient id={`${id}-glint-g`} gradientUnits="userSpaceOnUse" x1={vx + (vw + 160) * glint - 160} y1="0" x2={vx + (vw + 160) * glint - 60} y2={vh * 0.6}>
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.goldPale} />
          <stop offset="1" stopColor={C.gold} />
        </linearGradient>
      </defs>
      <g mask={`url(#${id}-mask)`}>
        {Array.from({ length: depth }, (_, i) => depth - i).map((l) => (
          <g key={l} transform={`translate(${l * 0.5} ${l * 0.8})`} opacity={0.85}>
            <path d={WORDMARK_LETTERS} fill="#3a3326" />
            <path d={WORDMARK_CRESCENT} fill="#6b4f19" />
          </g>
        ))}
        <path d={WORDMARK_LETTERS} fill={color} />
        <path d={WORDMARK_CRESCENT} fill={`url(#${id}-gold)`} />
        {glint >= 0 && glint <= 1.2 && (
          <g style={{ mixBlendMode: 'screen' }}>
            <path d={WORDMARK_LETTERS} fill={`url(#${id}-glint-g)`} />
            <path d={WORDMARK_CRESCENT} fill={`url(#${id}-glint-g)`} />
          </g>
        )}
      </g>
    </svg>
  );
}
