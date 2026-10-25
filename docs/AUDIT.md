# Audit & Migrasi iMuslim (Oktober 2026)

Dokumen ini mencatat kondisi situs lama, bukti pengujian API, dan keputusan migrasi ke iMuslim v2 (React + Vite).
Tanggal audit & pengujian: **24 Oktober 2026**. Lingkungan: Windows 11, Node.js 22.19, Google Chrome 156.
Kode situs lama tidak dihapus — seluruhnya diarsipkan di folder [`legacy/`](../legacy) untuk rujukan.

---

## 1. Inventaris situs lama → status di v2

| Halaman lama | Teknologi | Fitur yang ada | Status di v2 |
|---|---|---|---|
| `index.html` (beranda) | Bootstrap 4+5, jQuery, Owl, Swiper | Sapaan, carousel 8 foto + kutipan, pintasan fitur, slider motivasi, 4 video YouTube, footer | Dibangun ulang: sapaan sesuai waktu, tanggal Masehi + Hijriah, kartu sholat berikutnya, lanjutkan membaca, ayat & hadits hari ini (dari API), 4 video (judul asli terverifikasi) |
| `quran/` | Vue 2 + vue-resource, Select2 | Daftar surah, cari, suara, favorit, paginasi, detail modal, audio surah & per ayat, salin, bagikan, terakhir dibaca | Semua dipertahankan + route per surah, tafsir per ayat, 6 qari, bookmark ayat jamak, pintasan `2:255` |
| `jadwalsholatdanimsakiah/` | jQuery, Select2 | Pilih kota, GPS + reverse geocode, harian/bulanan, countdown, adzan otomatis, running text | Dipertahankan; GPS hanya saat diklik, tanpa kota bawaan, zona WIB/WITA/WIT, adzan hanya bila dinyalakan |
| `doa/` | Vue 2 | Daftar, cari, suara, paginasi, detail, salin, bagikan, simpan | Dipertahankan + koleksi kedua (equran.id, dengan latin & dalil) |
| `hadist/` | Vue 2 | 9 kitab, paginasi rentang, cari nomor, salin, bagikan, simpan | Dipertahankan + Arbain An-Nawawi; API diganti (lihat §3) |
| `kalender/` | JS + Bootstrap modal | Grid bulan, Hijriah, tandai acara, daftar acara, bagikan, countdown, notifikasi | Dipertahankan; Hijriah diganti metode yang dapat dijelaskan, acara jamak per tanggal |
| `kiblat/` | Vue 2 | GPS, sudut kiblat, kompas SVG, peta Google | Dipertahankan; ditambah input manual & pencarian tempat, peta `YOUR_API_KEY` dihapus |
| `kalkulatorzakat/` | Vue 2 | Zakat penghasilan, harga emas | Dipertahankan + zakat maal & fitrah; harga emas palsu dihapus |
| `setting/` | jQuery | Akun, sandi, bahasa, notifikasi, lokasi, metode, ukuran font, form dukungan | Diganti pengaturan yang benar-benar berfungsi (lihat §2) |
| `test.html` | — | Uji coba equran.id (judul salah: "Al-Ikhlas" vs isi Al-Fatihah) | Diarsipkan |

## 2. Masalah yang ditemukan di situs lama

**Fungsional & data**
- Halaman doa **kosong**: kode memeriksa `res.data.arab`/`res.data.indo`, padahal API myQuran kini mengembalikan `doa`/`artinya`; semua item tersaring. Kode juga menembakkan **108 request paralel** padahal ada `/v2/doa/semua`.
- Transliterasi doa **dikarang** dengan penggantian huruf Arab → Latin naif (`arabicToLatin`). Di v2 latin hanya ditampilkan bila disediakan sumber.
- Hadits: `api.hadith.gading.dev` gagal TLS (lihat §3) → halaman hadits tidak bisa memuat apa pun.
- Audio Al-Qur'an per ayat digabung dengan teks **berdasarkan indeks array** dari dua API berbeda.
- Basmalah ditampilkan juga di **At-Taubah** (seharusnya tidak).
- Kalkulator zakat "mengambil harga emas" dengan **angka tetap** `USD 2300/oz` dan kurs `15600` (data palsu yang tampak nyata), serta menampilkan nilai zakat walau tidak wajib.
- Kalender: Hijriah dihitung dari **satu tanggal acuan (26 Feb 2025)** dengan panjang bulan buatan; kunci tanggal acara dibuat dengan `toISOString()` sehingga di WIB **tersimpan mundur 1 hari**; modal hitung mundur muncul setiap kali halaman dibuka; izin notifikasi diminta saat startup; ikon notifikasi `via.placeholder.com`.
- Jadwal sholat: `confirm()` audio saat halaman dibuka, fallback diam-diam ke **Bekasi**, path audio `../../myassets/...` keluar dari `/muslimweb/`, header `User-Agent` palsu `email@example.com` ke Nominatim, `alert()` untuk error.
- Kiblat: URL Google Static Maps dengan `key=YOUR_API_KEY` (gambar selalu rusak).

**Tautan, aset, branding**
- `index.html` memuat `myasset/js/homepages.js` (folder tidak ada), `_manifest.json` dan `service-worker.js` (tidak ada → 404), Font Awesome **Pro** kit, Bootstrap 4 **dan** 5 sekaligus.
- Tautan mati: `page-about.html`, `page-profile.html`, `page-signin-email.html`, `href="#"` (sosial, kebijakan privasi, "Motivasi"), logo ke `../quranweb/`.
- Share memakai `example.com`, `alquran-digital.example.com`, `hadith-digital.example.com`, dan modal share template **"Checkout Nepro!" → orinostudio.com**.
- Metadata template "Nepro – The Multipurpose Mobile HTML5 Template", `lang="en"`, `maximum-scale=1` (zoom dikunci).
- Branding lama "Kita Berbagi Community", tautan forum kitaberbagi.com dan easydigital.co.id.
- Teks placeholder: deskripsi Haji "Professional-grade CSS extension language."; kutipan "Doa adalah senjata seorang mukmin" diatribusikan ke Abu Dawud & Tirmidzi (tidak dapat diverifikasi — dihapus; v2 mengambil ayat & hadits langsung dari API).

**Privasi & keamanan**
- **Nama dan nomor telepon pribadi** tertanam di menu profil semua halaman.
- Form "ubah kata sandi" menyimpan **kata sandi teks polos** ke `localStorage.userPassword` (v2 menghapus kunci ini saat migrasi).
- Form dukungan hanya `alert()` tanpa mengirim apa pun.

**Aset**
- 8 foto beranda (1,7–2,8 MB/foto, total ±19 MB) berukuran 1792×1024 — format khas generator gambar AI — dengan detail tidak akurat (kantong uang bersimbol `$`, Masjidil Haram yang tidak sesuai aslinya). Tidak dipakai di v2.
- ±20 MB aset template (gambar `brands/`, `persons/`, ikon pembayaran, dst.) yang tidak terkait aplikasi.

## 3. Pengujian API (24 Oktober 2026)

Diuji dari Node.js 22 (`fetch`, OpenSSL) dan curl (Schannel) dengan header `Origin: https://syamaydev.github.io`, lalu dari Chrome lewat Playwright. Respons asli direkam di [`src/test/fixtures/`](../src/test/fixtures) dan dipakai tes pemetaan.

| Endpoint | Hasil | CORS | Catatan & keputusan |
|---|---|---|---|
| `api.myquran.com/v2/sholat/kota/semua` | 200 · 518 kota · ±0,4 s | `*` | Dipakai |
| `api.myquran.com/v2/sholat/jadwal/{id}/{y}/{m}` | 200 · 31 hari, field `date` ISO · `data.id` berupa **angka** (nol di depan hilang: `"0105"` → `105`) | `*` | Dipakai. ID tidak dikenal → 400 `{status:false, message:"Data not found"}` |
| `api.myquran.com/v2/doa/{n}` & `/doa/semua` | 200 · 108 doa · **skema berubah** (`doa`, `artinya`, `latin` kosong) | `*` | Dipakai `/semua` (1 request) |
| `equran.id/api/v2/surat`, `/surat/{n}`, `/tafsir/{n}` | 200 · gzip | `*` | Sumber utama Al-Qur'an (latin, terjemahan, 6 qari) |
| `equran.id/api/surat` (v1, dipakai kode lama) | 200 | `*` | Diganti v2 (audio per ayat langsung dari sumber yang sama) |
| `equran.id/api/doa` | 200 · 227 doa + latin + dalil | `*` | Koleksi doa utama |
| `api.alquran.cloud/v1/...` | 200 · rate limit 12 req/detik | `*` | Ayat harian & cadangan detail surah (dipetakan per `numberInSurah`) |
| `cdn.islamic.network` audio | 200 `audio/mpeg` | — | Audio cadangan |
| **`api.hadith.gading.dev/books`** | **Gagal TLS handshake** — 3× via curl/Schannel (`SEC_E_ILLEGAL_MESSAGE`), 2× via Node/OpenSSL (`ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE`); HTTP biasa → 404 | — | Bukan timeout: sertifikat edge tidak tersedia. **Diganti** |
| `hadis-api-id.vercel.app/hadith…` | 200 · 9 kitab, paginasi `page/limit`, 404 JSON untuk data tidak ada | `*` | Sumber hadits utama |
| `api.myquran.com/v2/hadits/perawi`, `/{slug}/{n}`, `/arbain/semua` | 200 · dataset 9 kitab yang sama | `*` | Cadangan hadits (konkurensi maks. 4) + Arbain |
| `api.hadith.sutanlab.id` | Sertifikat kedaluwarsa | — | Tidak dipakai |
| `api.myquran.com/v2/cal/hijr/{date}` | 200 · memakai `adj: -1` | `*` | Hanya pembanding tanggal Hijriah |
| `api.aladhan.com` (gToH, calendar method 20) | 200 | `*` | Diuji, tidak dipakai (menghindari metode hitung berbeda) |
| `cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/…/xau.min.json` | 200 · bertanggal | `*` | Harga spot emas referensi (cadangan: `currency-api.pages.dev`) |
| `api.exchangerate-api.com/v4/latest/IDR` (kode lama) | 200 | `*` | Tidak dipakai — kode lama mengalikannya dengan harga emas palsu |
| `data-asg.goldprice.org` | 403 | — | Tidak dipakai |
| `nominatim.openstreetmap.org` reverse & search | 200 | `*` | Hanya atas klik pengguna, ≤ 1 req/detik, dengan atribusi |
| YouTube oEmbed (4 video lama) | 200 | — | Judul & kanal asli diverifikasi; judul lama hanya parafrase |

Pemetaan ID kota → zona waktu: ID kota myQuran berprefiks 2 digit per provinsi (34 provinsi, diverifikasi dengan mengambil satu jadwal per prefiks).

### Pemeriksaan ulang jadwal — seluruh 518 kota (24 Oktober 2026, malam)

Laporan pengguna: beranda menampilkan *"Jadwal belum bisa dimuat — format data berubah"*. Penyebabnya bug validasi
iMuslim, bukan API: ID kota dari daftar berbentuk teks 4 digit (`"0105"`), sedangkan respons jadwal mengirim angka
(`105`). Pembandingan teks `"105" !== "0105"` menolak **semua kota berawalan 0** (Aceh, Sumatra Utara, Sumatra Barat,
Riau, Kepulauan Riau, Jambi, Bengkulu, Sumatra Selatan, Bangka Belitung). Perbaikan: ID dibandingkan sebagai angka,
ID asli (`"0105"`) tetap dipakai untuk zona waktu; respons asli `0105` direkam sebagai fixture tes regresi.

Setelah perbaikan, jadwal Oktober 2026 untuk **518 kota** diambil satu per satu (jeda 400 ms, mundur otomatis saat
HTTP 429): **517 lolos validasi**. Satu-satunya yang gagal, **Kota Sofifi (3212)**, memang tidak punya data di sumber
(HTTP 400 `Data not found`); aplikasi kini menampilkannya sebagai *"Data tidak ditemukan di sumber"*, bukan galat umum.

## 4. Data pengguna lama → migrasi

`src/app/migrate-legacy.js` berjalan sekali (`imuslim:migrated`) tanpa menghapus kunci lama milik proyek lain di origin `syamaydev.github.io`:

| Kunci lama | Ke |
|---|---|
| `darkMode`, `OliveraTheme`, `theme` | `imuslim:prefs.theme` |
| `quranFontSize` | `imuslim:prefs.arabicScale` |
| `userName` (kecuali nama bawaan yang tertanam) | `imuslim:prefs.name` |
| `bookmarkedSurahs`, `lastRead` | `imuslim:quran` |
| `savedDoas` | `imuslim:doa` (koleksi myQuran) |
| `savedHadiths` (`abu-daud` → `abu-dawud`) | `imuslim:hadits` |
| `markedEvents` (kunci tanggal digeser +1 hari di zona timur UTC) | `imuslim:events` |
| `userPassword` | **dihapus** (kata sandi teks polos) |

## 5. Keterbatasan yang masih ada

- Pengingat adzan & notifikasi hanya bekerja selama iMuslim terbuka (tanpa server push).
- Tanggal Hijriah dihitung (Umm al-Qura); penetapan resmi Indonesia bisa berbeda ±1 hari — tersedia penyesuaian manual & pembanding myQuran.
- Kompas bergantung sensor perangkat; desktop umumnya tidak punya magnetometer.
- Konten agama bergantung pada API pihak ketiga; bila sumber berubah skema, validasi akan menolak data dan UI menampilkan error (bukan data tebakan).
- Deep link detail hadits (`/hadits/{kitab}/{nomor}`) dilayani lewat `404.html` di GitHub Pages: tampil normal di browser, tetapi berstatus HTTP 404 untuk crawler. Di Vercel, rewrite di `vercel.json` membuatnya berstatus 200.
- Kota Sofifi (3212) tidak memiliki data jadwal di api.myquran.com.

## 6. Deploy (pembaruan 24 Oktober 2026)

- Repositori diganti nama `muslimweb` → **`imuslim`**. Situs GitHub Pages kini di `https://syamaydev.github.io/imuslim/`;
  alamat lama `/muslimweb/` tidak dialihkan otomatis oleh GitHub Pages.
- Saat diperiksa, GitHub Pages masih menayangkan **kode sumber mentah dari branch `main`** (`index.html` Vite dengan
  `%BASE_URL%` yang belum diganti → logo rusak, aplikasi tidak berjalan). Deploy kini memakai branch **`gh-pages`**
  (seperti proyek SyamayDev lainnya): workflow mem-build dan mempublikasikan `dist/` ke branch itu setiap push ke `main`.
- Belum ada proyek Vercel untuk repositori ini di akun yang terhubung; `vercel.json` menyiapkan build, header keamanan,
  dan rewrite. Base path otomatis: `/imuslim/` (GitHub Pages) atau `/` (Vercel, `VERCEL=1`).
