// Render frame diam untuk pemeriksaan (QA) + lembar kontak.
//   node scripts/render-stills.mjs <KomposisiId> <frame,frame,...|every:N> [outDir] [scale]
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import sharp from 'sharp';

const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [id = 'IMuslimFilm', framesArg = 'every:60', outArg, scaleArg] = process.argv.slice(2);
const outDir = resolve(outArg ?? resolve(motion, 'out/qa'));
const scale = Number(scaleArg ?? 0.5);
await mkdir(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: resolve(motion, 'src/index.js'), publicDir: resolve(motion, 'public') });
const composition = await selectComposition({ serveUrl, id });
const frames = framesArg.startsWith('every:')
  ? Array.from({ length: Math.ceil(composition.durationInFrames / Number(framesArg.slice(6))) }, (_, i) => i * Number(framesArg.slice(6)))
  : framesArg.split(',').map(Number);

const files = [];
for (const frame of frames) {
  const output = resolve(outDir, `${id}-${String(frame).padStart(5, '0')}.png`);
  await renderStill({ serveUrl, composition, frame, output, scale, imageFormat: 'png' });
  files.push(output);
  process.stdout.write(`  ✓ ${frame}\n`);
}

// Lembar kontak: 4 kolom, label frame & detik.
const tw = Math.round(composition.width * scale * 0.5);
const th = Math.round(composition.height * scale * 0.5);
const cols = 4;
const rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(
  files.map(async (f, i) => {
    const label = Buffer.from(
      `<svg width="${tw}" height="${th}"><rect x="0" y="${th - 26}" width="150" height="26" fill="rgba(0,0,0,.65)"/><text x="8" y="${th - 8}" font-family="Arial" font-size="15" fill="#fff">f${frames[i]} · ${(frames[i] / 60).toFixed(2)}s</text></svg>`,
    );
    return sharp(f).resize(tw, th).composite([{ input: label }]).png().toBuffer();
  }),
);
const sheet = resolve(outDir, `${id}-sheet.png`);
await sharp({ create: { width: cols * (tw + 6), height: rows * (th + 6), channels: 3, background: '#222' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * (tw + 6), top: Math.floor(i / cols) * (th + 6) })))
  .png()
  .toFile(sheet);
console.log(`lembar kontak: ${sheet}`);
