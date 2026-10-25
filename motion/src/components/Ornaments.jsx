import { interpolate as flubber } from 'flubber';
import { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { khatam, khatamTile, rosette16, squarePath, starClip } from '../lib/geometry.js';
import { C } from '../lib/theme.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Kisi khatam yang "menggambar diri" dari titik asal ke luar.
 * progress 0..1; ubin yang lebih jauh dari asal mulai belakangan.
 */
export function Lattice({ progress = 1, tile = 140, originX = 0.5, originY = 0.5, stroke = C.gold, strokeWidth = 1.2, opacity = 1, glow = 0, sparkle = null, blur = 0, scale = 1 }) {
  const { width, height } = useVideoConfig();
  const tiles = useMemo(() => {
    const out = [];
    const cols = Math.ceil(width / tile) + 3;
    const rows = Math.ceil(height / tile) + 3;
    const ox = width * originX;
    const oy = height * originY;
    const startX = ox - Math.ceil(ox / tile + 1) * tile;
    const startY = oy - Math.ceil(oy / tile + 1) * tile;
    for (let r = 0; r < rows + 1; r++) {
      for (let c = 0; c < cols + 1; c++) {
        const cx = startX + c * tile;
        const cy = startY + r * tile;
        out.push({ cx, cy, d: khatamTile(cx, cy, tile), dist: Math.hypot(cx - ox, cy - oy), key: `${r}-${c}` });
      }
    }
    const max = Math.max(...out.map((t) => t.dist));
    return out.map((t) => ({ ...t, n: t.dist / max }));
  }, [width, height, tile, originX, originY]);

  return (
    <AbsoluteFill style={{ opacity, filter: blur ? `blur(${blur}px)` : undefined, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: `${originX * 100}% ${originY * 100}%` }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${glow}px ${C.goldLight})` : undefined }}>
        {tiles.map((t) => {
          const local = clamp01((progress * 1.25 - t.n) / 0.25);
          if (local <= 0) return null;
          const lit = sparkle ? sparkle(t) : 0;
          return (
            <g key={t.key}>
              <path d={t.d} fill="none" stroke={stroke} strokeWidth={strokeWidth} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - local} strokeLinecap="round" />
              {lit > 0 && <path d={khatam(t.cx, t.cy, tile * 0.35)} fill={C.goldLight} opacity={lit * 0.85} />}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

/** Roset 16 sudut yang menggambar diri dan berputar. */
export function Rosette({ cx, cy, R, draw = 1, rotate = 0, stroke = C.goldLight, strokeWidth = 2, opacity = 1, glow = 10, core = 1, dotted = true }) {
  const { width, height } = useVideoConfig();
  const squares = [0, 22.5, 45, 67.5].map((d) => squarePath(cx, cy, R * 0.86, d));
  const inner = [0, 45].map((d) => squarePath(cx, cy, R * 0.52, d));
  const coreSq = [0, 45].map((d) => squarePath(cx, cy, R * 0.2, d));
  const ticks = Array.from({ length: 32 }, (_, i) => {
    const a = (i * 11.25 * Math.PI) / 180;
    const r1 = R * 0.9;
    const r2 = R * (i % 2 ? 0.93 : 0.97);
    return `M${cx + r1 * Math.sin(a)} ${cy - r1 * Math.cos(a)}L${cx + r2 * Math.sin(a)} ${cy - r2 * Math.cos(a)}`;
  }).join('');
  const seg = (start, len) => clamp01((draw - start) / len);
  const dash = (p) => ({ pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p });
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity, filter: glow ? `drop-shadow(0 0 ${glow}px ${C.goldLight})` : undefined }}>
      <g transform={`rotate(${rotate} ${cx} ${cy})`} fill="none" stroke={stroke} strokeLinejoin="round" strokeLinecap="round">
        <circle cx={cx} cy={cy} r={R} strokeWidth={strokeWidth * 0.6} {...dash(seg(0, 0.35))} />
        <circle cx={cx} cy={cy} r={R * 0.88} strokeWidth={strokeWidth * 0.8} {...dash(seg(0.05, 0.35))} />
        <path d={ticks} strokeWidth={strokeWidth * 0.8} opacity={seg(0.2, 0.3)} />
        {squares.map((d, i) => (
          <path key={i} d={d} strokeWidth={strokeWidth} {...dash(seg(0.15 + i * 0.07, 0.4))} />
        ))}
        {dotted && <circle cx={cx} cy={cy} r={R * 0.6} strokeWidth={strokeWidth * 0.6} strokeDasharray="2 8" opacity={seg(0.4, 0.3)} />}
        {inner.map((d, i) => (
          <path key={i} d={d} strokeWidth={strokeWidth * 1.1} {...dash(seg(0.45 + i * 0.08, 0.35))} />
        ))}
        <circle cx={cx} cy={cy} r={R * 0.34} strokeWidth={strokeWidth * 0.7} {...dash(seg(0.55, 0.3))} />
        {coreSq.map((d, i) => (
          <path key={i} d={d} strokeWidth={strokeWidth} {...dash(seg(0.6 + i * 0.06, 0.3))} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={R * 0.05 * core} fill={C.goldLight} opacity={seg(0.7, 0.3)} />
    </svg>
  );
}

/** Morph bentuk tertutup A → B (flubber). Interpolator di-cache per pasangan path. */
export function useMorph(from, to) {
  return useMemo(() => flubber(from, to, { maxSegmentLength: 3 }), [from, to]);
}

/** Path rosette sebagai garis luar (untuk morph). */
export const rosetteOutline = rosette16;

/**
 * Iris berbentuk bintang delapan: anak elemen hanya tampil di dalam bintang yang membesar.
 * progress 0 = tertutup, 1 = menutupi seluruh layar.
 */
export function StarIris({ progress, x = 0.5, y = 0.5, rotate = 0, children }) {
  const { width, height } = useVideoConfig();
  const R = Math.hypot(width, height) * 0.62 * progress + 0.01;
  if (progress >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  return <AbsoluteFill style={{ clipPath: starClip(width * x, height * y, R, rotate + progress * 45) }}>{children}</AbsoluteFill>;
}

/** Medali bintang delapan (bingkai ikon fitur) dalam SVG. */
export function MedallionFrame({ size, draw = 1, stroke = C.goldLight, fill = 'transparent', strokeWidth = 2, rotate = 0 }) {
  const c = size / 2;
  const R = size * 0.46;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <g transform={`rotate(${rotate} ${c} ${c})`}>
        {[0, 45].map((d) => (
          <path key={d} d={squarePath(c, c, R, d)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        ))}
        <circle cx={c} cy={c} r={R * 0.68} fill="none" stroke={stroke} strokeWidth={strokeWidth * 0.6} opacity={0.6 * draw} />
      </g>
    </svg>
  );
}
