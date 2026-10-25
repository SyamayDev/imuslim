// Sampul (thumbnail) reel Instagram 1080×1920. Konten penting berada di tengah 1080×1440
// (potongan grid profil 3:4: 240 px atas & bawah bisa terpotong).
import { AbsoluteFill } from 'remotion';
import { FilmFinish, GoldDust, LightRays, NightBackground } from '../components/Atmosphere.jsx';
import { Mark, Wordmark } from '../components/Brand.jsx';
import { Lattice, Rosette } from '../components/Ornaments.jsx';
import { Phone } from '../components/UI.jsx';
import content from '../data/content.json';
import { C, F, rgba } from '../lib/theme.js';

const FEATURES = ["Al-Qur'an", 'Jadwal Sholat', 'Kiblat', 'Doa & Dzikir', 'Hadits', 'Kalender', 'Zakat'];

export function ReelCover() {
  const W = 1080;
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <NightBackground glow={1} tint={C.hero} glowX={50} glowY={62} />
      <Rosette cx={W / 2} cy={1290} R={620} draw={1} rotate={8} strokeWidth={1.6} opacity={0.18} glow={0} dotted={false} />
      <Lattice progress={1} tile={150} strokeWidth={1} opacity={0.1} />
      <LightRays x={50} y={64} spread={80} intensity={0.55} />
      <GoldDust count={70} seed="cover" rise={0} />

      {/* identitas */}
      <div style={{ position: 'absolute', top: 268, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <Mark size={128} depth={5} glow={8} id="cover-mark" />
        <Wordmark height={96} reveal={1} depth={3} id="cover-wm" />
      </div>

      {/* judul */}
      <div style={{ position: 'absolute', top: 440, left: 70, right: 70, textAlign: 'center', fontFamily: F.display, fontWeight: 600, fontSize: 84, lineHeight: 1.08, letterSpacing: '-0.015em', color: C.ivoryWarm, textShadow: '0 6px 30px rgba(0,0,0,.55)' }}>
        Teman ibadah harian,
        <br />
        <span style={{ color: C.goldPale }}>dalam satu genggaman.</span>
      </div>

      {/* fitur */}
      <div style={{ position: 'absolute', top: 700, left: 60, right: 60, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px 14px' }}>
        {FEATURES.map((f) => (
          <span key={f} style={{ padding: '10px 22px', borderRadius: 999, border: `1.5px solid ${rgba(C.goldLight, 0.6)}`, background: rgba('#03100b', 0.7), fontFamily: F.ui, fontWeight: 700, fontSize: 30, color: C.ivoryWarm }}>
            {f}
          </span>
        ))}
      </div>

      {/* ponsel berkipas */}
      <AbsoluteFill style={{ perspective: '2000px' }}>
        {[
          ['m-sholat-dark', -1, 300],
          ['m-kiblat-dark', 1, 300],
          ['m-surah', 0, 360],
        ].map(([src, d, w]) => (
          <div
            key={src}
            style={{
              position: 'absolute',
              left: W / 2 - w / 2 + d * 250,
              top: 900 + Math.abs(d) * 70,
              transform: `rotate(${d * 9}deg) rotateY(${-d * 14}deg)`,
              transformOrigin: '50% 100%',
              zIndex: d === 0 ? 2 : 1,
              filter: d === 0 ? undefined : 'brightness(0.82)',
            }}
          >
            <Phone src={src} width={w} shine={0.35} />
          </div>
        ))}
      </AbsoluteFill>

      {/* bawah (di luar potongan 3:4, tetap terlihat saat sampul dibuka penuh) */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1740, display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: '14px 34px', borderRadius: 999, border: `2px solid ${rgba(C.goldLight, 0.75)}`, background: rgba('#03100b', 0.8), fontFamily: F.ui, fontWeight: 800, fontSize: 38, color: C.ivoryWarm }}>{content.url}</div>
      </div>
      <FilmFinish grain={0.03} vignette={0.5} />
    </AbsoluteFill>
  );
}
