// Adegan khusus reel 9:16 (90 dtk): pendalaman tiap fitur + penutup dengan QR code.
// Semua teks fitur diverifikasi dengan tabel "Fitur" di README aplikasi. Tangkapan layar asli
// (public/screens/mt-*.png = halaman panjang yang digulir di dalam ponsel).
import {
  BellRing,
  Bookmark,
  BookOpen,
  Calculator,
  CalendarDays,
  CalendarPlus,
  Clock,
  Coins,
  Download,
  Hash,
  HandHeart,
  Headphones,
  Languages,
  Library,
  MapPin,
  Moon,
  ScanLine,
  ScrollText,
  Search,
  Share2,
  ShieldCheck,
  SunMoon,
  Sunrise,
  Wallet,
} from 'lucide-react';
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from 'remotion';
import { FilmFinish, GoldDust, LightRays, NightBackground } from '../components/Atmosphere.jsx';
import { Mark, Wordmark } from '../components/Brand.jsx';
import { Lattice, MedallionFrame, Rosette } from '../components/Ornaments.jsx';
import { Eyebrow, FadeText, KineticWords, Phone } from '../components/UI.jsx';
import content from '../data/content.json';
import qr from '../data/qr.json';
import { useLayout } from '../lib/layout.js';
import { ease, lock, prog, tw } from '../lib/motion.js';
import { C, F, rgba } from '../lib/theme.js';

/** Tinggi (px CSS, lebar 390) tiap tangkapan layar panjang. */
const TALL = {
  'mt-home': 2300,
  'mt-home-dark': 2300,
  'mt-surah': 2600,
  'mt-sholat': 2000,
  'mt-imsakiyah': 2400,
  'mt-doa': 2400,
  'mt-doa-detail': 1900,
  'mt-hadits': 2300,
  'mt-arbain': 2300,
  'mt-kalender': 2300,
  'mt-zakat': 2600,
  'mt-pengaturan': 2300,
  'mt-pengaturan-dark': 2300,
  'm-tafsir': 844,
};

/* ------------------------------------------------------------ potongan UI */

/** Gambar halaman panjang yang digulir di dalam layar ponsel. scroll dalam px CSS. */
function ScrollShot({ src, scroll, screenW, style }) {
  const k = screenW / 390;
  return <Img src={staticFile(`screens/${src}.png`)} style={{ position: 'absolute', left: 0, top: -scroll * k, width: screenW, height: TALL[src] * k, ...style }} />;
}

/** Kartu yang "terangkat" dari layar: potongan persegi tangkapan layar asli, skala seragam. */
function PopCard({ src, rect, scale, u }) {
  return (
    <div
      style={{
        position: 'relative',
        width: rect.w * scale,
        height: rect.h * scale,
        overflow: 'hidden',
        borderRadius: 24 * u,
        background: C.ivory,
        boxShadow: `0 ${40 * u}px ${80 * u}px -${20 * u}px rgba(0,0,0,.75), 0 0 0 ${2 * u}px ${rgba(C.goldLight, 0.75)}`,
      }}
    >
      <Img src={staticFile(`screens/${src}.png`)} style={{ position: 'absolute', left: -rect.x * scale, top: -rect.y * scale, width: 390 * scale, height: TALL[src] * scale }} />
    </div>
  );
}

/** Chip fitur: ikon Lucide + teks; masuk dari sisi, bertahan sampai adegan selesai. */
function Chip({ icon: Icon, text, side, y, start, end, u }) {
  const frame = useCurrentFrame();
  const p = prog(frame, start, start + 24, ease.land);
  const out = prog(frame, end - 16, end, ease.glide);
  const dir = side === 'left' ? -1 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        [side]: 48 * u,
        maxWidth: 640 * u,
        display: 'flex',
        alignItems: 'center',
        gap: 18 * u,
        padding: `${16 * u}px ${28 * u}px ${16 * u}px ${16 * u}px`,
        borderRadius: 999,
        background: rgba('#04100c', 0.9),
        border: `${1.5 * u}px solid ${rgba(C.goldLight, 0.55)}`,
        boxShadow: `0 ${20 * u}px ${40 * u}px -${12 * u}px rgba(0,0,0,.7)`,
        opacity: Math.min(1, p * 1.3) * (1 - out),
        transform: `translateX(${(1 - p) * dir * 80 * u}px) translateY(${-out * 30 * u}px)`,
      }}
    >
      <div style={{ flex: 'none', width: 62 * u, height: 62 * u, borderRadius: 999, display: 'grid', placeItems: 'center', background: `linear-gradient(145deg, ${C.goldPale}, ${C.gold})` }}>
        <Icon size={32 * u} strokeWidth={2.1} color={C.ink} aria-hidden="true" />
      </div>
      <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 32 * u, lineHeight: 1.25, color: C.ivoryWarm }}>{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------ template pendalaman fitur */

/**
 * Satu fitur, satu adegan 288 frame (2 bar):
 * judul kinetik di atas safe area, ponsel naik dari bawah & halaman bergulir, 3 chip
 * bergantian kiri–kanan tiap ketukan, satu kartu pop-out, lalu "swipe up" ke adegan berikut.
 */
function DeepDive({ eyebrow, title, tint, screen, scroll = [0, 900], chips, pop, tilt = 1, phoneChildren = null, phoneSrc = null, len = 288 }) {
  const frame = useCurrentFrame();
  const { width, height, u, safeTop } = useLayout();
  const enter = prog(frame, 0, 30, ease.silk);
  const exit = prog(frame, len - 18, len, ease.glide);
  const phoneW = 470 * u;
  const screenW = phoneW * 0.93;
  const phoneTop = 600 * u;
  // Gulir pelan & rata (≤ ~1 px/frame): nyaman dibaca dan baris teks yang lewat tidak
  // menimbulkan pergantian terang–gelap cepat (WCAG 2.3.1).
  const scrollY = tw(frame, [24, len - 6], scroll, Easing.inOut(Easing.sin));
  const bob = Math.sin(frame * 0.05) * 6 * u;
  const ry = tilt * (10 - 6 * prog(frame, 0, len, ease.glide)) + (1 - enter) * tilt * 18;
  const chipYs = [690, 870, 1050].map((y) => y * u);
  const sides = tilt > 0 ? ['left', 'right', 'left'] : ['right', 'left', 'right'];
  const popP = pop ? lock(frame, pop.at ?? 144, 60, { damping: 14, stiffness: 110 }) : 0;
  const popOut = prog(frame, len - 16, len, ease.glide);
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <NightBackground glow={0.95} tint={tint} glowX={50} glowY={55} />
      <Lattice progress={1} tile={150 * u} strokeWidth={1 * u} opacity={0.09} scale={1 + frame * 0.0004} />
      <div style={{ position: 'absolute', left: width / 2 - 520 * u, top: phoneTop + 490 * u - 520 * u, opacity: 0.4 * (1 - exit), transform: `rotate(${frame * 0.1 * tilt}deg)` }}>
        <MedallionFrame size={1040 * u} draw={prog(frame, 0, 50, ease.glide)} strokeWidth={1.6 * u} stroke={C.goldLight} />
      </div>
      <LightRays x={50} y={30} spread={50} intensity={0.25} />
      <GoldDust count={60} seed={`rd-${eyebrow}`} rise={0.18} />

      {/* ponsel */}
      <AbsoluteFill style={{ perspective: `${1800 * u}px` }}>
        <div
          style={{
            position: 'absolute',
            left: width / 2 - phoneW / 2,
            top: phoneTop + bob,
            // masuk & keluar: geser pendek + memudar (bukan meluncur jauh) agar layar terang tidak menyapu cepat
            opacity: Math.min(1, enter * 1.4) * (1 - exit),
            transform: `translateY(${(1 - enter) * 260 * u - exit * 160 * u}px) scale(${1 - exit * 0.05}) rotateY(${ry}deg) rotateX(${4 - exit * 6}deg)`,
          }}
        >
          <Phone src={phoneSrc} width={phoneW} shine={tw(frame, [10, len], [0, 1], ease.glide)}>
            {screen && <ScrollShot src={screen} scroll={scrollY} screenW={screenW} />}
            {phoneChildren && phoneChildren({ frame, screenW, scrollY })}
          </Phone>
        </div>
      </AbsoluteFill>

      {/* kartu pop-out (potongan UI asli, diperbesar seragam) */}
      {pop && popP > 0.001 && (
        <div
          style={{
            position: 'absolute',
            top: pop.y * u,
            [pop.side]: 56 * u,
            opacity: Math.min(1, popP * 1.5) * (1 - popOut),
            transform: `translateY(${(1 - popP) * 40 * u - popOut * 30 * u}px) scale(${0.94 + 0.06 * popP})`,
            transformOrigin: pop.side === 'left' ? '0% 50%' : '100% 50%',
          }}
        >
          <PopCard src={pop.src} rect={pop.rect} scale={pop.scale ?? 1.5} u={u} />
        </div>
      )}

      {chips.map((c, i) => (
        <Chip key={c.text} icon={c.icon} text={c.text} side={sides[i]} y={chipYs[i]} start={36 + i * 36} end={len} u={u} />
      ))}

      {/* judul (di dalam safe area atas) */}
      <div style={{ position: 'absolute', left: 80 * u, right: 80 * u, top: safeTop + 4 * u, display: 'grid', gap: 14 * u, opacity: 1 - prog(frame, len - 20, len - 4, ease.glide), transform: `translateY(${-exit * 40 * u}px)` }}>
        <Eyebrow start={2} size={24 * u}>
          {eyebrow}
        </Eyebrow>
        <KineticWords text={title} start={6} stagger={4} wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: 80 * u, lineHeight: 1.06, color: C.ivoryWarm, letterSpacing: '-0.01em', textShadow: `0 ${4 * u}px ${24 * u}px rgba(0,0,0,.5)` }} />
      </div>
      <FilmFinish vignette={0.6} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------ adegan fitur */

export function RHome() {
  return (
    <DeepDive
      eyebrow="Beranda"
      title="Mulai hari dengan tenang."
      tint={C.hero}
      screen="mt-home"
      scroll={[80, 260]}
      tilt={1}
      chips={[
        { icon: Sunrise, text: 'Sapaan & tanggal Masehi–Hijriah' },
        { icon: Clock, text: 'Waktu sholat berikutnya + hitung mundur' },
        { icon: BookOpen, text: 'Lanjutkan membaca & ayat hari ini' },
      ]}
      pop={{ src: 'mt-home', rect: { x: 14, y: 520, w: 362, h: 222 }, scale: 1.45, y: 1190, side: 'right', at: 144 }}
    />
  );
}

export function RQuran() {
  return (
    <DeepDive
      eyebrow="Al-Qur'an"
      title="Baca, dengar, dan pahami."
      tint={C.emerald}
      screen="mt-surah"
      scroll={[60, 240]}
      tilt={-1}
      chips={[
        { icon: Headphones, text: 'Murattal 6 qari, per ayat atau satu surah' },
        { icon: ScrollText, text: 'Terjemahan Kemenag & tafsir per ayat' },
        { icon: Search, text: 'Cari surah, ayat, atau dengan suara' },
      ]}
      pop={{ src: 'm-tafsir', rect: { x: 14, y: 338, w: 362, h: 250 }, scale: 1.4, y: 1170, side: 'left', at: 144 }}
    />
  );
}

export function RSholat() {
  return (
    <DeepDive
      eyebrow="Jadwal sholat"
      title="Tak terlewat waktu sholat."
      tint="#123f4a"
      screen="mt-sholat"
      scroll={[200, 380]}
      tilt={1}
      chips={[
        { icon: MapPin, text: '517 kota · WIB, WITA, WIT' },
        { icon: CalendarDays, text: 'Imsakiyah bulanan + tanggal Hijriah' },
        { icon: BellRing, text: 'Pengingat adzan (opsional)' },
      ]}
      pop={{ src: 'mt-imsakiyah', rect: { x: 8, y: 370, w: 374, h: 200 }, scale: 1.45, y: 1190, side: 'right', at: 144 }}
    />
  );
}

export function RDoa() {
  return (
    <DeepDive
      eyebrow="Doa & dzikir"
      title="Doa harian, lengkap dengan sumbernya."
      tint="#14463a"
      screen="mt-doa-detail"
      scroll={[40, 220]}
      tilt={-1}
      chips={[
        { icon: HandHeart, text: '335 doa dari dua koleksi' },
        { icon: Languages, text: 'Arab, latin, arti, dan dalil' },
        { icon: Bookmark, text: 'Simpan, salin, bagikan' },
      ]}
      pop={{ src: 'mt-doa-detail', rect: { x: 14, y: 1170, w: 362, h: 150 }, scale: 1.5, y: 1230, side: 'left', at: 144 }}
    />
  );
}

export function RHadits() {
  return (
    <DeepDive
      eyebrow="Hadits"
      title="9 kitab hadits & Arbain."
      tint="#2a3f22"
      screen="mt-hadits"
      scroll={[200, 380]}
      tilt={1}
      chips={[
        { icon: Library, text: 'Bukhari, Muslim, Abu Dawud, dan 6 kitab lain' },
        { icon: Hash, text: 'Lompat langsung ke nomor hadits' },
        { icon: Share2, text: 'Simpan, salin, bagikan' },
      ]}
      pop={{ src: 'mt-hadits', rect: { x: 14, y: 388, w: 362, h: 160 }, scale: 1.5, y: 1220, side: 'right', at: 144 }}
    />
  );
}

export function RKalender() {
  return (
    <DeepDive
      eyebrow="Kalender"
      title="Masehi & Hijriah berdampingan."
      tint="#173b33"
      screen="mt-kalender"
      scroll={[150, 330]}
      tilt={-1}
      chips={[
        { icon: Moon, text: 'Hari besar Islam (perkiraan)' },
        { icon: CalendarPlus, text: 'Catat acara pribadimu' },
        { icon: CalendarDays, text: 'Tanggal Hijriah bisa disesuaikan' },
      ]}
      pop={{ src: 'mt-kalender', rect: { x: 14, y: 790, w: 362, h: 100 }, scale: 1.55, y: 1240, side: 'left', at: 144 }}
    />
  );
}

export function RZakat() {
  return (
    <DeepDive
      eyebrow="Zakat"
      title="Hitung zakat dengan jelas."
      tint="#3a3a1c"
      screen="mt-zakat"
      scroll={[120, 300]}
      tilt={1}
      chips={[
        { icon: Wallet, text: 'Penghasilan, maal, dan fitrah' },
        { icon: Coins, text: 'Harga emas referensi atau isi sendiri' },
        { icon: Calculator, text: 'Rumus & asumsi ditampilkan' },
      ]}
      pop={{ src: 'mt-zakat', rect: { x: 14, y: 352, w: 362, h: 216 }, scale: 1.45, y: 1180, side: 'right', at: 144 }}
    />
  );
}

/** Nyaman & privat: ponsel berganti tema terang ↔ gelap dengan sapuan melingkar dari tombol tema. */
export function RNyaman() {
  const wipe = (frame) => prog(frame, 96, 132, ease.glide) * (1 - prog(frame, 214, 250, ease.glide));
  return (
    <DeepDive
      eyebrow="Nyaman & privat"
      title="Nyaman di mata, aman untuk datamu."
      tint={C.hero}
      screen="mt-home"
      scroll={[0, 160]}
      tilt={-1}
      chips={[
        { icon: SunMoon, text: 'Tema terang & gelap' },
        { icon: Download, text: 'Bisa dipasang di layar utama' },
        { icon: ShieldCheck, text: 'Tanpa akun, iklan, atau pelacak' },
      ]}
      phoneChildren={({ frame, screenW, scrollY }) => {
        const w = wipe(frame);
        if (w <= 0) return null;
        // lingkaran tumbuh dari ikon tema (kanan atas) — gerak, bukan kedipan
        const r = w * screenW * 2.4;
        return (
          <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${r}px at ${screenW * 0.82}px ${screenW * 0.07}px)` }}>
            <ScrollShot src="mt-home-dark" scroll={scrollY} screenW={screenW} />
          </div>
        );
      }}
    />
  );
}

/* ------------------------------------------------------------ penutup + QR */

function QrCode({ size, u }) {
  const n = qr.size;
  const quiet = 4;
  const cell = size / (n + quiet * 2);
  const d = [];
  qr.rows.forEach((row, y) => {
    for (let x = 0; x < n; x++) if (row[x] === '1') d.push(`M${(x + quiet) * cell} ${(y + quiet) * cell}h${cell}v${cell}h${-cell}z`);
  });
  const logo = size * 0.2;
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: 28 * u, background: '#FFFDF7', boxShadow: `0 ${40 * u}px ${90 * u}px -${20 * u}px rgba(0,0,0,.8), 0 0 0 ${3 * u}px ${rgba(C.goldLight, 0.8)}` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label={`Kode QR ke ${qr.url}`}>
        <path d={d.join('')} fill={C.ink} />
      </svg>
      <div style={{ position: 'absolute', left: (size - logo) / 2, top: (size - logo) / 2, width: logo, height: logo, borderRadius: logo * 0.24, background: '#FFFDF7', display: 'grid', placeItems: 'center', boxShadow: `0 0 0 ${cell * 0.4}px #FFFDF7` }}>
        <Img src={staticFile('brand/imuslim-mark.svg')} style={{ width: logo * 0.78, height: logo * 0.78 }} />
      </div>
    </div>
  );
}

/**
 * Penutup reel: lockup logo (seperti adegan 11), lalu naik & mengecil, kartu QR muncul di
 * tengah dan DIAM (tidak bergerak/berkilau) agar mudah dipindai, ditemani URL.
 */
export function S11QR({ len = 792 }) {
  const frame = useCurrentFrame();
  const { width, height, u, safeTop } = useLayout();
  const hit = 1 - prog(frame, 0, 60, ease.silk);
  const move = prog(frame, 150, 200, ease.glide);
  // QR cukup memudar masuk & diam — mudah dipindai, tanpa pola kontras tinggi yang bergerak
  const qrIn = prog(frame, 172, 196, ease.silk);
  const fadeOut = prog(frame, len - 24, len, ease.glide);
  const markSize = 300 * u - move * 150 * u;
  const lockTop = tw(frame, [150, 200], [height * 0.3, safeTop + 6 * u], ease.glide);
  const qrSize = 520 * u;
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <AbsoluteFill style={{ opacity: 1 - fadeOut }}>
        <NightBackground glow={0.9} tint={C.hero} glowY={42} />
        <Rosette cx={width / 2} cy={height * 0.5} R={width * 0.62} draw={1} rotate={frame * 0.05} strokeWidth={1.4 * u} opacity={0.14} glow={0} dotted={false} />
        <Lattice progress={1} tile={150 * u} strokeWidth={1 * u} opacity={0.08} />
        <LightRays x={50} y={36} spread={70} intensity={0.3 + 0.5 * hit} />
        <GoldDust count={80} seed="s11q" rise={0.18} burst={hit * 0.5} burstY={0.36} />

        <FilmFinish vignette={0.55} grain={0.04} />

        {/* lockup logo */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: lockTop, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: (22 - move * 10) * u }}>
          <Mark size={markSize} depth={6} glint={tw(frame, [24, 70], [-0.2, 1.3], ease.glide)} glow={8 * u} id="s11qmark" />
          <Wordmark height={(118 - move * 46) * u} reveal={1} glint={tw(frame, [30, 80], [-0.1, 1.2], ease.glide)} depth={4} id="s11qwm" />
          <div style={{ opacity: 1 - move }}>
            <KineticWords text="Teman ibadah harian." start={40} stagger={5} align="center" wordStyle={{ fontFamily: F.display, fontWeight: 600, fontSize: 62 * u, color: C.goldPale }} />
          </div>
        </div>

        {/* QR + ajakan */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: height * 0.345,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 30 * u,
            opacity: qrIn,
          }}
        >
          <QrCode size={qrSize} u={u} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 * u, fontFamily: F.ui, fontWeight: 700, fontSize: 34 * u, color: C.goldPale, letterSpacing: '0.02em' }}>
            <ScanLine size={38 * u} strokeWidth={2.2} color={C.goldLight} aria-hidden="true" />
            Pindai untuk membuka iMuslim
          </div>
          <div style={{ padding: `${16 * u}px ${36 * u}px`, borderRadius: 999, border: `${2 * u}px solid ${rgba(C.goldLight, 0.7)}`, background: rgba('#03100b', 0.6), fontFamily: F.ui, fontWeight: 800, fontSize: 42 * u, color: C.ivoryWarm, letterSpacing: '0.01em' }}>
            {content.url}
          </div>
          <FadeText start={230} style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 28 * u, color: rgba(C.ivoryWarm, 0.8), textAlign: 'center' }}>
            Gratis · tanpa akun · tanpa iklan · langsung di browser
          </FadeText>
          <FadeText start={260} style={{ marginTop: -12 * u, fontFamily: F.ui, fontWeight: 500, fontSize: 21 * u, color: rgba(C.ivoryWarm, 0.55), textAlign: 'center' }}>
            Sumber data: equran.id · api.myquran.com · hadis-api-id · OpenStreetMap
          </FadeText>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
