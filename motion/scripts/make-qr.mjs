// Matriks QR untuk penutup reel → src/data/qr.json (dirender sebagai SVG di Remotion).
// Koreksi galat level H (30%) agar tetap terbaca meski ada logo kecil di tengah.
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = 'https://imuslim-seven.vercel.app/';
const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
const { size, data } = qr.modules;
const rows = [];
for (let y = 0; y < size; y++) {
  let row = '';
  for (let x = 0; x < size; x++) row += data[y * size + x] ? '1' : '0';
  rows.push(row);
}
await writeFile(resolve(motion, 'src/data/qr.json'), JSON.stringify({ url, level: 'H', version: qr.version, size, rows }, null, 2));
console.log(`QR versi ${qr.version}, ${size}×${size} modul → src/data/qr.json`);
