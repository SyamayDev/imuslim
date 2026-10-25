// Tangkapan layar dist/ (dilayani seperti GitHub Pages) untuk dokumentasi & pemeriksaan visual.
// Sekaligus melaporkan overflow horizontal dan error console tiap route.
//
//   npm run build && node scripts/screenshots.mjs                 → docs/screenshots/*.webp (README)
//   ROUTES="/,/quran/1/" WIDTHS=390,1440 THEME=dark OUT=<folder> node scripts/screenshots.mjs
//
// Variabel: ROUTES, WIDTHS, THEME (light|dark), OUT, FULL=1 (halaman penuh), NOPREFS=1 (tanpa kota contoh)
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { resolveSite } from './site-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4199;
const BASE = `http://localhost:${PORT}${resolveSite().base.replace(/\/$/, '')}`;
const readme = !process.env.ROUTES;
const out = resolve(root, process.env.OUT ?? 'docs/screenshots');
const theme = process.env.THEME ?? 'light';
const full = process.env.FULL === '1';

// Set untuk README: [route, nama, lebar, tinggi, tema]
const README_SET = [
  ['/', 'beranda-desktop', 1440, 900, 'light'],
  ['/', 'beranda-mobile-gelap', 390, 844, 'dark'],
  ['/quran/36/', 'quran-surah-desktop', 1440, 900, 'light'],
  ['/quran/', 'quran-daftar-mobile', 390, 844, 'light'],
  ['/sholat/', 'sholat-desktop-gelap', 1440, 900, 'dark'],
  ['/sholat/?tampilan=bulanan', 'imsakiyah-mobile', 390, 844, 'light'],
  ['/doa/equran/1', 'doa-detail-mobile', 390, 844, 'light'],
  ['/hadits/', 'hadits-desktop', 1440, 900, 'light'],
  ['/kalender/', 'kalender-desktop', 1440, 900, 'light'],
  ['/kiblat/', 'kiblat-mobile-gelap', 390, 844, 'dark'],
  ['/zakat/', 'zakat-desktop', 1440, 900, 'light'],
  ['/pengaturan/', 'pengaturan-mobile', 390, 844, 'light'],
];

const jobs = readme
  ? README_SET
  : process.env.ROUTES.split(',').flatMap((r) =>
      (process.env.WIDTHS ?? '390,1440').split(',').map((w) => [r, `${r.replace(/[/?=&]/g, '_') || 'root'}-${w}${theme === 'dark' ? '-dark' : ''}`, Number(w), Number(w) < 800 ? 844 : 900, theme]),
    );

// Contoh data pengguna agar tangkapan layar memperlihatkan fitur yang terisi (bukan data palsu:
// semuanya data lokal pengguna, jadwal tetap diambil langsung dari API).
const DEMO = process.env.NOPREFS
  ? null
  : {
      'imuslim:prefs': { theme: 'system', cityId: '1301', cityName: 'Kota Jakarta', qari: '05', arabicScale: 1, showLatin: true, showTranslation: true, hijriOffset: 0 },
      'imuslim:quran': { favorites: [1, 18, 36, 67], bookmarks: [{ surah: 2, ayah: 255, surahLatin: 'Al-Baqarah', savedAt: 1 }], lastRead: { surah: 18, ayah: 10, surahLatin: 'Al-Kahf', at: 1 } },
      'imuslim:qibla': { lat: -6.2088, lon: 106.8456, label: 'Kota Jakarta (contoh lokasi)', source: 'search' },
      'imuslim:migrated': '1',
    };

await mkdir(out, { recursive: true });
const server = spawn(process.execPath, [resolve(root, 'scripts/serve-dist.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
let problems = 0;

try {
  for (const [route, name, width, height, th] of jobs) {
    // reducedMotion: animasi dekoratif berhenti → tangkapan layar stabil & semua konten terlihat.
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: th, reducedMotion: 'reduce', deviceScaleFactor: readme ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
    if (DEMO) {
      await ctx.addInitScript((demo) => {
        try {
          for (const [k, v] of Object.entries(demo)) if (localStorage.getItem(k) === null) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        } catch {
          /* abaikan */
        }
      }, DEMO);
    }
    const page = await ctx.newPage();
    const logs = [];
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && logs.push(m.text().slice(0, 200)));
    page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => logs.push(`goto: ${e.message}`));
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const png = await page.screenshot({ fullPage: full || !readme });
    if (readme) await sharp(png).resize({ width: Math.min(width * 2, 2400) }).webp({ quality: 78 }).toFile(resolve(out, `${name}.webp`));
    else await sharp(png).png().toFile(resolve(out, `${name}.png`));
    if (overflow > 0 || logs.length) problems += 1;
    console.log(`${String(width).padStart(4)} ${route.padEnd(28)} overflow=${overflow}${logs.length ? `\n     ${logs.join('\n     ')}` : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(problems ? `\n${problems} halaman bermasalah.` : `\nSelesai tanpa overflow/error console → ${out}`);
