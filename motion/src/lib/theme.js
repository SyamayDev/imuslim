// Token merek iMuslim (diverifikasi dengan src/styles/tokens.css aplikasi).
export const C = {
  night: '#040907',
  deep: '#07130e',
  forest: '#0A3F30',
  hero: '#0D4E3B',
  emerald: '#0F5A44',
  mint: '#67C8A1',
  ivory: '#F6F2E9',
  ivoryWarm: '#F7F1E3',
  ink: '#16211D',
  gold: '#C3964A',
  goldLight: '#E6C47E',
  goldPale: '#F6E3B4',
  goldDeep: '#8A6116',
  white: '#FFF8E8',
};

export const F = {
  display: '"Fraunces", Georgia, "Times New Roman", serif',
  ui: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif',
  arabic: '"Amiri Quran", "Amiri", serif',
};

/** rgba dari hex. */
export function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Campur dua warna hex (t 0..1). */
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = ch(pa);
  const [r2, g2, b2] = ch(pb);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}
