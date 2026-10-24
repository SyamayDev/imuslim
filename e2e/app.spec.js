import { expect, test } from '@playwright/test';

const ROUTES = [
  ['', /Selamat (pagi|siang|sore|malam)/],
  ['quran/', /Al-Qur'an Digital/],
  ['quran/36/', /Yasin/],
  ['sholat/', /Jadwal Sholat/],
  ['doa/', /Doa & Dzikir/],
  ['hadits/', /Hadits 9 Kitab/],
  ['hadits/arbain/', /Arbain An-Nawawi/],
  ['kalender/', /Kalender Masehi/],
  ['kiblat/', /Arah Kiblat/],
  ['zakat/', /Kalkulator Zakat/],
  ['pengaturan/', /Pengaturan/],
  ['tentang/', /Tentang iMuslim/],
];

/** Kumpulkan error console/halaman dari kode kita (bukan permintaan API pihak ketiga). */
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  page.on('response', (r) => {
    const url = new URL(r.url());
    if (url.host.startsWith('localhost') && r.status() >= 400 && r.request().resourceType() !== 'document') errors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return errors;
}

test.describe('route & refresh', () => {
  for (const [path, heading] of ROUTES) {
    test(`/${path} terbuka langsung (HTTP 200), bisa di-refresh, tanpa error`, async ({ page }) => {
      const errors = watchErrors(page);
      const res = await page.goto(path);
      expect(res.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      expect(errors).toEqual([]);
    });
  }

  test('alamat lama dialihkan ke route baru', async ({ page }) => {
    for (const [from, to] of [
      ['jadwalsholatdanimsakiah/', /\/sholat$/],
      ['hadist/', /\/hadits$/],
      ['kalkulatorzakat/', /\/zakat$/],
      ['setting/', /\/pengaturan$/],
      ['setting/index.html', /\/pengaturan$/],
      // GitHub Pages: folder dilayani dengan garis miring akhir (/quran/)
      ['quran/index.html', /\/quran\/?$/],
      ['hadits/index.html', /\/hadits\/?$/],
    ]) {
      await page.goto(from);
      await expect(page).toHaveURL(to);
    }
  });

  test('alamat tidak dikenal menampilkan halaman 404 yang membantu', async ({ page }) => {
    const res = await page.goto('tidak-ada-halaman');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Halaman tidak ditemukan');
    await page.getByRole('link', { name: 'Kembali ke beranda' }).click();
    await expect(page).toHaveURL(/\/muslimweb\/?$/);
  });

  test('navigasi antarfitur tanpa memuat ulang halaman', async ({ page, isMobile }) => {
    await page.goto('');
    if (isMobile) {
      await page.getByRole('navigation', { name: 'Navigasi bawah' }).getByRole('link', { name: "Qur'an" }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Al-Qur'an Digital");
      await page.getByRole('button', { name: 'Menu' }).click();
      const sheet = page.getByRole('dialog', { name: 'Semua fitur' });
      await expect(sheet).toBeVisible();
      await sheet.getByRole('link', { name: 'Arah Kiblat' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arah Kiblat');
      await expect(sheet).toBeHidden();
    } else {
      const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
      await nav.getByRole('link', { name: 'Kalkulator Zakat' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kalkulator Zakat');
      await expect(nav.getByRole('link', { name: 'Kalkulator Zakat' })).toHaveAttribute('aria-current', 'page');
    }
  });
});

test.describe('responsif', () => {
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440]) {
    test(`tanpa scroll horizontal di lebar ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['', 'quran/', 'quran/1/', 'sholat/', 'doa/', 'kalender/', 'kiblat/', 'zakat/', 'pengaturan/', 'tentang/']) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `overflow di /${path} (${width}px)`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe('tema & layar penuh', () => {
  test('tombol tema: awalnya ikut perangkat, lalu terang ↔ gelap & bertahan', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:4173/muslimweb/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
    await nav.getByRole('button', { name: 'Aktifkan mode gelap' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await nav.getByRole('button', { name: 'Aktifkan mode terang' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    expect(await page.getByRole('button', { name: /ikuti sistem/i }).count()).toBe(0);
    await ctx.close();
  });

  test('tema gelap bertahan setelah refresh', async ({ page }) => {
    await page.goto('pengaturan/');
    await page.getByRole('radio', { name: /Gelap/ }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto('quran/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('preferensi sistem dihormati bila pengguna belum memilih', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('http://localhost:4173/muslimweb/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await ctx.close();
  });

  test('tombol layar penuh masuk & keluar', async ({ page, isMobile }) => {
    await page.goto('');
    const scope = isMobile ? page.locator('.topbar') : page.getByRole('navigation', { name: 'Navigasi utama' });
    await scope.getByRole('button', { name: 'Masuk layar penuh' }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await scope.getByRole('button', { name: 'Keluar dari layar penuh' }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  });
});

test.describe('aksesibilitas dasar', () => {
  test('tautan lewati ke konten & satu h1 per halaman', async ({ page }) => {
    await page.goto('doa/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Lewati ke konten utama' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('#konten')).toBeFocused();
    expect(await page.locator('h1').count()).toBe(1);
  });

  test('teks Arab memakai lang="ar" dir="rtl"', async ({ page }) => {
    await page.goto('quran/112/');
    const arabic = page.locator('.ayah .arabic').first();
    await expect(arabic).toBeVisible();
    await expect(arabic).toHaveAttribute('lang', 'ar');
    await expect(arabic).toHaveAttribute('dir', 'rtl');
    expect(await page.locator('html').getAttribute('lang')).toBe('id');
  });

  test('gambar punya alt & tombol ikon punya nama', async ({ page }) => {
    await page.goto('');
    await page.waitForLoadState('networkidle');
    const missingAlt = await page.locator('img:not([alt])').count();
    expect(missingAlt).toBe(0);
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href]')].filter((el) => !(el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title'))).length,
    );
    expect(unnamed).toBe(0);
  });
});
