// Menghasilkan seluruh aset brand iMuslim dari geometri di brand-geometry.mjs:
// - public/brand/*.svg   (mark, wordmark, logo horizontal, versi terang/gelap)
// - public/favicon.svg, public/icons/*.png (PWA, apple-touch, maskable)
// - public/og-image.png  (gambar pratinjau tautan 1200x630)
// - src/components/brand/wordmark-paths.js (path wordmark untuk komponen React)
// Jalankan: npm run brand
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { COLORS, MARK_PATHS, crescentPath, markSvg } from './brand-geometry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => resolve(root, 'public', p);

async function ensureDir(file) {
  await mkdir(dirname(file), { recursive: true });
}
async function write(file, content) {
  await ensureDir(file);
  await writeFile(file, content);
  console.log('  ✓', file.replace(root, '').replaceAll('\\', '/'));
}

// ---------- Wordmark ----------
const fontFile = resolve(root, 'node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff');
const fontBuffer = await readFile(fontFile);
const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

const FONT_SIZE = 100;
const BASELINE = 100;
// "ı" (i tanpa titik) + "Muslim"; titik huruf i diganti bulan sabit emas.
const dotless = font.charToGlyph('ı');
if (!dotless || dotless.name === '.notdef') throw new Error('Font tidak memiliki glyph ı (U+0131)');
const iPath = dotless.getPath(0, BASELINE, FONT_SIZE);
const iAdvance = (dotless.advanceWidth / font.unitsPerEm) * FONT_SIZE;
const iBox = iPath.getBoundingBox();
const tracking = 1.5;
const restX = iAdvance + tracking;
const restPath = font.getPath('Muslim', restX, BASELINE, FONT_SIZE, { kerning: true, letterSpacing: 0.012 });
const restBox = restPath.getBoundingBox();

// Bulan sabit di atas batang ı, ukurannya menyesuaikan lebar batang.
const stemCenter = (iBox.x1 + iBox.x2) / 2 + 1.8; // massa sabit condong ke kiri, geser sedikit
const crescentR = 10.6;
const crescentCy = iBox.y1 - crescentR - 5.2;
const crescentD = crescentPath({ cx: stemCenter, cy: crescentCy, r: crescentR, cutDx: 0.52, cutDy: -0.3, cutR: 0.8 });

const minX = Math.min(iBox.x1, stemCenter - crescentR) - 2;
const minY = crescentCy - crescentR - 2;
const maxX = restBox.x2 + 2;
const maxY = Math.max(iBox.y2, restBox.y2) + 2;
const vbW = maxX - minX;
const vbH = maxY - minY;
const fmt = (n) => Number(n.toFixed(2));
const letters = iPath.toPathData(2) + restPath.toPathData(2);
const viewBox = `${fmt(minX)} ${fmt(minY)} ${fmt(vbW)} ${fmt(vbH)}`;

const wordmarkSvg = (ink, accent) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${fmt(vbW)}" height="${fmt(vbH)}" role="img" aria-label="iMuslim"><title>iMuslim</title><path d="${letters}" fill="${ink}"/><path d="${crescentD}" fill="${accent}"/></svg>`;

// Logo horizontal: mark (64) + jarak + wordmark diskalakan setinggi ~mark.
function horizontalLogo({ stroke, accent, ink, background }) {
  const markSize = 64;
  const scale = 40 / vbH; // tinggi wordmark ≈ 40 unit
  const gap = 14;
  const wmW = vbW * scale;
  const width = markSize + gap + wmW;
  const y = (markSize - vbH * scale) / 2;
  const bg = background ? `<rect width="64" height="64" rx="15" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} 64" width="${fmt(width * 2)}" height="128" role="img" aria-label="iMuslim"><title>iMuslim</title>${bg}<path d="${MARK_PATHS.arch}" fill="none" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${crescentPath()}" fill="${accent}"/><path d="${MARK_PATHS.stem}" stroke="${stroke}" stroke-width="3.8" stroke-linecap="round"/><path d="${MARK_PATHS.book}" fill="none" stroke="${accent}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(${fmt(markSize + gap)} ${fmt(y)}) scale(${fmt(scale * 1000) / 1000}) translate(${fmt(-minX)} ${fmt(-minY)})"><path d="${letters}" fill="${ink}"/><path d="${crescentD}" fill="${accent}"/></g></svg>`;
}

console.log('Brand iMuslim:');
const appIcon = markSvg({ stroke: COLORS.ivory, accent: COLORS.gold, background: COLORS.forest, size: 512 });
await write(pub('brand/imuslim-mark.svg'), markSvg({ stroke: COLORS.forest, accent: COLORS.goldDeep, size: 64 }));
await write(pub('brand/imuslim-mark-on-dark.svg'), markSvg({ stroke: COLORS.ivory, accent: COLORS.gold, size: 64 }));
await write(pub('brand/imuslim-app-icon.svg'), appIcon);
await write(pub('brand/imuslim-wordmark.svg'), wordmarkSvg(COLORS.ink, COLORS.goldDeep));
await write(pub('brand/imuslim-wordmark-on-dark.svg'), wordmarkSvg(COLORS.ivory, COLORS.gold));
await write(pub('brand/imuslim-logo.svg'), horizontalLogo({ stroke: COLORS.forest, accent: COLORS.goldDeep, ink: COLORS.ink }));
await write(pub('brand/imuslim-logo-on-dark.svg'), horizontalLogo({ stroke: COLORS.ivory, accent: COLORS.gold, ink: COLORS.ivory }));
await write(pub('favicon.svg'), markSvg({ stroke: COLORS.ivory, accent: COLORS.gold, background: COLORS.forest, size: 64 }));

// ---------- PNG ----------
const png = async (svg, size, file, opts = {}) => {
  await ensureDir(file);
  let img = sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
  if (opts.flatten) img = img.flatten({ background: opts.flatten });
  await img.png({ compressionLevel: 9 }).toFile(file);
  console.log('  ✓', file.replace(root, '').replaceAll('\\', '/'));
};
await png(appIcon, 192, pub('icons/icon-192.png'));
await png(appIcon, 512, pub('icons/icon-512.png'));
await png(appIcon, 48, pub('icons/favicon-48.png'));
await png(appIcon, 32, pub('icons/favicon-32.png'));
// Apple touch & maskable: latar penuh (tanpa sudut membulat) dengan zona aman 80%.
const fullBleed = (pad) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512"><rect width="64" height="64" fill="${COLORS.forest}"/><g transform="translate(${pad} ${pad}) scale(${(64 - pad * 2) / 64})"><path d="${MARK_PATHS.arch}" fill="none" stroke="${COLORS.ivory}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${crescentPath()}" fill="${COLORS.gold}"/><path d="${MARK_PATHS.stem}" stroke="${COLORS.ivory}" stroke-width="3.8" stroke-linecap="round"/><path d="${MARK_PATHS.book}" fill="none" stroke="${COLORS.gold}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
await png(fullBleed(4), 180, pub('icons/apple-touch-icon.png'));
await png(fullBleed(9), 512, pub('icons/maskable-512.png'));

// ---------- Open Graph ----------
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#F7F3EA"/>
<rect x="0" y="0" width="14" height="630" fill="${COLORS.forest}"/>
<g transform="translate(120 175) scale(4.2)">${markSvg({ stroke: COLORS.ivory, accent: COLORS.gold, background: COLORS.forest }).replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/<title>.*?<\/title>/, '')}</g>
<g transform="translate(450 205) scale(${fmt(120 / vbH)}) translate(${fmt(-minX)} ${fmt(-minY)})"><path d="${letters}" fill="${COLORS.ink}"/><path d="${crescentD}" fill="${COLORS.goldDeep}"/></g>
<rect x="452" y="372" width="96" height="4" rx="2" fill="${COLORS.goldDeep}"/>
<g fill="#3E4C46" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="34">
<text x="452" y="428">Al-Qur'an · Jadwal Sholat · Doa · Hadits</text>
<text x="452" y="474">Kalender Hijriah · Kiblat · Kalkulator Zakat</text>
</g>
</svg>`;
await ensureDir(pub('og-image.png'));
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(pub('og-image.png'));
console.log('  ✓ /public/og-image.png');

// ---------- Modul JS untuk komponen React ----------
const js = `// Dihasilkan oleh scripts/generate-brand.mjs — jangan diedit manual.
export const WORDMARK_VIEWBOX = '${viewBox}';
export const WORDMARK_LETTERS = '${letters}';
export const WORDMARK_CRESCENT = '${crescentD}';
export const MARK_ARCH = '${MARK_PATHS.arch}';
export const MARK_STEM = '${MARK_PATHS.stem}';
export const MARK_BOOK = '${MARK_PATHS.book}';
export const MARK_CRESCENT = '${crescentPath()}';
`;
await write(resolve(root, 'src/components/brand/wordmark-paths.js'), js);
console.log('Selesai.');
