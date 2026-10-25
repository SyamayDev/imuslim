// Ornamen geometri Islami (khatam/bintang delapan, roset, lengkung mihrab).
// Semuanya dekoratif: aria-hidden, warna mengikuti currentColor/token tema.

const round = (n) => Math.round(n * 100) / 100;
const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [round(r * Math.sin(a)), round(-r * Math.cos(a))];
};
/** Persegi yang diputar `deg` dengan setengah diagonal `r` (titik pusat 0,0). */
const squarePath = (r, deg) => {
  const pts = [0, 90, 180, 270].map((k) => polar(r, k + deg));
  return `M${pts.map((p) => p.join(' ')).join('L')}Z`;
};

// Roset 16 sudut: empat persegi saling berpotongan + bintang delapan di tengah.
const ROSETTE_OUTER = [0, 22.5, 45, 67.5].map((d) => squarePath(86, d)).join('');
const ROSETTE_INNER = [0, 45].map((d) => squarePath(52, d)).join('');
const ROSETTE_CORE = [0, 45].map((d) => squarePath(20, d)).join('');
const ROSETTE_TICKS = Array.from({ length: 32 }, (_, i) => {
  const [x1, y1] = polar(90, i * 11.25);
  const [x2, y2] = polar(i % 2 ? 93 : 97, i * 11.25);
  return `M${x1} ${y1}L${x2} ${y2}`;
}).join('');

export function Rosette({ className = '' }) {
  return (
    <svg viewBox="-100 -100 200 200" className={`rosette ${className}`.trim()} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinejoin="round">
        <circle r="99" strokeWidth="0.6" />
        <circle r="88" strokeWidth="0.8" />
        <path d={ROSETTE_TICKS} strokeWidth="0.8" strokeLinecap="round" />
        <path d={ROSETTE_OUTER} strokeWidth="1" />
        <circle r="61" strokeWidth="0.6" strokeDasharray="1.5 4" />
        <path d={ROSETTE_INNER} strokeWidth="1.1" />
        <circle r="34" strokeWidth="0.7" />
        <path d={ROSETTE_CORE} strokeWidth="1" />
      </g>
      <circle r="5" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

// Bintang delapan sudut (khatam) — dipakai hemat sebagai penanda.
export function StarShape({ className = '', filled = false }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 1.5l2.6 3.5 4.3-.5-.5 4.3 3.5 2.6-3.5 2.6.5 4.3-4.3-.5L12 22.5l-2.6-3.5-4.3.5.5-4.3L2.1 12.6 5.6 10l-.5-4.3 4.3.5z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Kilau bintang kecil empat sudut. */
export function Sparkle({ className = '', style }) {
  return (
    <svg viewBox="-10 -10 20 20" className={`sparkle ${className}`.trim()} style={style} aria-hidden="true" focusable="false">
      <path d="M0-10C.8-2.4 2.4-.8 10 0 2.4.8.8 2.4 0 10-.8 2.4-2.4.8-10 0-2.4-.8-.8-2.4 0-10Z" fill="currentColor" />
    </svg>
  );
}

/** Garis lengkung mihrab (ganda) sebagai bingkai dekoratif. */
export function ArchFrame({ className = '' }) {
  return (
    <svg viewBox="0 0 200 280" preserveAspectRatio="none" className={`arch-frame ${className}`.trim()} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor">
        <path d="M6 280V128C6 70 52 30 100 6c48 24 94 64 94 122v152" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <path d="M18 280V132C18 80 58 44 100 22c42 22 82 58 82 110v148" strokeWidth="0.8" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

/** Ikon di dalam bingkai bintang delapan — identitas visual tiap halaman. */
export function Medallion({ icon: Icon, className = '' }) {
  return (
    <span className={`medallion ${className}`.trim()} aria-hidden="true">
      <svg viewBox="-50 -50 100 100" className="medallion__frame" focusable="false">
        <path d={[0, 45].map((d) => squarePath(44, d)).join('')} fill="currentColor" className="medallion__fill" />
        <path d={[0, 45].map((d) => squarePath(44, d)).join('')} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className="medallion__line" />
        <circle r="30" fill="none" stroke="currentColor" strokeWidth="1" className="medallion__ring" />
      </svg>
      <Icon className="medallion__icon" />
    </span>
  );
}

export function StarNumber({ value, label }) {
  return (
    <span className="star-num">
      <StarShape />
      <span aria-hidden={label ? true : undefined}>{value}</span>
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  );
}

export function Ornament({ className = '' }) {
  return (
    <div className={`ornament ${className}`.trim()} aria-hidden="true">
      <StarShape filled />
    </div>
  );
}
