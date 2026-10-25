// Tangkapan layar tambahan untuk reel 90 dtk: halaman panjang (untuk efek gulir di dalam
// ponsel) dan tafsir yang terbuka. Sama seperti capture-screens.mjs: build produksi aplikasi,
// data pengguna contoh hanya di localStorage; ayat, tafsir, doa, hadits, jadwal dari API asli.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(motion, '..');
const out = resolve(motion, 'public/screens');
const PORT = 4192;
const BASE = `http://localhost:${PORT}/imuslim`;

const DEMO = {
  'imuslim:prefs': { theme: 'system', cityId: '1301', cityName: 'Kota Jakarta', qari: '05', arabicScale: 1, showLatin: true, showTranslation: true, hijriOffset: 0 },
  'imuslim:quran': { favorites: [1, 18, 36, 67], bookmarks: [{ surah: 2, ayah: 255, surahLatin: 'Al-Baqarah', savedAt: 1 }], lastRead: { surah: 18, ayah: 10, surahLatin: 'Al-Kahf', at: 1 } },
  'imuslim:qibla': { lat: -6.2088, lon: 106.8456, label: 'Kota Jakarta', source: 'search' },
  'imuslim:migrated': '1',
};

// [nama, path, tema, y-awal, tinggi (px CSS)] — tinggi > 844 = halaman panjang untuk digulir
const TALL = [
  ['mt-home', '/', 'light', 0, 2300],
  ['mt-home-dark', '/', 'dark', 0, 2300],
  ['mt-surah', '/quran/36/', 'light', 0, 2600],
  ['mt-sholat', '/sholat/', 'light', 0, 2000],
  ['mt-imsakiyah', '/sholat/?tampilan=bulanan', 'light', 300, 2400],
  ['mt-doa', '/doa/', 'light', 0, 2400],
  ['mt-doa-detail', '/doa/equran/1/', 'light', 0, 1900],
  ['mt-hadits', '/hadits/', 'light', 0, 2300],
  ['mt-arbain', '/hadits/arbain/1/', 'light', 0, 2300],
  ['mt-kalender', '/kalender/', 'light', 0, 2300],
  ['mt-zakat', '/zakat/', 'light', 0, 2600],
  ['mt-pengaturan', '/pengaturan/', 'light', 0, 2300],
  ['mt-pengaturan-dark', '/pengaturan/', 'dark', 0, 2300],
];

async function context(browser, theme) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: theme,
    reducedMotion: 'reduce',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  });
  await ctx.addInitScript((demo) => {
    for (const [k, v] of Object.entries(demo)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, DEMO);
  return ctx;
}

async function open(ctx, path) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.locator('html[data-ready]').waitFor({ state: 'attached' });
  await page.waitForTimeout(900);
  return page;
}

await mkdir(out, { recursive: true });
const server = spawn(process.execPath, [resolve(app, 'scripts/serve-dist.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [name, path, theme, y, h] of TALL) {
    const ctx = await context(browser, theme);
    const page = await open(ctx, path);
    // gulir pelan sampai bawah agar konten bertahap (surah panjang) ikut dirender, lalu kembali
    await page.evaluate(async (target) => {
      for (let s = 0; s < target; s += 400) {
        window.scrollTo(0, s);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    }, y + h);
    await page.waitForTimeout(700);
    // header tetap (sticky/fixed) tidak boleh terulang di tengah gambar panjang → dilepas sementara
    await page.addStyleTag({ content: '.bottom-nav{display:none !important}' });
    await page.screenshot({ path: resolve(out, `${name}.png`), fullPage: true, clip: { x: 0, y, width: 390, height: h } });
    console.log('  ✓', name);
    await ctx.close();
  }
  // Tafsir terbuka (Al-Fatihah ayat 2) — teks tafsir dari API asli
  {
    const ctx = await context(browser, 'light');
    const page = await open(ctx, '/quran/1/');
    const btn = page.getByRole('button', { name: 'Tafsir ayat 2', exact: true });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.locator('#tafsir-2').waitFor({ state: 'visible' });
    await page.waitForFunction(() => (document.querySelector('#tafsir-2')?.textContent || '').trim().length > 120, null, { timeout: 20000 });
    // mulai dari baris tombol ayat 2: teks Arab, latin, terjemahan, lalu tafsir di bawahnya
    const top = await btn.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y - 150), top);
    await page.waitForTimeout(600);
    await page.screenshot({ path: resolve(out, 'm-tafsir.png') });
    console.log('  ✓ m-tafsir');
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
