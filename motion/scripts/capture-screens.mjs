// Tangkapan layar UI asli iMuslim beresolusi tinggi untuk dipakai di film.
// Memakai build produksi aplikasi (../dist) yang dilayani seperti GitHub Pages.
// Data pengguna contoh (kota, favorit, lokasi kiblat) hanya di localStorage peramban uji;
// jadwal, ayat, doa, dan hadits dimuat langsung dari API sungguhan.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(motion, '..');
const out = resolve(motion, 'public/screens');
const PORT = 4191;
const BASE = `http://localhost:${PORT}/imuslim`;

const DEMO = {
  'imuslim:prefs': { theme: 'system', cityId: '1301', cityName: 'Kota Jakarta', qari: '05', arabicScale: 1, showLatin: true, showTranslation: true, hijriOffset: 0 },
  'imuslim:quran': { favorites: [1, 18, 36, 67], bookmarks: [{ surah: 2, ayah: 255, surahLatin: 'Al-Baqarah', savedAt: 1 }], lastRead: { surah: 18, ayah: 10, surahLatin: 'Al-Kahf', at: 1 } },
  'imuslim:qibla': { lat: -6.2088, lon: 106.8456, label: 'Kota Jakarta', source: 'search' },
  'imuslim:migrated': '1',
};

// [nama, path, 'm'|'d', tema, scrollY]
const SHOTS = [
  ['m-home', '/', 'm', 'light', 0],
  ['m-home-dark', '/', 'm', 'dark', 0],
  ['m-quran', '/quran/', 'm', 'light', 0],
  ['m-surah', '/quran/36/', 'm', 'light', 0],
  ['m-surah-ayat', '/quran/36/', 'm', 'light', 640],
  ['m-surah-dark', '/quran/1/', 'm', 'dark', 0],
  ['m-sholat', '/sholat/', 'm', 'light', 330],
  ['m-sholat-dark', '/sholat/', 'm', 'dark', 330],
  ['m-imsakiyah', '/sholat/?tampilan=bulanan', 'm', 'light', 380],
  ['m-doa', '/doa/', 'm', 'light', 0],
  ['m-doa-detail', '/doa/equran/1/', 'm', 'light', 0],
  ['m-hadits', '/hadits/', 'm', 'light', 0],
  ['m-arbain', '/hadits/arbain/1/', 'm', 'light', 0],
  ['m-kalender', '/kalender/', 'm', 'light', 200],
  ['m-kiblat', '/kiblat/', 'm', 'light', 230],
  ['m-kiblat-dark', '/kiblat/', 'm', 'dark', 230],
  ['m-zakat', '/zakat/', 'm', 'light', 0],
  ['m-pengaturan', '/pengaturan/', 'm', 'light', 0],
  ['m-tentang', '/tentang/', 'm', 'light', 0],
  ['d-home', '/', 'd', 'light', 0],
  ['d-home-dark', '/', 'd', 'dark', 0],
  ['d-surah', '/quran/36/', 'd', 'light', 0],
  ['d-sholat-dark', '/sholat/', 'd', 'dark', 0],
  ['d-kalender', '/kalender/', 'd', 'light', 0],
  ['d-zakat', '/zakat/', 'd', 'light', 0],
  ['d-hadits', '/hadits/', 'd', 'light', 0],
  ['d-doa', '/doa/', 'd', 'light', 0],
];

await mkdir(out, { recursive: true });
const server = spawn(process.execPath, [resolve(app, 'scripts/serve-dist.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [name, path, kind, theme, scroll] of SHOTS) {
    const mobile = kind === 'm';
    const ctx = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: mobile ? 3 : 2,
      isMobile: mobile,
      hasTouch: mobile,
      colorScheme: theme,
      reducedMotion: 'reduce',
      locale: 'id-ID',
      timezoneId: 'Asia/Jakarta',
    });
    await ctx.addInitScript((demo) => {
      for (const [k, v] of Object.entries(demo)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }, DEMO);
    const page = await ctx.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.locator('html[data-ready]').waitFor({ state: 'attached' });
    await page.waitForTimeout(900);
    if (scroll) {
      await page.evaluate((y) => window.scrollTo(0, y), scroll);
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: resolve(out, `${name}.png`) });
    console.log('  ✓', name);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
