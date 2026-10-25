// Adegan 6–9: Al-Qur'an, jadwal sholat, kiblat, lalu kalender/doa-hadits/zakat.
// Semua teks agama & data diambil dari src/data/content.json (lihat scripts/sync-assets.mjs).
import { geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { feature } from 'topojson-client';
import land110 from 'world-atlas/land-110m.json';
import { FilmFinish, GoldDust, NightBackground } from '../components/Atmosphere.jsx';
import { Lattice, Rosette, StarIris, useMorph } from '../components/Ornaments.jsx';
import { Eyebrow, FadeText, KineticWords, Phone } from '../components/UI.jsx';
import content from '../data/content.json';
import { circlePath, khatam } from '../lib/geometry.js';
import { useLayout } from '../lib/layout.js';
import { ease, lock, prog, tw } from '../lib/motion.js';
import { C, F, mix, rgba } from '../lib/theme.js';

const LAND = feature(land110, land110.objects.land);
const GRATICULE = geoGraticule10();
const fmtDeg = (v) => v.toFixed(1).replace('.', ',');

/* ================================================================ 6. Al-Qur'an */
export function S6Quran() {
  const frame = useCurrentFrame();
  const { width, height, u, portrait } = useLayout();
  const { arab, translation, ref } = content.basmalah;
  const words = arab.split(/\s+/);
  const iris = prog(frame, 0, 36, ease.silk);
  const leave = prog(frame, 262, 288, ease.glide);
  const cardW = Math.min(width * (portrait ? 0.88 : 0.64), 1180 * u);
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <StarIris progress={iris}>
        <NightBackground glow={0.8} tint={C.hero} glowY={46} />
        <Rosette cx={width / 2} cy={height * 0.46} R={Math.min(width, height) * 0.62} draw={1} rotate={frame * 0.05} strokeWidth={1.4 * u} opacity={0.12} glow={0} />
        <GoldDust count={60} seed="s6" rise={0.12} opacity={0.7} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40 * u, opacity: 1 - leave, transform: `scale(${tw(frame, [0, 288], [0.97, 1.02], ease.glide)})` }}>
          <div
            style={{
              position: 'relative',
              width: cardW,
              padding: `${70 * u}px ${64 * u}px ${56 * u}px`,
              borderRadius: 36 * u,
              background: `radial-gradient(80% 60% at 50% 0%, ${rgba('#f4e8cc', 0.95)}, transparent 70%), ${C.ivoryWarm}`,
              boxShadow: `0 ${50 * u}px ${110 * u}px -${40 * u}px rgba(0,0,0,.75), 0 0 0 1px ${rgba(C.goldLight, 0.4)}`,
              textAlign: 'center',
              display: 'grid',
              gap: 22 * u,
            }}
          >
            <div style={{ position: 'absolute', inset: 14 * u, borderRadius: 26 * u, border: `${1.5 * u}px solid ${rgba(C.gold, 0.7)}` }} />
            <div style={{ position: 'absolute', inset: 22 * u, borderRadius: 20 * u, border: `${1.2 * u}px dashed ${rgba(C.gold, 0.45)}` }} />
            <div lang="ar" dir="rtl" style={{ fontFamily: F.arabic, fontSize: (portrait ? 100 : 122) * u, lineHeight: 1.85, color: C.emerald, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: `0 ${26 * u}px` }}>
              {words.map((w, i) => {
                const p = prog(frame, 28 + i * 16, 28 + i * 16 + 34, ease.silk);
                return (
                  <span key={i} style={{ opacity: p, transform: `translateY(${(1 - p) * 10 * u}px)` }}>
                    {w}
                  </span>
                );
              })}
            </div>
            <div style={{ height: 1.5 * u, width: '46%', margin: '0 auto', background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, opacity: prog(frame, 100, 130) }} />
            <FadeText start={112} style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 36 * u, color: C.ink, lineHeight: 1.45 }}>
              “{translation}”
            </FadeText>
            <FadeText start={134} style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 26 * u, letterSpacing: '0.08em', color: C.goldDeep }}>
              {ref}
            </FadeText>
          </div>
          <FadeText start={158} style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 36 * u, color: rgba(C.ivoryWarm, 0.9), letterSpacing: '0.02em' }}>
            114 surah · audio 6 qari · tafsir
          </FadeText>
        </AbsoluteFill>
        <FilmFinish vignette={0.6} />
      </StarIris>
    </AbsoluteFill>
  );
}

/* ================================================================ 7. Jadwal sholat */
const SKY = [
  [0, ['#06141d', '#272a48', '#a86a66']],
  [70, ['#0d3a4d', '#3c7a82', '#e3c08a']],
  [140, ['#135067', '#5a958f', '#efd9a8']],
  [204, ['#251b37', '#9c4b38', '#ee9f52']],
  [262, ['#040907', '#07130e', '#0D4E3B']],
];
function skyAt(f) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [f0, c0] = SKY[i];
    const [f1, c1] = SKY[i + 1];
    if (f <= f1) {
      const t = ease.glide(Math.max(0, Math.min(1, (f - f0) / (f1 - f0))));
      return c0.map((c, k) => mix(c, c1[k], t));
    }
  }
  return SKY[SKY.length - 1][1];
}
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Siluet masjid sederhana (kubah & menara) — tanpa makhluk bernyawa. */
function Skyline({ width, height, color }) {
  const y = height;
  const s = Math.min(width, height) / 1080;
  const dome = (cx, w, h) => `M${cx - w / 2} ${y - 120 * s} C${cx - w / 2} ${y - 120 * s - h} ${cx + w / 2} ${y - 120 * s - h} ${cx + w / 2} ${y - 120 * s} Z`;
  const minaret = (x, h, w) => `M${x - w / 2} ${y} V${y - h} L${x} ${y - h - 34 * s} L${x + w / 2} ${y - h} V${y} Z`;
  const cx = width * 0.5;
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
      <path d={`M0 ${y - 120 * s} H${width} V${y} H0Z`} fill={color} />
      <path d={dome(cx, 300 * s, 230 * s)} fill={color} />
      <path d={dome(cx - 250 * s, 150 * s, 110 * s)} fill={color} />
      <path d={dome(cx + 250 * s, 150 * s, 110 * s)} fill={color} />
      <path d={minaret(cx - 430 * s, 360 * s, 36 * s)} fill={color} />
      <path d={minaret(cx + 430 * s, 360 * s, 36 * s)} fill={color} />
      <rect x={cx - 2 * s} y={y - 120 * s - 230 * s - 60 * s} width={4 * s} height={60 * s} fill={color} />
    </svg>
  );
}

export function S7Sholat() {
  const frame = useCurrentFrame();
  const { width, height, u, portrait, safeTop, safeBottom } = useLayout();
  const [top, mid, bottom] = skyAt(frame);
  const times = content.prayer.times;
  const rc = { x: portrait ? width / 2 : width * 0.7, y: portrait ? height * 0.5 : height * 0.47 };
  const R = Math.min(width, height) * (portrait ? 0.3 : 0.27);
  const star = useMemo(() => khatam(rc.x, rc.y, R * 1.1, 22.5), [rc.x, rc.y, R]);
  const ring = useMemo(() => circlePath(rc.x, rc.y, R), [rc.x, rc.y, R]);
  const morph = useMorph(star, ring);
  const m = prog(frame, 0, 40, ease.glide);
  const startMin = toMin(times[0][1]);
  const endMin = toMin(times[times.length - 1][1]);
  const clock = tw(frame, [30, 250], [startMin, endMin], ease.glide);
  const fill = (clock - startMin) / (endMin - startMin);
  const hh = String(Math.floor(clock / 60)).padStart(2, '0');
  const mm = String(Math.floor(clock % 60)).padStart(2, '0');
  const active = times.reduce((acc, [, t], i) => (clock >= toMin(t) - 0.5 ? i : acc), 0);
  const sunT = prog(frame, 0, 214, ease.glide);
  const sunX = width * (0.08 + 0.84 * sunT);
  // potret: busur matahari lebih rendah agar tidak lewat di belakang judul (kontras teks)
  const sunY = portrait ? height * (0.82 - Math.sin(sunT * Math.PI) * 0.44) : height * (0.78 - Math.sin(sunT * Math.PI) * 0.62);
  const night = prog(frame, 196, 262, ease.glide);
  const C2 = 2 * Math.PI * R;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 58%, ${bottom} 100%)` }} />
      <div
        style={{
          position: 'absolute',
          left: sunX - 60 * u,
          top: sunY - 60 * u,
          width: 120 * u,
          height: 120 * u,
          borderRadius: '50%',
          opacity: 1 - night,
          background: `radial-gradient(circle, #fff7e0 0%, ${C.goldLight} 38%, ${rgba(C.goldLight, 0)} 70%)`,
          boxShadow: `0 0 ${120 * u}px ${60 * u}px ${rgba(C.goldLight, 0.35)}`,
        }}
      />
      <GoldDust count={70} seed="s7" rise={0.1} opacity={night} />
      {/* bulan sabit di ruang kosong: tidak menimpa judul maupun cincin */}
      <div style={{ position: 'absolute', left: portrait ? width * 0.8 : width * 0.47, top: portrait ? height * 0.335 : height * 0.08, opacity: night }}>
        <svg width={110 * u} height={110 * u} viewBox="-50 -50 100 100">
          <path d="M18 -38 A42 42 0 1 0 18 38 A34 34 0 1 1 18 -38Z" fill={C.goldPale} style={{ filter: `drop-shadow(0 0 ${12 * u}px ${C.goldLight})` }} />
        </svg>
      </div>
      <AbsoluteFill style={{ opacity: 0.9 }}>
        <Skyline width={width} height={height} color={mix('#06120d', bottom, 0.15)} />
      </AbsoluteFill>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path d={m < 1 ? morph(m) : ring} fill={rgba('#04100c', 0.55)} stroke={rgba(C.goldLight, 0.35)} strokeWidth={14 * u} />
        <circle
          cx={rc.x}
          cy={rc.y}
          r={R}
          fill="none"
          stroke={C.goldLight}
          strokeWidth={14 * u}
          strokeLinecap="round"
          strokeDasharray={`${C2 * Math.max(0, fill)} ${C2}`}
          transform={`rotate(-90 ${rc.x} ${rc.y})`}
          opacity={m}
          style={{ filter: `drop-shadow(0 0 ${10 * u}px ${C.goldLight})` }}
        />
        {times.map(([name, t], i) => {
          const a = ((toMin(t) - startMin) / (endMin - startMin)) * 2 * Math.PI - Math.PI / 2;
          const x = rc.x + R * Math.cos(a);
          const y = rc.y + R * Math.sin(a);
          return <circle key={name} cx={x} cy={y} r={(i <= active ? 11 : 8) * u} fill={i <= active ? C.goldPale : rgba(C.ivoryWarm, 0.5)} opacity={m} />;
        })}
      </svg>
      <div style={{ position: 'absolute', left: rc.x - R, top: rc.y - R, width: R * 2, height: R * 2, display: 'grid', placeContent: 'center', textAlign: 'center', opacity: prog(frame, 24, 50) }}>
        <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 24 * u, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.goldPale }}>{content.prayer.city}</div>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 112 * u, lineHeight: 1.05, color: C.ivoryWarm, fontVariantNumeric: 'tabular-nums' }}>
          {hh}:{mm}
        </div>
        <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 30 * u, color: C.goldPale }}>{times[active][0]}</div>
      </div>
      <div style={{ position: 'absolute', left: portrait ? width * 0.08 : width * 0.07, top: portrait ? safeTop : height * 0.2, width: portrait ? width * 0.84 : width * 0.4, display: 'grid', gap: 18 * u }}>
        <Eyebrow start={6} size={22 * u}>
          Waktu sholat
        </Eyebrow>
        <KineticWords text="Jadwal sholat 517 kota" start={10} stagger={5} wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 88 : 96) * u, lineHeight: 1.04, color: C.ivoryWarm, textShadow: `0 ${4 * u}px ${24 * u}px rgba(0,0,0,.45)` }} />
        <FadeText start={30} style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 28 * u, lineHeight: 1.5, color: rgba(C.ivoryWarm, 0.85) }}>
          Contoh data asli: {content.prayer.city} · {content.prayer.dateLabel}
        </FadeText>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: portrait ? safeBottom + 10 * u : height * 0.06, display: 'flex', justifyContent: 'center', gap: 16 * u, flexWrap: 'wrap', padding: `0 ${40 * u}px`, opacity: prog(frame, 40, 70) }}>
        {times.map(([name, t], i) => (
          <div
            key={name}
            style={{
              minWidth: 170 * u,
              padding: `${14 * u}px ${22 * u}px`,
              borderRadius: 18 * u,
              textAlign: 'center',
              background: i === active ? rgba(C.goldLight, 0.22) : rgba('#03100b', 0.45),
              border: `1px solid ${i === active ? C.goldLight : rgba(C.ivoryWarm, 0.18)}`,
              color: C.ivoryWarm,
            }}
          >
            <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 24 * u, opacity: 0.85 }}>{name}</div>
            <div style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 36 * u, fontVariantNumeric: 'tabular-nums', color: i === active ? C.goldPale : C.ivoryWarm }}>{t}</div>
          </div>
        ))}
      </div>
      <FilmFinish vignette={0.55} />
    </AbsoluteFill>
  );
}

/* ================================================================ 8. Kiblat */
function KaabaIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" style={{ overflow: 'visible' }}>
      <rect x="-10" y="-10" width="20" height="20" rx="2" fill="#141513" stroke={C.goldLight} strokeWidth="1.4" />
      <rect x="-10" y="-5" width="20" height="3" fill={C.goldLight} />
    </svg>
  );
}

function Compass({ size, angle, glow }) {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <svg width={size} height={size} viewBox="-160 -160 320 320" style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${glow}px ${rgba(C.goldLight, 0.6)})` }}>
      <circle r="152" fill={rgba('#061410', 0.9)} stroke={rgba(C.goldLight, 0.6)} strokeWidth="2" />
      <circle r="120" fill="none" stroke={rgba(C.goldLight, 0.25)} strokeWidth="1" />
      {ticks.map((t) => (
        <line key={t} x1="0" y1="-150" x2="0" y2={t % 30 === 0 ? -132 : -142} stroke={t % 30 === 0 ? C.goldPale : rgba(C.ivoryWarm, 0.45)} strokeWidth={t % 30 === 0 ? 2.4 : 1.2} transform={`rotate(${t})`} />
      ))}
      {[
        ['U', 0],
        ['T', 90],
        ['S', 180],
        ['B', 270],
      ].map(([l, d]) => (
        <text key={l} transform={`rotate(${d}) translate(0 -100) rotate(${-d})`} textAnchor="middle" dominantBaseline="central" fontFamily={F.ui} fontWeight="800" fontSize="22" fill={l === 'U' ? '#e9937d' : C.ivoryWarm}>
          {l}
        </text>
      ))}
      <g transform={`rotate(${angle})`}>
        <line x1="0" y1="0" x2="0" y2="-112" stroke={C.mint} strokeWidth="5" strokeLinecap="round" />
        <g transform={`translate(0 -128) rotate(${-angle})`}>
          <rect x="-10" y="-10" width="20" height="20" rx="2" fill="#141513" stroke={C.goldLight} strokeWidth="1.5" />
          <rect x="-10" y="-5" width="20" height="3" fill={C.goldLight} />
        </g>
      </g>
      <circle r="8" fill={C.mint} stroke="#061410" strokeWidth="3" />
    </svg>
  );
}

export function S8Kiblat() {
  const frame = useCurrentFrame();
  const { width, height, u, portrait, safeTop } = useLayout();
  const q = content.qibla;
  const from = [q.lon, q.lat];
  const to = [q.kaaba.lon, q.kaaba.lat];
  const gR = Math.min(width, height) * (portrait ? 0.27 : 0.33);
  const gc = portrait ? [width / 2, height * 0.4] : [width * 0.31, height * 0.56];
  const rot = [tw(frame, [0, 130], [-142, -74], ease.glide), tw(frame, [0, 130], [4, -8], ease.glide)];
  const proj = geoOrthographic().scale(gR).translate(gc).rotate(rot).clipAngle(90).precision(0.4);
  const path = geoPath(proj);
  const arcT = prog(frame, 92, 172, ease.glide);
  const interp = geoInterpolate(from, to);
  const arc = { type: 'LineString', coordinates: Array.from({ length: 64 }, (_, i) => interp((i / 63) * arcT)) };
  const head = proj(interp(arcT));
  const pFrom = proj(from);
  const pTo = proj(to);
  const kaabaIn = prog(frame, 168, 196, ease.land);
  const needle = q.bearing * lock(frame, 176, 60, { damping: 9, stiffness: 70 });
  // Angka tidak ikut overshoot: naik monoton & berhenti tepat di nilai hasil hitung.
  const readout = q.bearing * prog(frame, 176, 196, ease.silk);
  const compassIn = prog(frame, 140, 176, ease.silk);
  const compassSize = Math.min(width, height) * (portrait ? 0.36 : 0.5);
  const cc = portrait ? [width * 0.3, height * 0.69] : [width * 0.75, height * 0.55];
  const appear = prog(frame, 0, 18);
  return (
    <AbsoluteFill>
      <NightBackground glow={0.7} tint={C.hero} glowX={portrait ? 50 : 32} glowY={portrait ? 40 : 56} />
      <Lattice progress={1} tile={150 * u} strokeWidth={1 * u} opacity={0.1} />
      <GoldDust count={70} seed="s8" rise={0.15} />
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: appear }}>
        <defs>
          <radialGradient id="globe-g" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#0f3a2d" />
            <stop offset="1" stopColor="#04110c" />
          </radialGradient>
        </defs>
        <circle cx={gc[0]} cy={gc[1]} r={gR * 1.06} fill="none" stroke={rgba(C.goldLight, 0.18)} strokeWidth={22 * u} style={{ filter: `blur(${10 * u}px)` }} />
        <path d={path({ type: 'Sphere' })} fill="url(#globe-g)" stroke={rgba(C.goldLight, 0.7)} strokeWidth={1.6 * u} />
        <path d={path(GRATICULE)} fill="none" stroke={rgba(C.goldLight, 0.16)} strokeWidth={0.9 * u} />
        <path d={path(LAND)} fill={rgba(C.mint, 0.18)} stroke={rgba(C.goldLight, 0.55)} strokeWidth={1 * u} />
        {arcT > 0 && <path d={path(arc)} fill="none" stroke={C.goldPale} strokeWidth={4 * u} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${8 * u}px ${C.goldLight})` }} />}
        {arcT > 0 && arcT < 1 && head && <circle cx={head[0]} cy={head[1]} r={9 * u} fill="#fff7e0" style={{ filter: `drop-shadow(0 0 ${14 * u}px ${C.goldLight})` }} />}
        {pFrom && (
          <g opacity={prog(frame, 70, 96)}>
            <circle cx={pFrom[0]} cy={pFrom[1]} r={9 * u} fill={C.mint} stroke="#04110c" strokeWidth={3 * u} />
            <text x={pFrom[0] + 18 * u} y={pFrom[1] + 8 * u} fontFamily={F.ui} fontWeight="700" fontSize={26 * u} fill={C.ivoryWarm}>
              {q.from}
            </text>
          </g>
        )}
        {pTo && kaabaIn > 0 && (
          <g opacity={kaabaIn}>
            {[0, 1, 2].map((k) => {
              const t = ((frame - 168 + k * 20) % 60) / 60;
              return <circle key={k} cx={pTo[0]} cy={pTo[1]} r={(14 + t * 46) * u} fill="none" stroke={C.goldLight} strokeWidth={2 * u} opacity={(1 - t) * 0.8} />;
            })}
            <g transform={`translate(${pTo[0] - 16 * u} ${pTo[1] - 16 * u}) scale(${kaabaIn})`}>
              <KaabaIcon size={32 * u} />
            </g>
            <text x={pTo[0]} y={pTo[1] - 34 * u} textAnchor="middle" fontFamily={F.ui} fontWeight="700" fontSize={26 * u} fill={C.goldPale}>
              Ka'bah
            </text>
          </g>
        )}
      </svg>
      <div style={{ position: 'absolute', left: cc[0] - compassSize / 2, top: cc[1] - compassSize / 2, opacity: compassIn, transform: `scale(${0.85 + 0.15 * compassIn})` }}>
        <Compass size={compassSize} angle={needle} glow={(4 + 10 * prog(frame, 200, 230) * (1 - prog(frame, 230, 288))) * u} />
      </div>
      <div style={{ position: 'absolute', left: portrait ? width * 0.08 : width * 0.06, top: portrait ? safeTop : height * 0.07, width: portrait ? width * 0.84 : width * 0.6, display: 'grid', gap: 14 * u }}>
        <Eyebrow start={4} size={22 * u}>
          Arah kiblat
        </Eyebrow>
        <KineticWords text="Arah kiblat dari tempat Anda" start={8} stagger={4} wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 76 : 80) * u, lineHeight: 1.05, color: C.ivoryWarm }} />
      </div>
      <div style={{ position: 'absolute', left: portrait ? width * 0.56 : cc[0] - 360 * u, width: portrait ? width * 0.38 : 720 * u, top: portrait ? height * 0.615 : cc[1] + compassSize / 2 + 18 * u, textAlign: portrait ? 'left' : 'center', opacity: prog(frame, 176, 188) }}>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 68 : 74) * u, color: C.goldPale, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmtDeg(readout)}°</div>
      </div>
      <FadeText
        start={190}
        style={
          portrait
            ? { position: 'absolute', left: width * 0.56, width: width * 0.38, top: height * 0.665, textAlign: 'left', fontFamily: F.ui, fontWeight: 600, fontSize: 28 * u, lineHeight: 1.45, color: rgba(C.ivoryWarm, 0.88) }
            : { position: 'absolute', left: 0, right: 0, bottom: height * 0.05, textAlign: 'center', fontFamily: F.ui, fontWeight: 600, fontSize: 28 * u, color: rgba(C.ivoryWarm, 0.88) }
        }
      >
        {q.from} → Ka'bah · ± {q.distanceKm.toLocaleString('id-ID')} km · dihitung langsung di perangkat
      </FadeText>
      <FilmFinish />
    </AbsoluteFill>
  );
}

/* ================================================================ 9. Kalender · Doa & Hadits · Zakat */
function MoonPhases({ size, rotate }) {
  const r = size * 0.42;
  return (
    <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{ overflow: 'visible' }}>
      <circle r={r} fill="none" stroke={rgba(C.goldLight, 0.3)} strokeWidth={1.5} strokeDasharray="3 9" />
      <g transform={`rotate(${rotate})`}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * 2 * Math.PI;
          const x = r * Math.sin(a);
          const y = -r * Math.cos(a);
          const mr = size * 0.055;
          const f = i / 8; // 0 = bulan baru, 0,5 = purnama
          const k = Math.cos(2 * Math.PI * f);
          const waxing = f < 0.5;
          const inner = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
          const lit = `M0 ${-mr} A${mr} ${mr} 0 0 ${waxing ? 1 : 0} 0 ${mr} A${Math.max(0.01, Math.abs(k) * mr)} ${mr} 0 0 ${inner} 0 ${-mr}Z`;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${-rotate})`}>
              <circle r={mr} fill="#0b1a14" stroke={rgba(C.goldLight, 0.5)} strokeWidth={1} />
              {i > 0 && <path d={lit} fill={C.goldPale} opacity={0.92} />}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function PanelKalender() {
  const frame = useCurrentFrame();
  const { width, height, u, portrait } = useLayout();
  const s = Math.min(width, height) * (portrait ? 0.74 : 0.8);
  return (
    <AbsoluteFill>
      <NightBackground glow={0.8} tint={'#173b33'} glowX={portrait ? 50 : 38} />
      <div style={{ position: 'absolute', left: (portrait ? width / 2 : width * 0.37) - s / 2, top: (portrait ? height * 0.36 : height * 0.47) - s / 2 }}>
        <MoonPhases size={s} rotate={frame * 0.5} />
      </div>
      <div style={{ position: 'absolute', left: (portrait ? width / 2 : width * 0.37) - 400 * u, width: 800 * u, top: (portrait ? height * 0.36 : height * 0.47) - 110 * u, textAlign: 'center', display: 'grid', gap: 10 * u }}>
        <KineticWords text={content.hijri.label} start={0} stagger={4} align="center" style={{ flexWrap: 'nowrap' }} wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 58 : 62) * u, color: C.goldPale, lineHeight: 1.05, whiteSpace: 'nowrap' }} />
        <FadeText start={6} style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 30 * u, color: rgba(C.ivoryWarm, 0.88) }}>
          {content.hijri.gregorian}
        </FadeText>
        <FadeText start={10} style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 24 * u, color: rgba(C.ivoryWarm, 0.7) }}>
          Masehi & Hijriah berdampingan
        </FadeText>
      </div>
      {!portrait && (
        <div style={{ position: 'absolute', left: width * 0.66, top: height * 0.1, transform: `perspective(${1600 * u}px) rotateY(-14deg) translateY(${tw(frame, [0, 96], [30, -10], ease.glide) * u}px)` }}>
          <Phone src="m-kalender" width={Math.min(width, height) * 0.34} />
        </div>
      )}
    </AbsoluteFill>
  );
}

function PanelDoaHadits() {
  const frame = useCurrentFrame();
  const { width, height, u, portrait } = useLayout();
  const pw = Math.min(width, height) * (portrait ? 0.42 : 0.33);
  const fan = prog(frame, 0, 40, ease.land);
  const cx = portrait ? width / 2 : width * 0.66;
  return (
    <AbsoluteFill style={{ isolation: 'isolate' }}>
      <NightBackground glow={0.8} tint={'#14463a'} glowX={portrait ? 50 : 64} />
      {[
        ['m-doa-detail', -1],
        ['m-arbain', 1],
      ].map(([src, d]) => (
        <div key={src} style={{ position: 'absolute', left: cx - pw / 2 + d * fan * pw * 0.42, top: height * (portrait ? 0.4 : 0.12), transform: `rotate(${d * fan * 8}deg)`, transformOrigin: '50% 100%', zIndex: d > 0 ? 2 : 1 }}>
          <Phone src={src} width={pw} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: portrait ? width * 0.08 : width * 0.07, top: portrait ? height * 0.1 : height * 0.34, width: portrait ? width * 0.84 : width * 0.4, display: 'grid', gap: 16 * u }}>
        <KineticWords text="Doa & Dzikir · Hadits" start={0} stagger={4} wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 76 : 84) * u, color: C.ivoryWarm, lineHeight: 1.05 }} />
        <FadeText start={8} style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 32 * u, color: C.goldPale }}>
          335 doa · 9 kitab + 42 Arbain
        </FadeText>
      </div>
    </AbsoluteFill>
  );
}

function PanelZakat() {
  const frame = useCurrentFrame();
  const { width, height, u, portrait } = useLayout();
  const pw = Math.min(width, height) * (portrait ? 0.42 : 0.33);
  const rows = [
    ['Zakat', '2,5%'],
    ['Nisab', '85 gram emas'],
    ['Fitrah', '2,5 kg beras per jiwa'],
  ];
  return (
    <AbsoluteFill>
      <NightBackground glow={0.8} tint={'#3a3a1c'} glowX={portrait ? 50 : 66} />
      <div style={{ position: 'absolute', left: (portrait ? width / 2 : width * 0.68) - pw / 2, top: height * (portrait ? 0.42 : 0.12), transform: `perspective(${1600 * u}px) rotateY(${portrait ? 0 : -12}deg)` }}>
        <Phone src="m-zakat" width={pw} />
      </div>
      <div style={{ position: 'absolute', left: portrait ? width * 0.08 : width * 0.07, top: portrait ? height * 0.08 : height * 0.26, width: portrait ? width * 0.84 : width * 0.44, display: 'grid', gap: 18 * u }}>
        <KineticWords text="Kalkulator zakat" start={0} stagger={4} wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 76 : 84) * u, color: C.ivoryWarm, lineHeight: 1.05 }} />
        {rows.map(([k, v], i) => {
          const p = prog(frame, 4 + i * 4, 22 + i * 4, ease.silk);
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 18 * u, opacity: p, transform: `translateX(${(1 - p) * -30 * u}px)`, borderBottom: `1px solid ${rgba(C.goldLight, 0.25)}`, paddingBottom: 10 * u }}>
              <span style={{ width: 150 * u, fontFamily: F.ui, fontWeight: 600, fontSize: 28 * u, color: rgba(C.ivoryWarm, 0.75) }}>{k}</span>
              <span style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 38 * u, color: C.goldPale }}>{v}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** Batas panel (frame lokal) — 3 ketukan, lalu 2½ dan 2½ ketukan (selaras musik, tiap panel ≥ 1,5 dtk). */
export const S9_CUTS = [0, 108, 198, 288];

export function S9Panels() {
  const frame = useCurrentFrame();
  const { u, height, landscape, safeBottom } = useLayout();
  const items = ['Kalender Hijriah', 'Doa & Dzikir', 'Hadits', 'Zakat'];
  const [, c1, c2, end] = S9_CUTS;
  const panel = frame < c1 ? 0 : frame < c2 ? 1 : 2;
  const activeItems = [[0], [1, 2], [3]][panel];
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <Sequence durationInFrames={end}>
        <PanelKalender />
      </Sequence>
      <Sequence from={c1} durationInFrames={end - c1}>
        <StarIris progress={prog(frame - c1, 0, 22, ease.glide)} x={0.5} y={0.5}>
          <PanelDoaHadits />
        </StarIris>
      </Sequence>
      <Sequence from={c2} durationInFrames={end - c2}>
        <StarIris progress={prog(frame - c2, 0, 22, ease.glide)} x={0.5} y={0.5} rotate={22.5}>
          <PanelZakat />
        </StarIris>
      </Sequence>
      <GoldDust count={50} seed="s9" rise={0.2} />
      <div style={{ position: 'absolute', left: 0, right: 0, ...(landscape ? { top: height * 0.88 } : { bottom: safeBottom + 10 * u }), display: 'flex', justifyContent: 'center', gap: `${10 * u}px ${24 * u}px`, flexWrap: 'wrap', opacity: prog(frame, 0, 20) }}>
        {items.map((it, i) => (
          <span key={it} style={{ display: 'inline-flex', alignItems: 'center', gap: 24 * u }}>
            {i > 0 && <span style={{ width: 8 * u, height: 8 * u, background: C.goldLight, transform: 'rotate(45deg)' }} />}
            <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 32 * u, color: activeItems.includes(i) ? C.goldPale : rgba(C.ivoryWarm, 0.55) }}>{it}</span>
          </span>
        ))}
      </div>
      <FilmFinish />
    </AbsoluteFill>
  );
}

