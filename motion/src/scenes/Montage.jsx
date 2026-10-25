// Adegan 5: montase fitur — A (kartu besar, 3 ketukan), B (carousel, 1 ketukan),
// C (flip-book ¼ ketukan di dalam terowongan kartu, dengan motion blur).
import { CameraMotionBlur } from '@remotion/motion-blur';
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { FilmFinish, GoldDust, NightBackground } from '../components/Atmosphere.jsx';
import { Lattice, MedallionFrame } from '../components/Ornaments.jsx';
import { Eyebrow, FadeText, KineticWords, Laptop, Phone, ScreenCard } from '../components/UI.jsx';
import { useLayout } from '../lib/layout.js';
import { ease, prog, tw } from '../lib/motion.js';
import { C, F, rgba } from '../lib/theme.js';

export const FEATURES_A = [
  { title: "Al-Qur'an", eyebrow: 'Bacaan', sub: 'Baca, dengar, dan renungkan — 114 surah.', phone: 'm-surah', laptop: 'd-surah', tint: '#0D4E3B', sacred: true },
  { title: 'Jadwal Sholat', eyebrow: 'Waktu', sub: 'Hitung mundur ke waktu sholat berikutnya.', phone: 'm-sholat-dark', laptop: 'd-sholat-dark', tint: '#123f4a' },
  { title: 'Doa & Dzikir', eyebrow: 'Doa', sub: '335 doa, lengkap dengan sumbernya.', phone: 'm-doa-detail', laptop: 'd-doa', tint: '#14463a', sacred: true },
  { title: 'Hadits', eyebrow: 'Ilmu', sub: '9 kitab dan Arbain An-Nawawi.', phone: 'm-arbain', laptop: 'd-hadits', tint: '#2a3f22', sacred: true },
];
export const FEATURES_B = [
  { title: 'Kalender Hijriah', phone: 'm-kalender' },
  { title: 'Arah Kiblat', phone: 'm-kiblat' },
  { title: 'Zakat', phone: 'm-zakat' },
  { title: 'Pengaturan', phone: 'm-pengaturan' },
];
// Flip-book & cincin terowongan hanya memakai layar tanpa teks ayat/lafaz Allah: halaman yang
// dibalik cepat, berputar, dan diberi motion blur tidak boleh memuat teks Al-Qur'an.
// Versi 8 halaman untuk reel potret (½ ketukan per halaman).
export const FLIP_SCREENS_8 = ['m-home', 'm-sholat', 'm-kalender', 'm-kiblat', 'm-zakat', 'm-hadits', 'm-pengaturan', 'm-home'];
export const FLIP_SCREENS = ['m-home', 'm-sholat', 'm-imsakiyah', 'm-kalender', 'm-kiblat', 'm-zakat', 'm-hadits', 'm-pengaturan', 'm-tentang', 'm-home', 'm-sholat', 'm-kalender', 'm-kiblat', 'm-zakat', 'm-tentang', 'm-home'];

/* ------------------------------------------------------------ Babak A: satu fitur besar */
function FeatureCard({ f, index, len }) {
  const frame = useCurrentFrame();
  const { width, height, u, portrait, safeTop } = useLayout();
  const enter = prog(frame, 0, 22, ease.land);
  const leave = prog(frame, len - 6, len + 14, ease.dive);
  const vel = Math.max(1 - prog(frame, 0, 16), leave);
  // Judul keluar lebih dulu & cepat agar tidak bertumpuk dengan judul kartu berikutnya.
  const textLeave = prog(frame, len - 12, len + 2, ease.glide);
  const bob = Math.sin((frame + index * 40) * 0.045) * 8 * u;
  const phoneW = (portrait ? 0.5 : 0.33) * Math.min(width, height);
  const px = portrait ? width * 0.5 : width * 0.69;
  const py = portrait ? height * 0.64 : height * 0.53;
  // Rotasi dibatasi < 90° agar layar (yang memuat teks Arab) tidak pernah tampil terbalik/cermin.
  const ry = -16 + (1 - enter) * 86 - leave * 60;
  const tx = (1 - enter) * width * 0.25 - leave * width * 0.35;
  const textX = portrait ? width * 0.08 : width * 0.075;
  const textY = portrait ? safeTop + 6 * u : height * 0.3;
  const medal = Math.min(width, height) * (portrait ? 0.9 : 0.84);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - leave }}>
        <div style={{ position: 'absolute', left: px - medal / 2, top: py - medal / 2, transform: `rotate(${frame * 0.12 + index * 22}deg)`, opacity: 0.55 }}>
          <MedallionFrame size={medal} draw={prog(frame, 0, 40, ease.glide)} strokeWidth={1.6 * u} stroke={C.goldLight} />
        </div>
      </AbsoluteFill>
      {!portrait && (
        <div
          style={{
            position: 'absolute',
            left: width * 0.47,
            top: height * 0.12,
            transform: `perspective(${2000 * u}px) rotateY(-28deg) translateX(${tx * 0.5}px) scale(0.92)`,
            opacity: 0.5 * enter * (1 - leave),
            filter: f.sacred ? undefined : `blur(${2.5 * u}px)`,
          }}
        >
          <Laptop src={f.laptop} width={width * 0.46} />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: px - phoneW / 2,
          top: py - (phoneW * 2.12) / 2 + bob,
          transform: `perspective(${1800 * u}px) translateX(${tx}px) rotateY(${ry}deg) rotateX(4deg) rotateZ(${(1 - enter) * 6}deg)`,
          opacity: Math.min(1, enter * 1.5) * (1 - leave * 0.8),
          // Layar berisi teks ayat/doa tidak pernah di-blur.
          filter: vel > 0.05 && !f.sacred ? `blur(${vel * 10 * u}px)` : undefined,
        }}
      >
        <Phone src={f.phone} width={phoneW} shine={tw(frame, [10, len], [0, 1], ease.glide)} />
      </div>
      <div style={{ position: 'absolute', left: textX, top: textY, width: portrait ? width * 0.84 : width * 0.42, display: 'grid', gap: 18 * u, opacity: 1 - textLeave, transform: `translateY(${-textLeave * 24 * u}px)` }}>
        <Eyebrow start={4} size={22 * u}>
          {f.eyebrow}
        </Eyebrow>
        <KineticWords text={f.title} start={8} stagger={5} wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 104 : 118) * u, lineHeight: 1.02, color: C.ivoryWarm, letterSpacing: '-0.015em' }} />
        <FadeText start={12} style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 34 * u, lineHeight: 1.4, color: rgba(C.ivoryWarm, 0.78), maxWidth: 16 * 34 * u * 1.1 }}>
          {f.sub}
        </FadeText>
      </div>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------ Babak B: carousel per ketukan */
function Carousel({ step, items }) {
  const frame = useCurrentFrame();
  const { width, height, u, portrait } = useLayout();
  const isolate = { isolation: 'isolate' };
  // Posisi kontinu: tiap ketukan maju satu, 60% awal ketukan untuk bergerak, sisanya diam.
  const i = Math.floor(frame / step);
  const local = (frame % step) / step;
  // Ketukan pertama: kartu pertama sudah separuh masuk agar tidak ada frame kosong setelah babak A.
  const p = i === 0 ? tw(local, [0, 0.6], [-0.6, 0], ease.land) : Math.min(items.length - 1, i - 1 + tw(local, [0, 0.6], [0, 1], ease.land));
  const phoneW = (portrait ? 0.4 : 0.3) * Math.min(width, height);
  return (
    <AbsoluteFill style={isolate}>
      {items.map((it, k) => {
        const off = k - p;
        if (off > 1.6 || off < -2.6) return null;
        const x = width / 2 + off * (portrait ? width * 0.42 : width * 0.21) - phoneW / 2;
        const sc = 1 - Math.min(Math.abs(off), 2) * 0.17;
        const op = off > 0 ? 1 - off * 0.7 : 1 - Math.abs(off) * 0.38;
        return (
          <div
            key={it.phone}
            style={{
              position: 'absolute',
              left: x,
              top: height * (portrait ? 0.26 : 0.17),
              transform: `perspective(${1600 * u}px) rotateY(${off * -26}deg) scale(${sc})`,
              opacity: Math.max(0, op),
              zIndex: 10 - Math.round(Math.abs(off) * 2),
              filter: Math.abs(off) > 0.5 ? `blur(${Math.abs(off) * 2.4 * u}px)` : undefined,
            }}
          >
            <Phone src={it.phone} width={phoneW} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/**
 * Potret/persegi: pengganti carousel — 4 ponsel kecil muncul satu per ketukan dalam grid 2×2
 * (tanpa sapuan horizontal layar terang, aman WCAG 2.3.1). Ponsel aktif diberi cincin emas.
 */
function GridReveal({ step, items }) {
  const frame = useCurrentFrame();
  const { width, height, u } = useLayout();
  const pw = width * 0.23;
  const ph = pw * 2.08;
  const gapX = width * 0.08;
  const top = height * 0.15;
  const out = prog(frame, step * items.length - 10, step * items.length, ease.glide);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      {items.map((it, k) => {
        const p = prog(frame, k * step, k * step + 20, ease.land);
        const col = k % 2;
        const row = Math.floor(k / 2);
        const active = frame >= k * step && frame < (k + 1) * step;
        const left = width / 2 + (col ? gapX / 2 : -gapX / 2 - pw);
        return (
          <div
            key={it.phone}
            style={{
              position: 'absolute',
              left,
              top: top + row * (ph + 36 * u) + Math.sin((frame + k * 30) * 0.05) * 5 * u,
              opacity: p,
              transform: `scale(${0.9 + 0.1 * p})`,
              borderRadius: pw * 0.15,
              boxShadow: active ? `0 0 0 ${4 * u}px ${rgba(C.goldLight, 0.9)}, 0 0 ${40 * u}px ${rgba(C.goldLight, 0.45)}` : 'none',
            }}
          >
            <Phone src={it.phone} width={pw} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Baris nama fitur yang bertambah per ketukan dan tetap tampil (≥ 1,5 dtk untuk tiap nama). */
function FeatureLine({ step, items, holdUntil }) {
  const frame = useCurrentFrame();
  const { height, u, portrait, landscape, safeBottom } = useLayout();
  const fade = 1 - prog(frame, holdUntil - 18, holdUntil, ease.glide);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...(landscape ? { top: height * 0.86 } : { bottom: safeBottom + 10 * u }),
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: `${10 * u}px ${26 * u}px`,
        opacity: fade,
        padding: `0 ${60 * u}px`,
      }}
    >
      {items.map((it, k) => {
        const p = prog(frame, k * step, k * step + 14, ease.silk);
        const active = frame >= k * step && frame < (k + 1) * step + (k === items.length - 1 ? 999 : 0);
        return (
          <span key={it.title} style={{ display: 'inline-flex', alignItems: 'center', gap: 26 * u, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
            {k > 0 && <span style={{ width: 8 * u, height: 8 * u, background: C.goldLight, transform: 'rotate(45deg)' }} />}
            <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: (portrait ? 38 : 36) * u, color: active ? C.goldPale : rgba(C.ivoryWarm, 0.8) }}>{it.title}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ Babak C: flip-book & terowongan */
function FlipTunnel({ step, screens, total }) {
  const frame = useCurrentFrame();
  const { width, height, u, portrait, landscape } = useLayout();
  const idx = Math.min(screens.length - 1, Math.floor(frame / step));
  const flip = (frame % step) / step;
  // WCAG 2.3.1: kartu cincin yang lewat di depan latar gelap = pergantian terang–gelap. Putaran
  // dibatasi ≤ ~60°/dtk (≤ 2,4 kartu/dtk) dan kartu diredupkan (Δ luminans < 0,1).
  const spin = frame * 0.55 + tw(frame, [0, total], [0, 30], ease.glide);
  const push = tw(frame, [0, total], [1, 1.35], ease.dive);
  const dip = prog(frame, total - 14, total, ease.glide);
  const phoneW = (portrait ? 0.36 : landscape ? 0.265 : 0.24) * Math.min(width, height);
  // Reel/teaser: ponsel tumbuh lebih sedikit agar tidak menabrak judul & baris fitur (safe area).
  const phonePush = landscape ? push : 1 + (push - 1) * 0.35;
  const ringR = Math.min(width, height) * (portrait ? 0.62 : 0.78);
  const cards = 14;
  const cw = Math.min(width, height) * (portrait ? 0.2 : 0.17);
  return (
    <AbsoluteFill style={{ opacity: 1 - dip }}>
      <AbsoluteFill style={{ perspective: `${1300 * u}px`, transform: `scale(${push})` }}>
        <div style={{ position: 'absolute', left: width / 2, top: height / 2, transformStyle: 'preserve-3d', transform: `translateZ(${-ringR * 1.35}px) rotateX(-10deg) rotateY(${spin}deg)` }}>
          {Array.from({ length: cards }, (_, k) => (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: -cw / 2,
                top: (-cw * 2.16) / 2,
                transform: `rotateY(${(k * 360) / cards}deg) translateZ(${ringR}px)`,
                backfaceVisibility: 'hidden',
                opacity: 0.7,
                filter: 'brightness(0.4) saturate(0.85)',
              }}
            >
              <ScreenCard src={screens[(k * 3) % screens.length]} width={cw} height={cw * 2.16} radius={18 * u} />
            </div>
          ))}
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: width / 2 - phoneW / 2, top: height * (portrait ? 0.5 : landscape ? 0.545 : 0.575) - (phoneW * 2.12) / 2, transform: `scale(${phonePush})` }}>
        {/* Halaman berikutnya di bawah; halaman sekarang terangkat (flip) di paruh akhir ketukan. */}
        <Phone src={screens[Math.min(screens.length - 1, idx + 1)]} width={phoneW}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: '50% 0%',
              transform: `perspective(${900 * u}px) rotateX(${tw(flip, [0.5, 1], [0, 104], ease.dive)}deg)`,
              opacity: 1 - tw(flip, [0.8, 1], [0, 1]),
              backfaceVisibility: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,.35)',
            }}
          >
            <Img src={staticFile(`screens/${screens[idx]}.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
}

/** Adegan montase lengkap. Durasi bawaan: A 4×108 + B 4×36 + C 16×9 = 720 frame (5 bar). */
export function S5Montage({ aLen = 108, bLen = 36, cLen = 9, parts = 'ABC', flipCount = 16 }) {
  const frame = useCurrentFrame();
  const { u, portrait, landscape, safeTop } = useLayout();
  const screens = flipCount >= FLIP_SCREENS.length ? FLIP_SCREENS : FLIP_SCREENS_8.slice(0, flipCount);
  const aDur = parts.includes('A') ? FEATURES_A.length * aLen : 0;
  const bDur = parts.includes('B') ? FEATURES_B.length * bLen : 0;
  const cDur = parts.includes('C') ? screens.length * cLen : 0;
  const featureIdx = Math.min(FEATURES_A.length - 1, Math.floor(frame / aLen));
  const tint = frame < aDur ? FEATURES_A[featureIdx].tint : C.hero;
  return (
    <AbsoluteFill>
      <NightBackground glow={0.85} tint={tint} glowX={portrait ? 50 : 66} glowY={52} />
      <AbsoluteFill style={{ transform: `translateX(${-frame * 0.6 * u}px)` }}>
        <Lattice progress={1} tile={150 * u} strokeWidth={1 * u} opacity={0.12} />
      </AbsoluteFill>
      <GoldDust count={90} seed="s5" rise={0.35} parallaxX={-frame * 0.0004} />
      {parts.includes('A') &&
        FEATURES_A.map((f, i) => (
          <Sequence key={f.title} from={i * aLen} durationInFrames={aLen + 14}>
            <FeatureCard f={f} index={i} len={aLen} />
          </Sequence>
        ))}
      {parts.includes('B') && (
        <Sequence from={aDur} durationInFrames={bDur}>
          {landscape ? <Carousel step={bLen} items={FEATURES_B} /> : <GridReveal step={bLen} items={FEATURES_B} />}
        </Sequence>
      )}
      {parts.includes('C') && (
        <Sequence from={aDur + bDur} durationInFrames={cDur}>
          <CameraMotionBlur samples={6} shutterAngle={200}>
            <FlipTunnel step={cLen} screens={screens} total={cDur} />
          </CameraMotionBlur>
          <AbsoluteFill style={{ alignItems: 'center', paddingTop: landscape ? 74 * u : safeTop + 4 * u }}>
            <KineticWords
              text="Semua dalam satu genggaman."
              start={4}
              stagger={5}
              out={cDur - 20}
              align="center"
              style={{ maxWidth: landscape ? undefined : 860 * u }}
              wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: (portrait ? 84 : landscape ? 78 : 70) * u, color: C.ivoryWarm, textShadow: `0 ${4 * u}px ${30 * u}px rgba(0,0,0,.6)` }}
            />
          </AbsoluteFill>
        </Sequence>
      )}
      {parts.includes('B') && (
        <Sequence from={aDur} durationInFrames={bDur + cDur}>
          <FeatureLine step={bLen} items={FEATURES_B} holdUntil={bDur + cDur} />
        </Sequence>
      )}
      <FilmFinish />
    </AbsoluteFill>
  );
}
