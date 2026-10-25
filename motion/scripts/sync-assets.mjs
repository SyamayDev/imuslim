// Menyalin "sumber kebenaran" dari aplikasi iMuslim ke proyek motion:
//  - path logo asli (src/components/brand/wordmark-paths.js) → src/brand/paths.js
//  - SVG merek (public/brand) → public/brand
//  - data konten yang tampil di video, diambil dari sumber yang sama dengan aplikasi:
//      * QS. Al-Fatihah [1]: 1 dari equran.id (Arab, latin, terjemahan) — diambil langsung
//      * jadwal sholat Kota Jakarta 24-10-2026 dari respons asli api.myquran.com (fixture tes)
//      * arah & jarak kiblat Jakarta dihitung dengan utils/qibla.js milik aplikasi
//      * tanggal Hijriah 24-10-2026 dengan utils/hijri.js milik aplikasi (Umm al-Qura)
//      * angka fitur dari README/AUDIT, skor Lighthouse situs live (diukur 25-10-2026)
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(motion, '..');
const imp = (p) => import(pathToFileURL(resolve(app, p)).href);

const { qiblaBearing, distanceToKaaba, KAABA } = await imp('src/utils/qibla.js');
const { toHijri, formatHijri } = await imp('src/utils/hijri.js');
const brand = await imp('src/components/brand/wordmark-paths.js');

// ---------- path logo ----------
await mkdir(resolve(motion, 'src/brand'), { recursive: true });
const js = `// Disalin dari src/components/brand/wordmark-paths.js (aplikasi) oleh scripts/sync-assets.mjs.
// Jangan diedit manual — jalankan \`npm run assets\` bila logo aplikasi berubah.
${Object.entries(brand)
  .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
  .join('\n')}
`;
await writeFile(resolve(motion, 'src/brand/paths.js'), js);

// ---------- SVG merek ----------
await mkdir(resolve(motion, 'public/brand'), { recursive: true });
for (const f of await readdir(resolve(app, 'public/brand'))) {
  if (f.endsWith('.svg')) await copyFile(resolve(app, 'public/brand', f), resolve(motion, 'public/brand', f));
}

// ---------- konten ----------
const surah = await (await fetch('https://equran.id/api/v2/surat/1')).json();
const a1 = surah?.data?.ayat?.[0];
if (!a1 || a1.nomorAyat !== 1 || !a1.teksArab) throw new Error('Respons equran.id untuk Al-Fatihah tidak valid');

const jadwal = JSON.parse(await readFile(resolve(app, 'src/test/fixtures/myquran-jadwal-1301-2026-10.json'), 'utf8'));
const day = jadwal.data.jadwal.find((d) => d.date === '2026-10-24');
if (!day) throw new Error('Jadwal 24-10-2026 tidak ada di fixture');

const JAKARTA = { lat: -6.2088, lon: 106.8456 };
const hijri = toHijri(2026, 10, 24, 0);

const content = {
  generatedAt: new Date().toISOString(),
  basmalah: {
    arab: a1.teksArab.trim(),
    latin: a1.teksLatin.trim(),
    translation: a1.teksIndonesia.trim(),
    ref: 'QS. Al-Fātiḥah [1]: 1',
    source: 'https://equran.id/api/v2/surat/1',
  },
  prayer: {
    city: 'Kota Jakarta',
    dateLabel: 'Sabtu, 24 Oktober 2026',
    times: [
      ['Subuh', day.subuh],
      ['Dzuhur', day.dzuhur],
      ['Ashar', day.ashar],
      ['Maghrib', day.maghrib],
      ['Isya', day.isya],
    ],
    imsak: day.imsak,
    terbit: day.terbit,
    source: 'api.myquran.com/v2/sholat/jadwal/1301/2026/10 (respons asli, direkam 24-10-2026)',
  },
  qibla: {
    from: 'Jakarta',
    lat: JAKARTA.lat,
    lon: JAKARTA.lon,
    kaaba: KAABA,
    bearing: Math.round(qiblaBearing(JAKARTA.lat, JAKARTA.lon) * 10) / 10,
    distanceKm: Math.round(distanceToKaaba(JAKARTA.lat, JAKARTA.lon)),
    source: 'src/utils/qibla.js (rumus lingkaran besar, sama dengan aplikasi)',
  },
  hijri: { gregorian: 'Sabtu, 24 Oktober 2026', label: formatHijri(hijri), source: 'src/utils/hijri.js (Umm al-Qura)' },
  counts: {
    surah: 114,
    qari: 6,
    cities: 517,
    citiesTotal: 518,
    doaEquran: 227,
    doaMyquran: 108,
    hadithBooks: 9,
    arbain: 42,
    source: 'README.md & docs/AUDIT.md',
  },
  lighthouse: {
    url: 'imuslim-seven.vercel.app',
    formFactor: 'ponsel',
    scores: { performance: 98, accessibility: 100, bestPractices: 100, seo: 100 },
    measured: '25 Oktober 2026',
    tool: 'Lighthouse 13.5',
    source: 'Diukur langsung pada situs live (beranda, mode ponsel) sebelum pembuatan video',
  },
  url: 'imuslim-seven.vercel.app',
};
await mkdir(resolve(motion, 'src/data'), { recursive: true });
await writeFile(resolve(motion, 'src/data/content.json'), `${JSON.stringify(content, null, 2)}\n`);
console.log('sync-assets: path logo, SVG merek, dan content.json siap');
console.log(`  kiblat Jakarta ${content.qibla.bearing}° · ${content.qibla.distanceKm} km · Hijriah ${content.hijri.label}`);
