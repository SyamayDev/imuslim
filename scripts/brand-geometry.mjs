// Geometri logo iMuslim (satu sumber kebenaran untuk skrip brand & komponen React).
// Mark: lengkung mihrab + bulan sabit (titik huruf "i") + batang "i" + buku terbuka.
// viewBox 0 0 64 64.

export const COLORS = {
  forest: '#0E4D3B',
  ivory: '#F4EEDC',
  gold: '#D6A84E',
  goldDeep: '#A87A26',
  ink: '#14211C',
};

export const MARK_PATHS = {
  arch: 'M18.5 44.4V29.5C18.5 20.8 24.6 14.6 32 9.2C39.4 14.6 45.5 20.8 45.5 29.5V44.4',
  stem: 'M32 31.6V43.2',
  book: 'M12.5 47.2C19.2 43.6 25.8 43.8 32 47.8C38.2 43.8 44.8 43.6 51.5 47.2',
};

// Bulan sabit = lingkaran penuh dikurangi lingkaran yang digeser (mask).
export const CRESCENT = { cx: 32, cy: 23.2, r: 4.7, cutDx: 0.52, cutDy: -0.3, cutR: 0.8 };

export function crescentPath({ cx, cy, r, cutDx, cutDy, cutR } = CRESCENT) {
  // Bentuk sabit sebagai path tunggal (tanpa mask) agar ringan & mudah dipakai di mana saja.
  const ox = cx + r * cutDx;
  const oy = cy + r * cutDy;
  const or = r * cutR;
  // Titik potong dua lingkaran.
  const dx = ox - cx;
  const dy = oy - cy;
  const d = Math.hypot(dx, dy);
  const a = (r * r - or * or + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(r * r - a * a, 0));
  const px = cx + (a * dx) / d;
  const py = cy + (a * dy) / d;
  const p1 = [px + (h * dy) / d, py - (h * dx) / d];
  const p2 = [px - (h * dy) / d, py + (h * dx) / d];
  const f = (n) => Number(n.toFixed(3));
  // Busur luar (lingkaran besar, sisi jauh dari potongan) lalu busur dalam (lingkaran potong).
  return `M${f(p1[0])} ${f(p1[1])}A${f(r)} ${f(r)} 0 1 0 ${f(p2[0])} ${f(p2[1])}A${f(or)} ${f(or)} 0 0 1 ${f(p1[0])} ${f(p1[1])}Z`;
}

export function markSvg({ stroke, accent, background, size = 64, title = 'iMuslim' } = {}) {
  const bg = background ? `<rect width="64" height="64" rx="15" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${title}"><title>${title}</title>${bg}<path d="${MARK_PATHS.arch}" fill="none" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${crescentPath()}" fill="${accent}"/><path d="${MARK_PATHS.stem}" stroke="${stroke}" stroke-width="3.8" stroke-linecap="round"/><path d="${MARK_PATHS.book}" fill="none" stroke="${accent}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
