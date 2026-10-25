# Brand bible — film motion graphic iMuslim

Ringkasan identitas yang dipakai film. Semua nilai di bawah diambil dari aplikasi iMuslim di repo ini. Film tidak memakai sumber lain.

## 1. Nama & nada

- Nama produk: **iMuslim**. Tagline di film: **"Teman ibadah harian."**
- URL yang ditampilkan: **imuslim-seven.vercel.app**. Ini deployment Vercel yang aktif, dipilih karena GitHub Pages masih menyajikan sumber mentah. Lihat README aplikasi, bagian Deploy.
- Karakter visual: tenang, matang, elegan, hangat. Emas dipakai sebagai cahaya, bukan glitter.
- Tidak memakai logo, nama, warna merah khas, huruf, musik, atau aset milik Marvel/Disney atau pihak lain.

## 2. Palet (token)

Sumber: `src/styles/tokens.css` aplikasi, dicerminkan di `motion/src/lib/theme.js`.

| Token | Hex | Pemakaian di film |
|---|---|---|
| `night` | `#040907` | latar terdalam, celup ke hitam |
| `deep` | `#07130e` | gradasi latar malam |
| `forest` | `#0A3F30` | bayangan hijau zamrud |
| `hero` | `#0D4E3B` | cahaya latar, tint adegan |
| `emerald` | `#0F5A44` | teks Arab di kartu mushaf |
| `mint` | `#67C8A1` | cincin skor, daratan bola bumi |
| `ivory` / `ivoryWarm` | `#F6F2E9` / `#F7F1E3` | teks utama di latar gelap, kartu mushaf |
| `ink` | `#16211D` | teks di kartu terang |
| `gold` | `#C3964A` | garis kisi, aksen |
| `goldLight` | `#E6C47E` | cahaya, bloom, garis logo |
| `goldPale` | `#F6E3B4` | teks aksen di latar gelap |
| `goldDeep` | `#8A6116` | rujukan ayat di kartu terang |

Kontras teks utama (`ivoryWarm` di atas `night`/`deep`) dan teks kartu (`ink`/`emerald` di atas `ivoryWarm`) jauh di atas 4,5:1.

Color grading film: bayangan hijau zamrud dan highlight emas hangat. Grading ini konsisten karena semua adegan memakai `NightBackground` dan `FilmFinish` yang sama (vignette dan grain sekitar 2–3%).

## 3. Huruf

| Peran | Huruf | Lisensi | Paket |
|---|---|---|---|
| Judul/display | Fraunces 600 | SIL OFL 1.1 | `@fontsource/fraunces` 5.3.0 |
| UI/teks | Plus Jakarta Sans (variable) | SIL OFL 1.1 | `@fontsource-variable/plus-jakarta-sans` 5.3.0 |
| Arab (ayat) | Amiri Quran | SIL OFL 1.1 | `@fontsource/amiri-quran` 5.3.0 |

Teks Arab selalu memakai `lang="ar"` dan `dir="rtl"`. Teks Arab hanya muncul kata demi kata dan tidak pernah dipecah per huruf.

## 4. Logo

- Path **asli** logo diambil dari `src/components/brand/wordmark-paths.js` aplikasi. `npm run assets` menyalinnya ke `motion/src/brand/paths.js`. Berkas SVG merek disalin ke `motion/public/brand/`.
- Struktur mark: lengkung mihrab, batang (tubuh huruf i), buku terbuka, dan bulan sabit sebagai titik huruf i.
- Animasi `Mark` menggambar ulang path yang sama (stroke-draw). Morph bintang ke bulan sabit terjadi sebelum path sabit asli mengambil alih. Bentuk logo tidak diubah.

## 5. Corak

Kisi khatam (bintang delapan), roset 16 sudut, lengkung mihrab, dan iris bintang delapan. Semuanya dibangun dari geometri di `motion/src/lib/geometry.js`. Corak ini dibuat sendiri, bukan aset pihak lain.

## 6. Angka & fakta yang boleh tampil (beserta sumber)

| Fakta di layar | Nilai | Sumber |
|---|---|---|
| Surah | 114 | README / docs/AUDIT.md |
| Qari audio | 6 | README / docs/AUDIT.md |
| Kota jadwal sholat | 517 (dari 518) | docs/AUDIT.md §3 |
| Doa | 335 = 227 (equran.id) + 108 (myquran) | README / docs/AUDIT.md |
| Hadits | 9 kitab + 42 Arbain | README / docs/AUDIT.md |
| Contoh jadwal | Kota Jakarta, Sabtu 24 Oktober 2026 (Subuh 04:12, Dzuhur 11:40, Ashar 14:51, Maghrib 17:49, Isya 18:59) | respons asli `api.myquran.com/v2/sholat/jadwal/1301/2026/10` |
| Arah kiblat | Jakarta → Ka'bah 295,2°, ± 7.920 km | dihitung dengan `src/utils/qibla.js` aplikasi |
| Tanggal Hijriah | 13 Jumadilawal 1448 H (24 Oktober 2026) | `src/utils/hijri.js` aplikasi (Umm al-Qura) |
| Zakat | 2,5%; nisab 85 gram emas; fitrah 2,5 kg beras per jiwa | kalkulator zakat aplikasi (hanya acuan rumus, tanpa harga emas) |
| Lighthouse | Performa 98 · Aksesibilitas 100 · Praktik terbaik 100 · SEO 100 | diukur langsung pada situs live (beranda, ponsel, Lighthouse 13.5) tanggal 25 Oktober 2026 |

Film menampilkan skor **situs live** (98/100/100/100) dan keterangannya tertulis di layar. Skor 100 di README diukur pada build produksi lokal 24 Oktober 2026, jadi kondisinya berbeda. Film tidak mengklaim "100" untuk situs live.

### Klaim fitur di reel 90 detik

Semua chip dan judul di adegan pendalaman fitur (`src/scenes/Reel.jsx`) diambil dari tabel **Fitur** dan bagian **Privasi** di README aplikasi:

- Beranda: sapaan, tanggal Masehi + Hijriah, waktu sholat berikutnya + hitung mundur, lanjutkan membaca, ayat hari ini.
- Al-Qur'an: murattal 6 qari (satu surah atau per ayat), terjemahan Kemenag, tafsir per ayat, pencarian termasuk pencarian suara.
- Jadwal sholat: 517 kota, WIB/WITA/WIT, imsakiyah bulanan dengan kolom Hijriah, pengingat adzan opsional.
- Doa: 227 + 108 doa, Arab/latin/arti/dalil, simpan/salin/bagikan.
- Hadits: 9 kitab (Bukhari, Muslim, Abu Dawud, Tirmidzi, Nasai, Ibnu Majah, Ahmad, Malik, Darimi) + Arbain, lompat ke nomor.
- Kalender: hari besar Islam (perkiraan), acara pribadi, penyesuaian Hijriah (Pengaturan).
- Zakat: penghasilan, maal, fitrah; harga emas referensi bertanggal atau isi manual; rumus & asumsi ditampilkan.
- Nyaman & privat: tema terang/gelap, PWA yang bisa dipasang, tanpa akun/iklan/pelacak.

Kartu "pop-out" adalah potongan persegi dari tangkapan layar asli yang diperbesar seragam, tidak digambar ulang.

QR code penutup mengarah ke `https://imuslim-seven.vercel.app/` (level koreksi H, versi 4, 33×33 modul). Kode ini dibuat oleh `scripts/make-qr.mjs` dan diuji terbaca dari video final oleh `scripts/verify-qr.mjs`.

## 7. Teks agama yang tampil

| Teks | Rujukan | Sumber |
|---|---|---|
| بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ | QS. Al-Fātiḥah [1]: 1 | `https://equran.id/api/v2/surat/1` (diambil langsung, tidak diketik ulang) |
| "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang." | terjemahan QS. Al-Fātiḥah [1]: 1 | equran.id (respons yang sama) |

Tangkapan layar aplikasi di montase juga memuat teks Arab yang dirender oleh aplikasi dari API, misalnya halaman surah Yasin, doa sebelum tidur, dan hadits Arbain no. 1. Aturan penanganannya:

- teks ayat dan lafaz Allah tidak pernah di-glitch, dipecah per huruf, dicerminkan/dibalik, diregangkan, dijadikan partikel, atau diberi motion blur;
- layar yang memuat teks Arab agama tidak diberi blur dan rotasinya dibatasi di bawah 90° (tidak pernah tampil cermin);
- flip-book cepat dan cincin terowongan (adegan 5C, dengan motion blur) **hanya** memakai layar tanpa teks ayat/lafaz Allah;
- adegan Al-Qur'an (6) tidak memakai perkusi maupun melodi, hanya pad lembut dan ambience.

## 8. Larangan

- Tidak ada makhluk hidup dalam visual. Ka'bah hanya berupa ikon kubus sederhana.
- Tidak ada kilatan luminans besar lebih dari 3 kali per detik (WCAG 2.3.1). Diukur oleh `npm run qa`.
- Setiap teks layar tampil ≥ 1,5 detik. Reel dan teaser mematuhi safe area 14% atas dan 20% bawah.
