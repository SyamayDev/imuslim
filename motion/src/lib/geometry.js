// Geometri Islami: khatam (bintang delapan), roset 16 sudut, lengkung mihrab — sebagai path SVG.
const rd = (n) => Math.round(n * 100) / 100;
const pt = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [rd(cx + r * Math.sin(a)), rd(cy - r * Math.cos(a))];
};
const poly = (points) => `M${points.map((p) => p.join(' ')).join('L')}Z`;

/** Persegi dengan setengah diagonal r, diputar deg. */
export function squarePath(cx, cy, r, deg = 0) {
  return poly([0, 90, 180, 270].map((k) => pt(cx, cy, r, k + deg)));
}

/** Garis luar bintang n sudut (gabungan beberapa persegi): titik luar R, titik dalam rIn. */
export function starOutline(cx, cy, R, points, rIn, rot = 0) {
  const out = [];
  const step = 360 / points;
  for (let i = 0; i < points; i++) {
    out.push(pt(cx, cy, R, rot + i * step));
    out.push(pt(cx, cy, rIn, rot + i * step + step / 2));
  }
  return poly(out);
}

/** Khatam (bintang delapan) — garis luar gabungan dua persegi. */
export const khatam = (cx, cy, R, rot = 0) => starOutline(cx, cy, R, 8, R * (Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8)), rot);

/** Roset 16 sudut — garis luar gabungan empat persegi. */
export const rosette16 = (cx, cy, R, rot = 0) => starOutline(cx, cy, R, 16, R * (Math.cos(Math.PI / 4) / Math.cos((33.75 * Math.PI) / 180)), rot);

/** Lingkaran sebagai poligon halus (untuk morph). */
export function circlePath(cx, cy, r, n = 96) {
  return poly(Array.from({ length: n }, (_, i) => pt(cx, cy, r, (i * 360) / n)));
}

/** Lengkung mihrab tertutup, lebar w, tinggi h, alas di (cx, baseY). */
export function archPath(cx, baseY, w, h) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const top = baseY - h;
  const shoulder = baseY - h * 0.55;
  return [
    `M${rd(x0)} ${rd(baseY)}`,
    `L${rd(x0)} ${rd(shoulder)}`,
    `C${rd(x0)} ${rd(top + h * 0.2)} ${rd(cx - w * 0.27)} ${rd(top + h * 0.06)} ${rd(cx)} ${rd(top)}`,
    `C${rd(cx + w * 0.27)} ${rd(top + h * 0.06)} ${rd(x1)} ${rd(top + h * 0.2)} ${rd(x1)} ${rd(shoulder)}`,
    `L${rd(x1)} ${rd(baseY)}Z`,
  ].join('');
}

/** Satu ubin kisi khatam (berpusat di cx, cy; ukuran s) — garis, bukan isi. */
export function khatamTile(cx, cy, s) {
  const h = s / 2;
  const R = s * 0.35;
  const q = R * Math.SQRT1_2;
  return [
    squarePath(cx, cy, R, 0),
    `M${rd(cx - q)} ${rd(cy - q)}H${rd(cx + q)}V${rd(cy + q)}H${rd(cx - q)}Z`,
    `M${rd(cx + R)} ${rd(cy)}H${rd(cx + h)}M${rd(cx - h)} ${rd(cy)}H${rd(cx - R)}M${rd(cx)} ${rd(cy - h)}V${rd(cy - R)}M${rd(cx)} ${rd(cy + R)}V${rd(cy + h)}`,
    `M${rd(cx + q)} ${rd(cy - q)}L${rd(cx + h)} ${rd(cy - h)}M${rd(cx - q)} ${rd(cy - q)}L${rd(cx - h)} ${rd(cy - h)}M${rd(cx + q)} ${rd(cy + q)}L${rd(cx + h)} ${rd(cy + h)}M${rd(cx - q)} ${rd(cy + q)}L${rd(cx - h)} ${rd(cy + h)}`,
  ].join('');
}

/** Titik-titik clip-path polygon bintang delapan (px) untuk iris. */
export function starClip(cx, cy, R, rot = 0) {
  const rIn = R * (Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8));
  const pts = [];
  for (let i = 0; i < 8; i++) {
    pts.push(pt(cx, cy, R, rot + i * 45));
    pts.push(pt(cx, cy, rIn, rot + i * 45 + 22.5));
  }
  return `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(',')})`;
}
