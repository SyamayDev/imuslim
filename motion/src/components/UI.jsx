import { Img, staticFile, useCurrentFrame } from 'remotion';
import { ease, prog, tw } from '../lib/motion.js';
import { C, F, rgba } from '../lib/theme.js';

/**
 * Teks kinetik per kata: tiap kata naik dari balik masker, bergiliran.
 * start: frame mulai; stagger: jeda antarkata; out: frame mulai keluar (opsional).
 */
export function KineticWords({ text, start = 0, stagger = 4, dur = 26, out = null, style, wordStyle, align = 'left' }) {
  // Jarak antarkata (em) harus mengikuti ukuran huruf kata, bukan pembungkus.
  const fontSize = wordStyle?.fontSize;
  const frame = useCurrentFrame();
  const words = text.split(' ');
  const exit = out == null ? 0 : prog(frame, out, out + 18, ease.dive);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', columnGap: '0.26em', fontSize, ...style }}>
      {words.map((w, i) => {
        const p = prog(frame, start + i * stagger, start + i * stagger + dur, ease.silk);
        return (
          <span key={`${w}-${i}`} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.12em', marginBottom: '-0.12em' }}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * 110 + exit * -110}%) rotate(${(1 - p) * 4}deg)`,
                opacity: Math.min(p * 1.4, 1 - exit),
                ...wordStyle,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Label kecil berhuruf kapital (eyebrow) dengan garis emas. */
export function Eyebrow({ children, start = 0, size = 20, color = C.goldLight }) {
  const frame = useCurrentFrame();
  const p = prog(frame, start, start + 30);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.7, opacity: p, transform: `translateX(${(1 - p) * -20}px)` }}>
      <span style={{ width: size * 2.4 * p, height: 2, background: color, borderRadius: 2 }} />
      <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: size, letterSpacing: '0.2em', textTransform: 'uppercase', color }}>{children}</span>
    </div>
  );
}

/** Teks biasa yang muncul lembut (fade + naik). */
export function FadeText({ children, start = 0, dur = 30, out = null, y = 18, style }) {
  const frame = useCurrentFrame();
  const p = prog(frame, start, start + dur);
  const o = out == null ? 0 : prog(frame, out, out + 18, ease.glide);
  return <div style={{ opacity: p * (1 - o), transform: `translateY(${(1 - p) * y}px)`, ...style }}>{children}</div>;
}

const SCREEN_RATIO = 844 / 390;

/** Ponsel dengan tangkapan layar asli. width = lebar badan ponsel (px). */
export function Phone({ src, width, style, shine = 0, children }) {
  const bezel = width * 0.035;
  const screenW = width - bezel * 2;
  const screenH = screenW * SCREEN_RATIO;
  const radius = width * 0.145;
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: screenH + bezel * 2,
        borderRadius: radius,
        background: 'linear-gradient(145deg, #2b332f, #0b0f0d 45%, #1d2420)',
        boxShadow: `0 ${width * 0.12}px ${width * 0.22}px -${width * 0.06}px rgba(0,0,0,.65), 0 0 0 ${Math.max(1, width * 0.004)}px ${rgba(C.goldLight, 0.35)}, inset 0 0 ${width * 0.01}px rgba(255,255,255,.25)`,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', left: bezel, top: bezel, width: screenW, height: screenH, borderRadius: radius - bezel, overflow: 'hidden', background: C.ivory }}>
        {src && <Img src={staticFile(`screens/${src}.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}
        {children}
        <div style={{ position: 'absolute', left: '50%', top: screenW * 0.025, width: screenW * 0.3, height: screenW * 0.085, marginLeft: -screenW * 0.15, borderRadius: 999, background: '#050706' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(115deg, rgba(255,255,255,0) ${20 + shine * 60}%, rgba(255,255,255,.22) ${28 + shine * 60}%, rgba(255,255,255,0) ${40 + shine * 60}%)`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

/** Laptop dengan tangkapan layar desktop (rasio 1440×900). width = lebar layar. */
export function Laptop({ src, width, style }) {
  const bezel = width * 0.022;
  const screenH = (width - bezel * 2) * (900 / 1440);
  return (
    <div style={{ position: 'relative', width, ...style }}>
      <div
        style={{
          position: 'relative',
          width,
          height: screenH + bezel * 2,
          borderRadius: width * 0.025,
          background: 'linear-gradient(160deg, #262d29, #0b0f0d)',
          boxShadow: `0 ${width * 0.06}px ${width * 0.12}px -${width * 0.03}px rgba(0,0,0,.6), 0 0 0 1px ${rgba(C.goldLight, 0.3)}`,
        }}
      >
        <div style={{ position: 'absolute', left: bezel, top: bezel, right: bezel, bottom: bezel, borderRadius: width * 0.008, overflow: 'hidden', background: C.ivory }}>
          {src && <Img src={staticFile(`screens/${src}.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}
        </div>
      </div>
      <div
        style={{
          width: width * 1.16,
          height: width * 0.03,
          marginLeft: -width * 0.08,
          borderRadius: `0 0 ${width * 0.04}px ${width * 0.04}px`,
          background: 'linear-gradient(180deg, #3a423d, #121614)',
          boxShadow: '0 20px 40px -20px rgba(0,0,0,.7)',
        }}
      />
    </div>
  );
}

/** Kartu tangkapan layar tanpa bingkai perangkat (untuk montase cepat). */
export function ScreenCard({ src, width, height, radius = 24, style }) {
  return (
    <div style={{ width, height, borderRadius: radius, overflow: 'hidden', background: C.ivory, boxShadow: `0 30px 60px -25px rgba(0,0,0,.7), 0 0 0 1px ${rgba(C.goldLight, 0.35)}`, ...style }}>
      <Img src={staticFile(`screens/${src}.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
    </div>
  );
}

/** Angka yang menghitung naik (bulat). */
export function useCount(target, start, dur) {
  const frame = useCurrentFrame();
  return Math.round(tw(frame, [start, start + dur], [0, target], ease.silk));
}
