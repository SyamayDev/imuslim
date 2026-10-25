// Ikon peluncur PNG untuk Android 7.0–7.1 (API 24–25). Android 8+ memakai ikon adaptif vektor
// di android/app/src/main/res/drawable*/ic_launcher_*.xml (logo yang sama dengan public/brand).
//   node scripts/generate-android-icons.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const res = resolve(root, 'android/app/src/main/res');
const icon = await readFile(resolve(root, 'public/brand/imuslim-app-icon.svg'), 'utf8');
// Versi tanpa sudut membulat untuk dipotong lingkaran (ikon bulat).
const square = icon.replace('rx="15"', 'rx="0"');
const circleMask = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);

const DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, size] of Object.entries(DENSITIES)) {
  const dir = resolve(res, `mipmap-${d}`);
  await sharp(Buffer.from(icon), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(resolve(dir, 'ic_launcher.png'));
  await sharp(Buffer.from(square), { density: 384 })
    .resize(size, size)
    .composite([{ input: circleMask(size), blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(dir, 'ic_launcher_round.png'));
}
console.log('ikon Android (API 24–25) dibuat:', Object.keys(DENSITIES).join(', '));
