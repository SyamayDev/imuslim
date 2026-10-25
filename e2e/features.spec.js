// Alur fitur utama terhadap API publik sungguhan (membutuhkan internet).
import { expect, test } from '@playwright/test';

/** Buka halaman lalu tunggu React selesai hydrate (JS dimuat setelah cat pertama). */
async function open(page, path) {
  const res = await page.goto(path);
  await page.locator('html[data-ready]').waitFor({ state: 'attached' });
  return res;
}

test.describe("Al-Qur'an", () => {
  test('cari surah, buka, tandai terakhir dibaca, simpan ayat', async ({ page }) => {
    await open(page, 'quran/');
    await page.getByRole('searchbox', { name: 'Cari surah' }).fill('ikhlas');
    await page.getByRole('link', { name: /Al-Ikhlas/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Al-Ikhlas');
    await expect(page.locator('#ayat-4 .arabic')).toBeVisible();
    await page.getByRole('button', { name: 'Tandai ayat 2 sebagai terakhir dibaca' }).click();
    await page.getByRole('button', { name: 'Simpan ayat 3' }).click();
    await open(page, 'quran/');
    await expect(page.getByText('Terakhir dibaca')).toBeVisible();
    await expect(page.getByRole('link', { name: /QS\. Al-Ikhlas · ayat 2/ })).toBeVisible();
    await page.getByRole('tab', { name: /Ayat tersimpan/ }).click();
    await expect(page.getByRole('link', { name: /Al-Ikhlas.*ayat 3/ })).toBeVisible();
  });

  test('audio surah: pemutar muncul dan bisa dihentikan; pindah surah menghentikan audio', async ({ page }) => {
    await open(page, 'quran/112/');
    await page.getByRole('button', { name: 'Putar mulai ayat 1' }).click();
    const player = page.getByRole('region', { name: 'Pemutar audio' });
    await expect(player).toBeVisible();
    await expect(player).toContainText('Al-Ikhlas · Ayat 1');
    await page.getByRole('link', { name: /Berikutnya.*Al-Falaq/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Al-Falaq');
    await expect(player).toBeHidden();
  });

  test('?ayat= menggulir ke ayat tujuan', async ({ page }) => {
    await open(page, 'quran/2/?ayat=255');
    await expect(page.locator('#ayat-255')).toBeInViewport({ timeout: 20_000 });
  });
});

test.describe('jadwal sholat', () => {
  test('tanpa kota tidak menampilkan jadwal; pilih kota menampilkan jadwal & imsakiyah', async ({ page }) => {
    await open(page, 'sholat/');
    await expect(page.getByText('Belum ada kota dipilih')).toBeVisible();
    const combo = page.getByRole('combobox', { name: 'Cari kota atau kabupaten' });
    await combo.fill('bandung');
    await page.getByRole('option', { name: 'Kota Bandung' }).click();
    await expect(page.getByRole('heading', { name: /Kota: Kota Bandung/ })).toBeVisible();
    await expect(page.getByRole('list', { name: /Waktu sholat Kota Bandung hari ini/ })).toBeVisible();
    await page.getByRole('tab', { name: /Bulanan/ }).click();
    await expect(page.getByRole('table')).toContainText('Imsak');
    await expect(page.locator('tr[aria-current="date"]')).toHaveCount(1);
  });

  test('lokasi ditolak → pesan jelas, tidak ada kota bawaan', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: [] });
    const page = await ctx.newPage();
    await open(page, 'http://localhost:4173/imuslim/sholat/');
    await page.getByRole('button', { name: 'Gunakan lokasi saya' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Izin lokasi ditolak|tidak tersedia|habis/ })).toBeVisible();
    await expect(page.getByText('Belum ada kota dipilih')).toBeVisible();
    await ctx.close();
  });
});

test.describe('doa, hadits, kalender, kiblat, zakat', () => {
  test('doa: cari, buka detail, simpan', async ({ page }) => {
    await open(page, 'doa/');
    await page.getByRole('searchbox', { name: 'Cari doa' }).fill('tidur');
    await page.getByRole('link', { name: /Doa Sebelum Tidur 1/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Doa Sebelum Tidur 1');
    await page.getByRole('button', { name: 'Simpan' }).click();
    await open(page, 'doa/?koleksi=tersimpan');
    await expect(page.getByRole('link', { name: /Doa Sebelum Tidur 1/ })).toBeVisible();
  });

  test('hadits: buka kitab, lompat ke nomor', async ({ page }) => {
    await open(page, 'hadits/');
    await page.getByRole('link', { name: /HR\. Muslim/ }).click();
    await page.getByLabel('Lompat ke nomor').fill('8');
    await page.getByRole('button', { name: 'Buka' }).click();
    await expect(page).toHaveURL(/\/hadits\/muslim\/8$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('No. 8');
  });

  test('kalender: tambah, ubah, hapus acara', async ({ page }) => {
    await open(page, 'kalender/');
    await page.getByRole('button', { name: 'Tambah acara' }).click();
    const dialog = page.getByRole('dialog', { name: 'Tambah acara' });
    await dialog.getByRole('button', { name: 'Simpan' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Nama acara wajib diisi.');
    await dialog.getByLabel('Nama acara').fill('Kajian rutin');
    await dialog.getByLabel(/Waktu/).fill('19:30');
    await dialog.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.getByText('Kajian rutin').first()).toBeVisible();
    await page.reload();
    await expect(page.getByText('Kajian rutin').first()).toBeVisible();
    await page.getByRole('button', { name: 'Hapus acara Kajian rutin' }).click();
    await expect(page.getByText('Belum ada acara pada tanggal ini.')).toBeVisible();
  });

  test('kiblat: cukup satu tombol "Gunakan lokasi saya" (Jakarta ≈ 295°)', async ({ browser }) => {
    const ctx = await browser.newContext({ geolocation: { latitude: -6.2088, longitude: 106.8456 }, permissions: ['geolocation'] });
    const page = await ctx.newPage();
    await open(page, 'http://localhost:4173/imuslim/kiblat/');
    // Tidak ada istilah koordinat yang membingungkan orang awam.
    await expect(page.getByText(/latitude|longitude|Lintang|Bujur/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Gunakan lokasi saya' }).click();
    await expect(page.locator('.compass-readout__deg')).toHaveText(/295[,.][12]°/);
    await expect(page.getByText(/barat laut/)).toBeVisible();
    await expect(page.getByText(/Lokasi Anda saat ini/)).toBeVisible();
    await ctx.close();
  });

  test('kiblat: izin lokasi ditolak → pesan jelas & bisa ketik nama kota', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: [] });
    const page = await ctx.newPage();
    await open(page, 'http://localhost:4173/imuslim/kiblat/');
    await page.getByRole('button', { name: 'Gunakan lokasi saya' }).click();
    await expect(page.getByRole('status').filter({ hasText: /ditolak|belum bisa ditemukan|terlalu lama|tidak dapat/ })).toBeVisible();
    await expect(page.getByLabel('Nama kota atau kabupaten')).toBeVisible();
    await ctx.close();
  });

  test('zakat penghasilan dengan harga emas manual', async ({ page }) => {
    await open(page, 'zakat/');
    await page.getByLabel('Harga emas per gram').fill('1200000');
    await page.getByLabel('Gaji / penghasilan per bulan').fill('10000000');
    const result = page.locator('.zakat-result');
    await expect(result).toContainText('wajib zakat penghasilan');
    await expect(result).toContainText('Rp 250.000');
  });
});
