import {
  MARK_ARCH,
  MARK_BOOK,
  MARK_CRESCENT,
  MARK_STEM,
  WORDMARK_CRESCENT,
  WORDMARK_LETTERS,
  WORDMARK_VIEWBOX,
} from './wordmark-paths.js';

/**
 * Mark iMuslim: lengkung mihrab + bulan sabit (titik huruf "i") + buku terbuka.
 * Warna mengikuti tema lewat CSS variables.
 * `tile` = versi ikon aplikasi berlatar hijau.
 */
export function Mark({ tile = false, animated = false, className = '', title }) {
  const stroke = tile ? 'var(--mark-ivory, #F4EEDC)' : 'var(--brand)';
  const accent = tile ? '#D6A84E' : 'var(--gold-line)';
  return (
    <svg
      viewBox="0 0 64 64"
      className={`mark ${animated ? 'mark--animated' : ''} ${className}`.trim()}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {tile && <rect width="64" height="64" rx="15" fill="#0E4D3B" />}
      <path d={MARK_ARCH} fill="none" stroke={stroke} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" pathLength="100" className="mark__arch" />
      <path d={MARK_CRESCENT} fill={accent} className="mark__crescent" />
      <path d={MARK_STEM} stroke={stroke} strokeWidth="3.8" strokeLinecap="round" pathLength="100" className="mark__stem" />
      <path d={MARK_BOOK} fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" pathLength="100" className="mark__book" />
    </svg>
  );
}

/**
 * Path wordmark didefinisikan sekali (BrandSprite di AppShell) lalu dirujuk dengan <use>,
 * sehingga logo yang tampil di sidebar, header, dan footer tidak menggandakan ±6 KB path.
 */
export function BrandSprite() {
  return (
    <svg width="0" height="0" className="brand-sprite" aria-hidden="true" focusable="false">
      <defs>
        <path id="imuslim-wordmark-letters" d={WORDMARK_LETTERS} />
        <path id="imuslim-wordmark-crescent" d={WORDMARK_CRESCENT} />
      </defs>
    </svg>
  );
}

export function Wordmark({ className = '', title = 'iMuslim' }) {
  return (
    <svg viewBox={WORDMARK_VIEWBOX} className={`wordmark ${className}`.trim()} role="img" aria-label={title} focusable="false">
      <use href="#imuslim-wordmark-letters" fill="var(--ink)" />
      <use href="#imuslim-wordmark-crescent" fill="var(--gold-line)" />
    </svg>
  );
}

export function Logo({ className = '' }) {
  return (
    <span className={`logo-lockup ${className}`.trim()}>
      <Mark />
      <Wordmark />
    </span>
  );
}
