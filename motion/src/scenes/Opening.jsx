// Adegan 1–4: garis emas → kisi khatam → roset mengunci & berubah (morph) menjadi lengkung
// mihrab → logo iMuslim tergambar dari path aslinya.
import { useMemo } from 'react';
import { AbsoluteFill, random, useCurrentFrame } from 'remotion';
import { Bloom, FilmFinish, GoldDust, LightRays, NightBackground } from '../components/Atmosphere.jsx';
import { Mark, Wordmark } from '../components/Brand.jsx';
import { Lattice, Rosette, rosetteOutline, useMorph } from '../components/Ornaments.jsx';
import { KineticWords } from '../components/UI.jsx';
import { archPath } from '../lib/geometry.js';
import { useLayout } from '../lib/layout.js';
import { BEAT, ease, lock, prog, settle, tw } from '../lib/motion.js';
import { C, F, rgba } from '../lib/theme.js';

/* ------------------------------------------------------------------ 1. Garis emas */
export function S1Genesis() {
  const frame = useCurrentFrame();
  const { width, height, u } = useLayout();
  const cam = tw(frame, [0, 288], [1, 1.07], ease.glide);
  const dustIn = prog(frame, 0, 70);
  const ignite = prog(frame, 48, 210, ease.silk);
  const flare = prog(frame, 48, 70) * (1 - prog(frame, 70, 160, ease.glide));
  const split = prog(frame, 216, 288, ease.glide);
  const lineW = width * 0.74 * ignite;
  const lineH = Math.max(2, 3 * u);
  return (
    <AbsoluteFill>
      <NightBackground glow={0.15 + 0.45 * ignite} />
      <AbsoluteFill style={{ transform: `scale(${cam})` }}>
        <GoldDust count={130} seed="s1" opacity={dustIn} rise={0.16} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: height / 2 - 70 * u,
            height: 140 * u,
            background: `radial-gradient(48% 50% at 50% 50%, ${rgba(C.goldLight, 0.32 * ignite + 0.25 * flare)}, transparent 72%)`,
            filter: `blur(${10 * u}px)`,
          }}
        />
        {[-1, 1].map((dir) => (
          <div
            key={dir}
            style={{
              position: 'absolute',
              left: (width - lineW) / 2,
              top: height / 2 - lineH / 2 + dir * split * height * 0.2,
              width: lineW,
              height: lineH,
              borderRadius: lineH,
              opacity: dir === 1 ? Math.max(split > 0 ? 1 : 0, 0) : 1,
              background: `linear-gradient(90deg, transparent, ${C.gold} 14%, ${C.goldLight} 34%, ${C.white} 50%, ${C.goldLight} 66%, ${C.gold} 86%, transparent)`,
              boxShadow: `0 0 ${14 * u}px ${C.goldLight}, 0 0 ${48 * u}px ${rgba(C.gold, 0.8)}`,
            }}
          />
        ))}
        <Bloom x={50} y={50} size={16 + 10 * flare} intensity={0.25 * ignite + 0.6 * flare} />
      </AbsoluteFill>
      <FilmFinish />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 2. Kisi khatam */
export function S2Lattice() {
  const frame = useCurrentFrame();
  const { width, height, u } = useLayout();
  const push = tw(frame, [0, 288], [0, 1], ease.glide);
  const lines = 1 - prog(frame, 0, 70, ease.glide);
  const beat = Math.floor(frame / (BEAT / 2));
  const sparkle = (t) => {
    const wave = (frame - 24) / 210;
    const ring = Math.max(0, 1 - Math.abs(t.n - wave) / 0.05);
    const pick = random(`sp-${beat}-${t.key}`) < 0.035 ? 1 - (frame % (BEAT / 2)) / (BEAT / 2) : 0;
    return Math.max(ring * 0.9, pick);
  };
  return (
    <AbsoluteFill>
      <NightBackground glow={0.55 + 0.3 * push} />
      <Lattice progress={prog(frame, 0, 190, ease.glide)} tile={84 * u} strokeWidth={0.8 * u} opacity={0.28} scale={1 + push * 0.22} />
      <Lattice progress={prog(frame, 12, 210, ease.glide)} tile={156 * u} strokeWidth={1.4 * u} opacity={0.62} scale={1 + push * 0.75} glow={3 * u} sparkle={sparkle} />
      <Lattice progress={prog(frame, 30, 230, ease.glide)} tile={340 * u} strokeWidth={2.6 * u} opacity={0.55 * (1 - prog(frame, 190, 270))} scale={1 + push * 2.8} blur={3 * u} />
      {[-1, 1].map((dir) => (
        <div
          key={dir}
          style={{
            position: 'absolute',
            left: width * 0.13,
            width: width * 0.74,
            top: height / 2 + dir * height * 0.2 - 1.5 * u,
            height: 3 * u,
            opacity: lines,
            background: `linear-gradient(90deg, transparent, ${C.goldLight} 30%, ${C.white} 50%, ${C.goldLight} 70%, transparent)`,
            boxShadow: `0 0 ${16 * u}px ${C.goldLight}`,
          }}
        />
      ))}
      <GoldDust count={90} seed="s2" rise={0.3} parallaxX={push * 0.04} />
      <LightRays x={50} y={50} spread={60} intensity={prog(frame, 150, 288)} />
      <Bloom x={50} y={50} size={12 + 20 * prog(frame, 210, 288)} intensity={prog(frame, 200, 288, ease.dive) * 0.9} />
      <FilmFinish />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 3. Roset → mihrab */
export function S3RosetteArch() {
  const frame = useCurrentFrame();
  const { width, height, u } = useLayout();
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.36;
  const archW = Math.min(width, height) * 0.46;
  const archH = Math.min(width, height) * 0.74;
  const baseY = cy + archH * 0.52;

  const from = useMemo(() => rosetteOutline(cx, cy, R * 0.86, 0), [cx, cy, R]);
  const to = useMemo(() => archPath(cx, baseY, archW, archH), [cx, baseY, archW, archH]);
  const morph = useMorph(from, to);

  const spin = 1 - lock(frame, 6, 60, { damping: 12, stiffness: 70 });
  const rotate = spin * 200;
  const draw = prog(frame, 0, 60, ease.silk);
  const detailFade = 1 - prog(frame, 96, 132, ease.glide);
  const m = prog(frame, 112, 190, ease.glide);
  const inside = prog(frame, 176, 228, ease.silk);
  const dolly = tw(frame, [206, 288], [1, 3.4], ease.dive);
  const lightY = ((baseY - archH * 0.1) / height) * 100;

  return (
    <AbsoluteFill>
      <NightBackground glow={0.7} />
      <Lattice progress={1} tile={156 * u} strokeWidth={1.2 * u} opacity={0.16 * (1 - inside * 0.6)} />
      <AbsoluteFill style={{ transform: `scale(${dolly})`, transformOrigin: `${(cx / width) * 100}% ${((cy + archH * 0.08) / height) * 100}%` }}>
        <Rosette cx={cx} cy={cy} R={R} draw={draw} rotate={rotate} strokeWidth={2.2 * u} opacity={detailFade} glow={8 * u} />
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <linearGradient id="arch-in" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.forest} />
              <stop offset="0.55" stopColor={C.hero} />
              <stop offset="1" stopColor={C.goldLight} />
            </linearGradient>
            <clipPath id="arch-clip">
              <path d={to} />
            </clipPath>
          </defs>
          {inside > 0 && <path d={to} fill="url(#arch-in)" opacity={inside} />}
          <path
            d={m > 0 ? morph(m) : from}
            fill="none"
            stroke={C.goldLight}
            strokeWidth={(2.4 + m * 1.4) * u}
            strokeLinejoin="round"
            opacity={Math.max(m > 0 ? 1 : 0, 1 - detailFade)}
            style={{ filter: `drop-shadow(0 0 ${10 * u}px ${C.goldLight})` }}
          />
          {inside > 0 && (
            <g clipPath="url(#arch-clip)" opacity={inside * 0.5}>
              <rect x={0} y={0} width={width} height={height} fill="none" />
            </g>
          )}
        </svg>
        {inside > 0 && (
          <AbsoluteFill style={{ clipPath: `path('${to}')` }}>
            <LightRays x={50} y={lightY + 8} spread={55} intensity={inside} />
            <GoldDust count={50} seed="s3in" rise={0.5} opacity={inside} />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      <GoldDust count={70} seed="s3" rise={0.22} opacity={1 - prog(frame, 220, 270)} />
      <Bloom x={50} y={lightY} size={18} intensity={inside * 0.5} />
      <Bloom x={50} y={50} size={32} intensity={0.9 * (1 - prog(frame, 0, 40, ease.silk))} />
      <FilmFinish />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 4. Logo */
export function S4Logo({ showTagline = true }) {
  const frame = useCurrentFrame();
  const { width, height, u, portrait } = useLayout();
  const tilt = 1 - settle(frame, 0);
  const markSize = Math.min(width, height) * (portrait ? 0.34 : 0.3);
  const hit = 144;
  const burst = prog(frame, hit, hit + 70, ease.silk) * (1 - prog(frame, hit + 40, hit + 140, ease.glide));
  const glintMark = tw(frame, [hit, hit + 46], [-0.2, 1.3], ease.glide);
  const glintWord = tw(frame, [hit + 6, hit + 58], [-0.1, 1.2], ease.glide);
  const reveal = prog(frame, hit - 18, hit + 30, ease.silk);
  const exit = prog(frame, 262, 288, ease.dive);
  const wmH = Math.min(width, height) * (portrait ? 0.105 : 0.12);
  const rays = prog(frame, hit - 10, hit + 30) * (1 - prog(frame, hit + 60, 288) * 0.6);

  return (
    <AbsoluteFill>
      <NightBackground glow={1} tint={C.hero} base="#06120d" glowY={44} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.forest}, ${C.hero} 60%, ${C.goldLight})`, opacity: 1 - prog(frame, 0, 30, ease.glide) }} />
      <Lattice progress={1} tile={156 * u} strokeWidth={1.1 * u} opacity={0.14} />
      <LightRays x={50} y={40} spread={70} intensity={rays * 0.9} />
      <GoldDust count={120} seed="s4" rise={0.22} burst={burst * 1.4} burstX={0.5} burstY={0.42} />
      <Bloom x={50} y={40} size={20 + burst * 16} intensity={0.25 + burst * 0.75} />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26 * u,
          transform: `perspective(${1600 * u}px) rotateY(${tilt * -26}deg) rotateX(${tilt * 10}deg) translateY(${-height * 0.04}px) scale(${1 + exit * 0.12})`,
          opacity: 1 - exit,
          filter: exit > 0 ? `blur(${exit * 10 * u}px)` : undefined,
        }}
      >
        <Mark
          size={markSize}
          arch={prog(frame, 8, 70, ease.glide)}
          stem={prog(frame, 44, 92, ease.glide)}
          book={prog(frame, 66, 122, ease.glide)}
          crescent={prog(frame, 110, 142, ease.glide)}
          crescentOpacity={prog(frame, 92, 108)}
          depth={6}
          glint={glintMark}
          glow={(4 + burst * 14) * u}
          id="s4mark"
        />
        <div style={{ opacity: reveal }}>
          <Wordmark height={wmH} reveal={reveal} glint={glintWord} depth={4} id="s4wm" />
        </div>
        {showTagline && (
          <KineticWords
            text="Teman ibadah harian."
            start={hit + 30}
            stagger={5}
            align="center"
            style={{ marginTop: 6 * u }}
            wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: 60 * u, color: C.goldPale, letterSpacing: '0.005em' }}
          />
        )}
      </AbsoluteFill>
      <FilmFinish />
    </AbsoluteFill>
  );
}
