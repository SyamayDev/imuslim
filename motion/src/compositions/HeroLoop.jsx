// Loop hero web (opsional): 9 dtk, mulus — semua gerak periodik terhadap panjang loop,
// sehingga frame terakhir menyambung ke frame pertama. Tanpa teks & tanpa suara.
import { useMemo } from 'react';
import { AbsoluteFill, Freeze, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { Bloom, LightRays, NightBackground, Vignette } from '../components/Atmosphere.jsx';
import { Lattice, Rosette } from '../components/Ornaments.jsx';
import { C, rgba } from '../lib/theme.js';

export const HERO_LOOP_FRAMES = 540;
const TAU = Math.PI * 2;

function LoopDust({ count = 90, seed = 'hero' }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const t = frame / HERO_LOOP_FRAMES; // 0..1 per loop
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: random(`${seed}-x-${i}`),
        y: random(`${seed}-y-${i}`),
        z: random(`${seed}-z-${i}`) ** 1.6,
        ph: random(`${seed}-p-${i}`) * TAU,
        sway: 1 + Math.floor(random(`${seed}-s-${i}`) * 2),
        tw: 2 + Math.floor(random(`${seed}-t-${i}`) * 4),
      })),
    [count, seed],
  );
  const span = height + 200 * u;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {parts.map((p, i) => {
        const laps = p.z > 0.55 ? 2 : 1; // partikel dekat bergerak lebih cepat (bilangan bulat → mulus)
        const y = ((p.y - t * laps + 10) % 1) * span - 100 * u;
        const x = p.x * width + Math.sin(TAU * t * p.sway + p.ph) * 40 * u;
        const size = (1.6 + p.z * p.z * 12) * u;
        const alpha = (0.25 + 0.75 * p.z) * (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(TAU * t * p.tw + p.ph)));
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
              background: `radial-gradient(circle, ${rgba(C.goldPale, alpha)} 0%, ${rgba(C.goldLight, alpha * 0.5)} 45%, transparent 72%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

export function HeroLoop() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const t = frame / HERO_LOOP_FRAMES;
  // roset: simetri 45° (tanpa lingkaran putus-putus) → satu loop memutar tepat satu periode simetri
  const rotate = t * 45;
  const sparkle = (tile) => {
    const ph = random(`hero-sp-${tile.key}`) * TAU;
    return Math.max(0, Math.sin(TAU * t * 2 + ph)) ** 10;
  };
  const breathe = 0.5 + 0.5 * Math.sin(TAU * t);
  return (
    <AbsoluteFill>
      <NightBackground glow={0.85} tint={C.hero} glowX={50} glowY={46} />
      <Lattice progress={1} tile={150 * u} strokeWidth={1 * u} opacity={0.16} sparkle={sparkle} />
      <Rosette cx={width / 2} cy={height * 0.46} R={Math.min(width, height) * 0.6} draw={1} rotate={rotate} strokeWidth={1.4 * u} opacity={0.2} glow={0} dotted={false} />
      {/* sinar dibekukan (goyangan bawaannya tidak periodik); denyutnya dari `breathe` */}
      <Freeze frame={0}>
        <LightRays x={50} y={40} spread={70} intensity={0.3 + 0.08 * breathe} />
      </Freeze>
      <Bloom x={50} y={44} size={26 + 4 * breathe} intensity={0.35} />
      <LoopDust />
      <Vignette strength={0.7} />
    </AbsoluteFill>
  );
}
