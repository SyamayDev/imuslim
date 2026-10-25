import { noise2D } from '@remotion/noise';
import { useMemo } from 'react';
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, rgba } from '../lib/theme.js';

/** Latar malam: hijau zamrud sangat gelap dengan cahaya lembut di titik fokus. */
export function NightBackground({ glow = 0.5, glowX = 50, glowY = 50, tint = C.hero, base = C.night }) {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(70% 70% at ${glowX}% ${glowY}%, ${rgba(tint, 0.55 * glow)} 0%, ${rgba(tint, 0.18 * glow)} 38%, transparent 70%), radial-gradient(120% 90% at 50% 120%, ${rgba(C.forest, 0.55)} 0%, transparent 60%), ${base}`,
      }}
    />
  );
}

/**
 * Debu emas tiga kedalaman. z mendekati 1 = dekat kamera (besar, kabur, bergerak cepat).
 * `parallax` menggeser lapisan sesuai kedalaman untuk kesan kamera bergerak.
 */
export function GoldDust({ count = 110, seed = 'dust', opacity = 1, rise = 0.25, parallaxX = 0, parallaxY = 0, burst = 0, burstX = 0.5, burstY = 0.5 }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: random(`${seed}-x-${i}`),
        y: random(`${seed}-y-${i}`),
        z: random(`${seed}-z-${i}`) ** 1.6,
        ph: random(`${seed}-p-${i}`) * Math.PI * 2,
        tw: 0.6 + random(`${seed}-t-${i}`) * 1.4,
      })),
    [count, seed],
  );
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      {parts.map((p, i) => {
        const nx = noise2D(seed, i * 0.37, frame * 0.0035) * 60 * unit;
        const ny = noise2D(`${seed}y`, i * 0.37, frame * 0.0035) * 60 * unit;
        const speed = (0.25 + p.z) * rise * unit;
        let x = p.x * width + nx + parallaxX * (p.z - 0.4) * width;
        let y = ((p.y * (height + 200) - frame * speed * 2 + 100000) % (height + 200)) - 100 + ny + parallaxY * (p.z - 0.4) * height;
        if (burst > 0) {
          const dx = x - burstX * width;
          const dy = y - burstY * height;
          const k = 1 + burst * (0.6 + p.z * 1.6);
          x = burstX * width + dx * k;
          y = burstY * height + dy * k;
        }
        const size = (1.6 + p.z * p.z * 13) * unit;
        const blur = p.z > 0.72 ? (p.z - 0.72) * 22 * unit : 0;
        const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(frame * 0.045 * p.tw + p.ph));
        const alpha = (0.25 + 0.75 * p.z) * twinkle;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              opacity: alpha,
              filter: blur ? `blur(${blur}px)` : undefined,
              background: `radial-gradient(circle, ${C.white} 0%, ${C.goldLight} 35%, ${rgba(C.gold, 0)} 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Berkas cahaya (god-rays) dari satu titik, berputar sangat pelan. */
export function LightRays({ x = 50, y = 100, intensity = 1, spread = 70, color = C.goldLight, rotate = 0 }) {
  const frame = useCurrentFrame();
  const rot = rotate + Math.sin(frame * 0.006) * 4;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: intensity }}>
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${rot}deg at ${x}% ${y}%, ${rgba(color, 0)} 0deg, ${rgba(color, 0.16)} 3deg, ${rgba(color, 0)} 7deg, ${rgba(color, 0)} 11deg)`,
          WebkitMaskImage: `radial-gradient(${spread}% ${spread}% at ${x}% ${y}%, #000 0%, rgba(0,0,0,.5) 45%, transparent 75%)`,
          maskImage: `radial-gradient(${spread}% ${spread}% at ${x}% ${y}%, #000 0%, rgba(0,0,0,.5) 45%, transparent 75%)`,
          filter: 'blur(6px)',
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(${spread * 0.55}% ${spread * 0.45}% at ${x}% ${y}%, ${rgba(color, 0.35)} 0%, transparent 70%)` }} />
    </AbsoluteFill>
  );
}

/** Pendar lembut (bloom) di satu titik. */
export function Bloom({ x = 50, y = 50, size = 40, intensity = 1, color = C.goldLight }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: intensity,
        background: `radial-gradient(${size}% ${size}% at ${x}% ${y}%, ${rgba(C.white, 0.55)} 0%, ${rgba(color, 0.35)} 22%, ${rgba(color, 0.08)} 50%, transparent 72%)`,
      }}
    />
  );
}

export function Vignette({ strength = 0.75 }) {
  return (
    <AbsoluteFill
      style={{ pointerEvents: 'none', background: `radial-gradient(120% 95% at 50% 50%, transparent 52%, rgba(0,0,0,${strength * 0.55}) 80%, rgba(0,0,0,${strength}) 100%)` }}
    />
  );
}

/** Film grain dari ubin PNG yang berganti tiap frame (deterministik). */
export function Grain({ opacity = 0.07 }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tile = 512;
  const idx = frame % 8;
  const ox = -Math.round(random(`gx${frame}`) * tile);
  const oy = -Math.round(random(`gy${frame}`) * tile);
  const cols = Math.ceil((width - ox) / tile);
  const rows = Math.ceil((height - oy) / tile);
  const src = staticFile(`textures/grain-${idx}.png`);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity, mixBlendMode: 'overlay' }}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <Img key={i} src={src} style={{ position: 'absolute', left: ox + (i % cols) * tile, top: oy + Math.floor(i / cols) * tile, width: tile, height: tile }} />
      ))}
    </AbsoluteFill>
  );
}

/** Lapisan sinematik penutup: vignette + grain. */
export function FilmFinish({ grain = 0.06, vignette = 0.7 }) {
  return (
    <>
      <Vignette strength={vignette} />
      <Grain opacity={grain} />
    </>
  );
}
