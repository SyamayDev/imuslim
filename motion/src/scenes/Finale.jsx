// Adegan 10–11: bukti kualitas (skor Lighthouse situs live) & penutup dengan logo + URL.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Bloom, FilmFinish, GoldDust, LightRays, NightBackground } from '../components/Atmosphere.jsx';
import { Mark, Wordmark } from '../components/Brand.jsx';
import { Lattice, Rosette } from '../components/Ornaments.jsx';
import { FadeText, KineticWords, Laptop, Phone, useCount } from '../components/UI.jsx';
import content from '../data/content.json';
import { useLayout } from '../lib/layout.js';
import { ease, prog, tw } from '../lib/motion.js';
import { C, F, rgba } from '../lib/theme.js';

function ScoreRing({ value, label, size, start }) {
  const frame = useCurrentFrame();
  const n = useCount(value, start, 70);
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  const p = prog(frame, start, start + 70, ease.silk) * (value / 100);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: size * 0.08, opacity: prog(frame, start - 10, start + 10) }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill={rgba('#03100b', 0.6)} stroke={rgba(C.ivoryWarm, 0.12)} strokeWidth={size * 0.07} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={C.mint}
            strokeWidth={size * 0.07}
            strokeLinecap="round"
            strokeDasharray={`${circ * p} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ filter: `drop-shadow(0 0 ${size * 0.05}px ${rgba(C.mint, 0.7)})` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: F.display, fontWeight: 600, fontSize: size * 0.34, color: C.ivoryWarm, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
      </div>
      <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: size * 0.135, color: rgba(C.ivoryWarm, 0.85), textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
}

export function S10Proof() {
  const frame = useCurrentFrame();
  const { width, height, u, portrait, safeTop } = useLayout();
  const lh = content.lighthouse;
  const orbit = tw(frame, [0, 288], [-12, 6], ease.glide);
  const rise = tw(frame, [0, 288], [40, -20], ease.glide) * u;
  const ring = Math.min(width, height) * (portrait ? 0.19 : 0.15);
  const scores = [
    [lh.scores.performance, 'Performa'],
    [lh.scores.accessibility, 'Aksesibilitas'],
    [lh.scores.bestPractices, 'Praktik terbaik'],
    [lh.scores.seo, 'SEO'],
  ];
  return (
    <AbsoluteFill>
      <NightBackground glow={0.9} tint={C.hero} glowX={portrait ? 50 : 34} glowY={50} />
      <Lattice progress={1} tile={150 * u} strokeWidth={1 * u} opacity={0.1} />
      <GoldDust count={80} seed="s10" rise={0.3} />
      <AbsoluteFill style={{ perspective: `${2200 * u}px` }}>
        <div style={{ position: 'absolute', left: portrait ? width * 0.08 : width * 0.04, top: portrait ? height * 0.5 : height * 0.2, transform: `rotateY(${orbit}deg) translateY(${rise}px)`, opacity: prog(frame, 0, 30) }}>
          <Laptop src="d-home" width={portrait ? width * 0.84 : width * 0.5} />
        </div>
        <div style={{ position: 'absolute', left: portrait ? width * 0.62 : width * 0.43, top: portrait ? height * 0.58 : height * 0.3, transform: `rotateY(${orbit * 1.4}deg) translateY(${-rise * 1.3}px)`, opacity: prog(frame, 10, 40) }}>
          <Phone src="m-home-dark" width={Math.min(width, height) * (portrait ? 0.3 : 0.27)} shine={tw(frame, [0, 288], [0, 1])} />
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: portrait ? width * 0.06 : width * 0.6, top: portrait ? safeTop : height * 0.13, width: portrait ? width * 0.88 : width * 0.36, display: 'grid', gap: 30 * u }}>
        <KineticWords text="Cepat · Ringan · Tanpa iklan · Tanpa pelacak" start={6} stagger={4} wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 64 : 60) * u, lineHeight: 1.1, color: C.ivoryWarm }} />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${portrait ? 4 : 2}, auto)`, justifyContent: 'start', gap: `${24 * u}px ${36 * u}px` }}>
          {scores.map(([v, l], i) => (
            <ScoreRing key={l} value={v} label={l} size={ring} start={40 + i * 10} />
          ))}
        </div>
        <FadeText start={50} style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 22 * u, lineHeight: 1.5, color: rgba(C.ivoryWarm, 0.7) }}>
          {lh.tool} · {lh.url} · {lh.formFactor} · diukur {lh.measured}
        </FadeText>
      </div>
      <FilmFinish />
    </AbsoluteFill>
  );
}

/** Atribusi sumber data (format lebar: di bawah; reel/teaser: di dalam kolom, di atas safe area). */
function sources(u, style) {
  return (
    <FadeText start={80} style={{ textAlign: 'center', fontFamily: F.ui, fontWeight: 500, fontSize: 22 * u, lineHeight: 1.5, color: rgba(C.ivoryWarm, 0.6), ...style }}>
      Sumber data: equran.id · api.myquran.com · hadis-api-id · OpenStreetMap
    </FadeText>
  );
}

export function S11Finale({ len = 288 }) {
  const frame = useCurrentFrame();
  const { width, height, u, portrait, landscape } = useLayout();
  const hit = 1 - prog(frame, 0, 60, ease.silk);
  const fadeOut = prog(frame, len - 40, len, ease.glide);
  const markSize = Math.min(width, height) * (portrait ? 0.26 : 0.22);
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <AbsoluteFill style={{ opacity: 1 - fadeOut }}>
        <NightBackground glow={0.9} tint={C.hero} glowY={42} />
        <Rosette cx={width / 2} cy={height * 0.42} R={Math.min(width, height) * 0.56} draw={1} rotate={frame * 0.06} strokeWidth={1.4 * u} opacity={0.16} glow={0} />
        <Lattice progress={1} tile={150 * u} strokeWidth={1 * u} opacity={0.1} />
        <LightRays x={50} y={40} spread={70} intensity={0.35 + 0.5 * hit} />
        <GoldDust count={110} seed="s11" rise={0.2} burst={hit * 0.5} burstY={0.42} />
        <Bloom x={50} y={40} size={22 + hit * 14} intensity={0.3 + hit * 0.6} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 * u, transform: `translateY(${-height * 0.03}px) scale(${tw(frame, [0, len], [1.04, 1], ease.glide)})` }}>
          <Mark size={markSize} depth={6} glint={tw(frame, [24, 70], [-0.2, 1.3], ease.glide)} glow={8 * u} id="s11mark" />
          <Wordmark height={Math.min(width, height) * (portrait ? 0.1 : 0.11)} reveal={1} glint={tw(frame, [30, 80], [-0.1, 1.2], ease.glide)} depth={4} id="s11wm" />
          <KineticWords text="Teman ibadah harian." start={40} stagger={5} align="center" wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: 56 * u, color: C.goldPale }} />
          <FadeText start={74} style={{ marginTop: 14 * u }}>
            <div style={{ padding: `${14 * u}px ${34 * u}px`, borderRadius: 999, border: `1.5px solid ${rgba(C.goldLight, 0.65)}`, background: rgba('#03100b', 0.55), fontFamily: F.ui, fontWeight: 700, fontSize: 36 * u, color: C.ivoryWarm, letterSpacing: '0.02em' }}>
              {content.url}
            </div>
          </FadeText>
          {!landscape && sources(u, { marginTop: 8 * u, maxWidth: width * 0.84 })}
        </AbsoluteFill>
        {landscape && sources(u, { position: 'absolute', left: 0, right: 0, bottom: height * 0.06 })}
        <FilmFinish />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
