// Still deliverable: 6 frame kunci PNG 4K dari film + thumbnail YouTube 1280×720.
//   node scripts/make-stills.mjs   → out/stills/
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(motion, 'out/stills');
await mkdir(out, { recursive: true });

// Frame dipilih saat gerak sudah tenang (bukan di tengah transisi).
const KEY = [
  [190, '01-garis-cahaya'],
  [520, '02-kisi-khatam'],
  [800, '03-lengkung-mihrab'],
  [1110, '04-logo'],
  [2120, '05-basmalah'],
  [2720, '06-kiblat'],
];
const serveUrl = await bundle({ entryPoint: resolve(motion, 'src/index.js'), publicDir: resolve(motion, 'public') });
if (process.argv.includes('cover')) {
  // sampul reel Instagram (PNG + JPEG berkualitas tinggi)
  const cover = await selectComposition({ serveUrl, id: 'IMuslimReelCover' });
  const png = resolve(motion, 'out', 'imuslim-reel-cover-1080x1920.png');
  await renderStill({ serveUrl, composition: cover, frame: 0, output: png, scale: 1, imageFormat: 'png', chromiumOptions: { gl: 'angle' } });
  const { default: sharp } = await import('sharp');
  await sharp(png).jpeg({ quality: 92, mozjpeg: true }).toFile(png.replace(/\.png$/, '.jpg'));
  console.log(png);
  process.exit(0);
}
const film = await selectComposition({ serveUrl, id: 'IMuslimFilm' });
for (const [frame, name] of KEY) {
  const output = resolve(out, `imuslim-still-${name}-3840x2160.png`);
  await renderStill({ serveUrl, composition: film, frame, output, scale: 2, imageFormat: 'png', chromiumOptions: { gl: 'angle' } });
  console.log(output);
}
// Thumbnail: lockup penutup (logo + tagline + URL) — terbaca jelas di ukuran kecil.
const thumb = resolve(out, 'imuslim-thumbnail-1280x720.png');
await renderStill({ serveUrl, composition: film, frame: 3450, output: thumb, scale: 1280 / 1920, imageFormat: 'png', chromiumOptions: { gl: 'angle' } });
console.log(thumb);
