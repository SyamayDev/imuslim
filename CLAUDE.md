# CLAUDE.md — iMuslim Web

Dokumen ini adalah instruksi kerja proyek. Baca seluruh dokumen ini sebelum mengubah kode. Proyek adalah aplikasi web Islami yang sudah ada dan dipublikasikan di GitHub Pages; tugasmu bukan membuat landing page baru yang menghilangkan fitur lama, melainkan mengaudit, memulihkan, memodernisasi, lalu menguji keseluruhan aplikasi.

## 1. Identitas proyek dan tujuan

- Nama produk/brand yang digunakan secara konsisten: **iMuslim**.
- Repository: `https://github.com/SyamayDev/muslimweb`
- Situs produksi: `https://syamaydev.github.io/muslimweb/`
- Hosting target utama: **GitHub Pages**, sehingga base path `/muslimweb/` harus selalu diperhitungkan.
- Stack target: **React + Vite + JSX (JavaScript)**. Jangan migrasikan ke TypeScript kecuali benar-benar diperlukan dan mendapat alasan teknis yang kuat.
- Hasil akhir harus terasa seperti produk digital Islami yang dirancang manusia: tenang, matang, elegan, mudah dipakai, cepat, konsisten, dan tidak seperti template generik hasil AI.
- Prioritas berurutan: menjaga akurasi konten dan fitur → memulihkan API/data → arsitektur React yang stabil → UX/UI dan responsivitas → aksesibilitas, performa, SEO, keamanan, dan audit Lighthouse.

## 2. Aturan kerja yang wajib

1. **Audit seluruh repository sebelum mengedit.** Mulai dari `git status --short`, branch, struktur file, dan package/config yang ada. Gunakan daftar file seperti `rg --files -g '!node_modules/**' -g '!dist/**' -g '!coverage/**' -g '!.git/**'`. Baca semua halaman HTML, JavaScript, CSS, manifest, service worker, aset, dan kode API yang relevan; jangan hanya membaca `index.html`.
2. Cari seluruh ketergantungan dan bug lama dengan pencarian seperti `fetch`, `$http`, `axios`, `XMLHttpRequest`, URL `https://`, `YOUR_API_KEY`, `example.com`, `TODO`, `href="#"`, `src=`, `localStorage`, dan path aset relatif. Buat inventaris fitur, endpoint API, skema respons, status tiap halaman, serta risiko migrasi sebelum mengganti struktur.
3. Periksa `git status` lagi sebelum mengubah file. Jangan menimpa perubahan lokal pengguna, menghapus aset sumber secara massal, menjalankan perintah destruktif, atau mengubah remote/branch. Jangan melakukan commit atau push kecuali diminta eksplisit.
4. **Jangan berhenti setelah memberi rencana atau audit.** Setelah audit singkat, implementasikan perbaikan secara nyata di workspace. Jalankan build, pengujian, dan pemeriksaan kualitas. Jika sebuah API tidak dapat dipastikan, jelaskan ketidakpastiannya dan siapkan fallback yang aman; jangan mengarang data atau klaim bahwa API sudah pulih tanpa pengujian.
5. Jangan menghapus fitur yang sudah tersedia hanya karena implementasi lamanya kurang bagus. Pindahkan atau bangun ulang fiturnya di React, verifikasi perilakunya, lalu baru hapus implementasi duplikat yang memang sudah tidak digunakan.
6. Tidak boleh ada tombol palsu, tautan mati, angka/statistik fiktif, data contoh yang tampil seolah-olah data asli, teks placeholder, atau error yang disembunyikan. Setiap fungsi yang terlihat di UI harus bekerja atau diberi penjelasan status yang jujur.
7. Bahasa UI utama adalah **Bahasa Indonesia**, format tanggal/waktu sesuai Indonesia, dan konten Arab ditampilkan dengan `lang="ar"`, `dir="rtl"`, serta tipografi yang sesuai.

## 3. Temuan awal yang wajib diverifikasi ulang

Temuan ini berasal dari pemeriksaan versi publik repository/situs. Gunakan sebagai petunjuk untuk audit lokal, bukan alasan untuk menganggap endpoint pasti mati:

- Situs masih menggunakan sejumlah halaman HTML terpisah dan implementasi lama berbasis Bootstrap, jQuery, Vue, serta CSS/JS kustom. Folder fitur yang terlihat antara lain `doa/`, `hadist/`, `jadwalsholatdanimsakiah/`, `kalender/`, `kalkulatorzakat/`, `kiblat/`, `quran/`, `setting/`, `assets/`, dan `myassets/`.
- `index.html` masih memakai metadata template “Nepro – The Multipurpose Mobile HTML5 Template”, beberapa keyword template yang tidak relevan, dan `lang="en"` meskipun konten berbahasa Indonesia.
- Carousel halaman depan pernah memuat deskripsi Haji yang tidak relevan: “Professional-grade CSS extension language.” Periksa dan perbaiki teks lain yang masih berupa placeholder atau tidak sesuai dengan topik.
- Halaman depan/footer masih menampilkan nama dan logo lama “Kita Berbagi Community”. Ganti branding tersebut dengan identitas iMuslim, kecuali suatu atribusi legal/kredit memang wajib dipertahankan; jangan meninggalkan tautan atau label merek lama yang tidak relevan.
- HTML halaman depan memuat Bootstrap melalui CDN dan juga file Bootstrap lokal; beberapa halaman lain melakukan hal serupa. Terdapat stylesheet Font Awesome berulang dan referensi Font Awesome Pro. Rapikan dependensi dan gunakan satu sistem ikon yang konsisten.
- Di akhir `index.html` lama terdapat referensi `myasset/js/homepages.js` (folder tunggal `myasset`), sedangkan file yang tampak di repository bernama `myassets/js/homepages.js` (jamak). Periksa dan perbaiki path/konfigurasi saat migrasi.
- Script jadwal sholat memakai audio path relatif `../../myassets/audio/...` dari halaman bertingkat. Verifikasi bahwa URL benar di base path GitHub Pages dan jangan mempertahankan path yang keluar dari `/muslimweb/`.
- Modul Kiblat menyusun URL Google Static Maps dengan `YOUR_API_KEY`. Jangan kirim API key palsu dan jangan menambah dependency berbayar hanya untuk peta. Kompas/arah kiblat utama seharusnya dihitung secara lokal; hapus peta yang rusak atau gunakan alternatif tanpa key bila memang berguna.
- Modul kalender lama mengonversi tanggal Hijriah memakai satu tanggal acuan tetap dan panjang bulan buatan. Itu berisiko meleset seiring waktu; ganti dengan metode/library yang dapat dijelaskan atau sumber data terverifikasi, dan jelaskan kemungkinan perbedaan dengan penetapan lokal.
- Modul jadwal sholat lama otomatis meminta konfirmasi audio saat halaman dimuat dan memakai Bekasi sebagai fallback tetap. Jangan memainkan audio otomatis. Minta izin lokasi hanya setelah pengguna menekan tombol “Gunakan lokasi saya”, sediakan pilihan kota manual, dan jangan menampilkan jadwal Bekasi seolah-olah lokasi pengguna.
- Kode halaman yang diperiksa memiliki nomor telepon pribadi hard-coded di menu profil publik. Jangan menampilkan atau menyebarkan informasi kontak pribadi di UI publik tanpa kebutuhan yang jelas; gunakan menu pengaturan/profil generik.
- Berbagi konten pada beberapa modul masih memakai URL placeholder seperti `example.com`. Semua URL share harus menggunakan URL produksi iMuslim yang benar atau mekanisme native share/copy yang berfungsi.
- Saat diperiksa, `https://api.myquran.com/v2/sholat/kota/semua` mengembalikan respons JSON dengan `status: true`, dan `https://api.alquran.cloud/v1/surah/1/ar.alafasy` mengembalikan respons JSON sukses. Permintaan pemeriksa web terhadap `https://api.hadith.gading.dev/books` timeout, sedangkan endpoint `equran.id` tidak dapat diakses oleh pemeriksa tersebut. **Ini bukan bukti tunggal bahwa API tersebut mati.** Uji kembali dari browser/runtime aplikasi sebelum memutuskan mengganti endpoint.

## 4. Arsitektur target React + Vite

Bangun struktur yang mudah dikembangkan, misalnya:

```text
src/
  app/                 # router, providers, layout
  components/          # tombol, ikon, modal, kartu, status/loading/error
  pages/               # Home, Quran, Sholat, Doa, Hadist, Kalender,
                       # Kiblat, Zakat, Pengaturan, NotFound
  features/            # komponen/domain spesifik fitur bila lebih rapi
  services/api/        # client API, endpoint, validasi response, timeout
  hooks/               # hook reusable
  utils/               # tanggal, format angka, arah kiblat, perhitungan
  styles/              # tokens, global CSS, styles per komponen bila perlu
  data/                # hanya data statis yang tervalidasi dan berlisensi
  main.jsx
public/
  brand/               # logo dan aset identitas berbasis SVG
  icons/               # ikon/PWA bila diperlukan
  manifest.webmanifest
```

Sesuaikan bila hasil audit menunjukkan struktur yang lebih cocok; jangan memaksakan struktur hanya demi menyesuaikan contoh di atas.

- Gunakan Vite dengan `base: '/muslimweb/'` untuk build produksi GitHub Pages.
- Gunakan React Router bila memang dibutuhkan. Tetapkan satu strategi routing yang cocok untuk hosting statis GitHub Pages. Pilihan yang aman adalah `HashRouter`; jika memilih URL path bersih (`BrowserRouter`), implementasikan dan uji fallback `404.html`/redirect untuk semua route. Jangan sampai route bekerja hanya saat dibuka dari beranda tetapi gagal saat direfresh atau dibuka langsung.
- Buat rute yang jelas untuk beranda, Qur’an, jadwal sholat, doa, hadits, kalender, kiblat, kalkulator zakat, pengaturan, dan halaman tidak ditemukan. Berikan navigasi yang konsisten dari desktop dan mobile.
- Gunakan komponen React dan state/hook dengan benar. Jangan mencampur Vue, jQuery, inline event-handler, dan React untuk fitur yang sama setelah migrasi selesai.
- Pilih dependency yang terawat dan seperlunya. Untuk ikon gunakan `lucide-react` dengan ikon yang tepat maknanya; jangan gunakan emoji sebagai pengganti ikon UI. Hindari menambahkan paket besar untuk fungsi sederhana.
- Gunakan `localStorage` hanya untuk preferensi dan data pengguna yang memang cocok disimpan lokal. Validasi data saat dibaca karena data lama bisa rusak atau memiliki bentuk berbeda; migrasikan bookmark, bacaan terakhir, preferensi tema, dan data/event yang masih relevan bila memungkinkan.

## 5. Identitas visual dan logo baru

Rancang identitas baru khusus untuk iMuslim. Jangan sekadar mengganti nama teks sementara masih menggunakan aset/logo lama.

- Buat logo vektor SVG buatan sendiri dengan bentuk yang sederhana, mudah dikenali pada ukuran kecil, dan bisa tampil baik pada tema terang maupun gelap. Arah visual yang dapat dieksplorasi: geometri lengkung mihrab, bulan sabit, dan buku terbuka yang disatukan secara subtil—hindari simbol yang terlalu ramai.
- Buat sekurangnya versi mark/simbol, wordmark horizontal, dan favicon/app icon. Simpan di `public/brand/` atau struktur sepadan, lalu gunakan secara konsisten di navbar, footer, halaman pengaturan, manifest, metadata, dan ikon tab browser.
- Arah visual awal: hijau zamrud/forest yang tenang, ivory hangat, aksen emas lembut secukupnya, dan warna teks gelap dengan kontras yang kuat. Gunakan CSS variables/design tokens agar palet terkelola. Silakan menyempurnakan palet secara kreatif bila hasilnya lebih bagus dan aksesibel.
- Hindari “AI slop”: jangan memakai gradient mencolok di semua komponen, glassmorphism berlebihan, efek neon/glow, ikon acak, emoji di setiap judul, animasi besar yang tidak berguna, radius seragam di semua elemen, atau layout landing page generik. Gunakan hierarchy tipografi yang jelas, ruang kosong, grid yang matang, detail visual yang terukur, dan komponen yang punya alasan fungsional.
- Hindari mengubah konten agama secara kreatif. Logo/ilustrasi boleh baru, tetapi ayat, hadits, transliterasi, terjemahan, dan atribusi sumber harus akurat.

## 6. Modul dan perilaku yang harus dipertahankan/diperbaiki

### Beranda
- Hero/welcome yang singkat dan hangat, identitas iMuslim, pintasan fitur utama, waktu sholat yang sesuai kota pilihan jika data tersedia, bacaan/motivasi terverifikasi, rekomendasi konten, dan navigasi yang jelas.
- Hilangkan nama personal/nomor telepon yang tertanam sebagai profil default, nama organisasi lama yang tidak relevan, metadata template, teks dummy, dan link placeholder.
- Gambar gunakan ukuran yang eksplisit, format efisien, alt text yang bermakna, dan lazy loading untuk konten di bawah fold.

### Al-Qur’an
- Pertahankan daftar surah, pencarian, detail surah dan ayat, teks Arab, transliterasi/terjemahan bila tersedia dari sumber valid, audio ayat/surah, bookmark/favorit, bacaan terakhir, dan copy/share.
- Hindari memuat data yang sama berulang kali. Tampilkan loading, error, tombol coba lagi, dan pesan bila audio tidak tersedia. Saat pengguna berpindah surah atau menutup player, hentikan audio sebelumnya agar tidak saling bertumpuk.
- Verifikasi mapping field dari sumber API dengan respons aktual. Jangan menyatukan array ayat dan audio berdasarkan asumsi index tanpa memeriksa jumlah dan nomor ayat.

### Jadwal sholat dan imsakiyah
- Pertahankan pemilihan kota, jadwal harian/bulanan, waktu imsakiyah, countdown bila masih digunakan, dan pengaturan audio manual jika memang bermanfaat.
- API kota yang pernah digunakan: `https://api.myquran.com/v2/sholat/kota/semua`. Endpoint jadwal lama: `https://api.myquran.com/v2/sholat/jadwal/{cityId}/{year}/{month}`. Uji bentuk respons serta zona waktu. Jangan membuat waktu sholat sendiri jika API gagal.
- Lokasi perangkat opsional dan berdasarkan tindakan eksplisit pengguna. Bila ditolak/tidak didukung, tetap berikan pencarian/pemilihan kota manual tanpa memblokir halaman.
- Jangan meminta izin audio/notifikasi saat startup. Audio hanya berjalan setelah interaksi yang jelas, dan statusnya mudah dilihat/dimatikan.

### Doa
- Pertahankan daftar doa, pencarian, detail Arab/Latin/Indonesia, sumber, pagination/favorit jika ada, serta copy/share.
- API lama mencoba mengambil `https://api.myquran.com/v2/doa/{id}` untuk rentang ID 1–108. Uji endpoint dan skema aktual. Hindari menembakkan puluhan/ratusan request sekaligus; gunakan endpoint daftar bila benar-benar tersedia, atau concurrency limit, cache, timeout, dan retry yang wajar.
- Jangan mengganti kegagalan API dengan doa buatan yang tampak autentik. Tampilkan error atau cache yang memang sebelumnya berhasil diperoleh.

### Hadits
- Pertahankan daftar kitab, paginasi rentang hadits, pencarian nomor/teks bila didukung, teks Arab, terjemahan bila tersedia, bookmark/copy/share, dan penjelasan sumber.
- API lama memakai `https://api.hadith.gading.dev/books` dan `https://api.hadith.gading.dev/books/{bookId}?range={start}-{end}`. Periksa koneksi, response status, CORS, response shape, dan status layanan. Timeout tunggal tidak cukup untuk menyimpulkan layanan mati.
- Jangan mengarang matan, arti, derajat, atau atribusi hadits. Bedakan data yang berasal dari API dan data statis yang terverifikasi.

### Kalender Masehi/Hijriah
- Pertahankan navigasi bulan/tahun, penanda tanggal/acara jika ada, dan simpan acara lokal dengan validasi.
- Jangan memakai algoritma konversi Hijriah berbasis satu tanggal acuan tetap. Gunakan library/metode terawat atau API tepercaya setelah diuji. Terangkan secara ringkas bahwa hasil Hijriah bisa berbeda satu hari sesuai rukyat/otoritas setempat.

### Kiblat
- Pertahankan perhitungan bearing menuju Ka’bah, tampilan derajat dan arah, serta indikator kompas bila hardware/browser mendukung.
- Kalkulasi bearing secara lokal dari koordinat Ka’bah yang benar. Minta geolokasi hanya setelah klik. Tampilkan manual input atau petunjuk bila lokasi/kompas ditolak, tidak tersedia, atau belum dikalibrasi.
- Tangani variasi permission/device-orientation pada browser seluler. Jangan mengklaim arah kompas magnetik akurat bila sensor tidak memberikan data. Hilangkan URL Google Maps yang menggunakan `YOUR_API_KEY` atau dependency yang tidak berfungsi.

### Kalkulator zakat
- Pertahankan kalkulator yang ada setelah memverifikasi rumus. Beri label pada jenis zakat yang dihitung, masukan, satuan mata uang, persentase, nisab/acuan, asumsi, serta hasil perhitungan.
- Jangan menetapkan nilai nisab terkini tanpa sumber dan tanggal yang dapat diverifikasi. Bila nilai nisab bergantung pada harga emas/perak terkini, tampilkan sumber/tanggal atau sediakan masukan yang dapat disesuaikan. Hasil harus dapat diperiksa ulang dan tidak menyamar sebagai fatwa personal.

### Pengaturan dan fitur umum
- Tema terang/gelap harus bekerja konsisten di semua route dan pilihan pengguna bertahan saat refresh. Hormati preferensi sistem hanya saat pengguna belum memilih preferensi sendiri.
- Periksa semua fitur lain yang ditemukan di repo (PWA/install, voice search, reminder/audio, menu navigasi, dsb.). Pertahankan bila bekerja dan relevan; bila browser tidak mendukung, tampilkan alternatif yang jelas.
- Hapus stale service worker/cache lama secara terkendali; pastikan update baru tidak terus menampilkan aset versi lama dan offline state tidak mengubah kegagalan API menjadi data palsu.

## 7. API dan manajemen data

- Buat satu lapisan client/service API yang konsisten. Setiap request harus memeriksa `response.ok`, memvalidasi bentuk JSON, menangani timeout melalui `AbortController`, dan menyediakan state `loading`, `success`, `empty`, serta `error` yang dapat dipahami pengguna.
- Jangan mengekspos API secret di browser. API publik tanpa autentikasi boleh dipanggil dari client setelah CORS, kebijakan penggunaan, dan batas pemakaiannya diperiksa. Bila provider memerlukan key rahasia, jangan menaruhnya di `VITE_*`; desain ulang atau gunakan backend yang sah bila tersedia.
- Verifikasi tiap endpoint dari runtime yang relevan: request langsung, CORS di browser, HTTP status, skema JSON, rate limit, dan kestabilan. Catat endpoint sukses/gagal, tanggal pengujian, dan bukti yang nyata. Bedakan `network/CORS`, `404`, `429`, `5xx`, timeout, dan response shape berubah.
- Jika API utama benar-benar gagal, cari alternatif yang aktif dan sesuai, uji alternatif itu, lalu adaptasikan mapping datanya secara eksplisit. Jangan hanya mengganti domain endpoint dan berharap struktur JSON sama.
- Sediakan cache lokal untuk respons publik yang layak disimpan, dengan key/version/expiry yang jelas. Jika online request gagal, cache hanya boleh digunakan ketika data cache benar-benar ada dan beri penanda bahwa data mungkin lama. Berikan tombol retry.
- Batasi concurrency dan gunakan `Promise.allSettled`/pemrosesan bertahap jika beberapa request memang diperlukan. Jangan mengirim banyak request duplikat pada setiap render.
- Jangan pernah memasukkan teks API sebagai HTML mentah melalui `dangerouslySetInnerHTML` kecuali dibutuhkan, dipercaya, dan disanitasi. Gunakan render teks React biasa.

## 8. UI, responsivitas, dan fitur fullscreen

- Desain mobile-first dan uji sedikitnya lebar 320, 360/375, 430, 768, 1024, 1280, dan 1440 piksel. Tidak boleh ada horizontal overflow, konten terpotong, sidebar yang tidak bisa ditutup, modal keluar layar, tombol terlalu kecil, atau tabel yang tidak bisa dipakai di ponsel.
- Desktop memanfaatkan ruang secara penuh dengan batas lebar konten yang disengaja; mobile memakai navigasi yang ergonomis (misalnya bottom navigation untuk fitur inti jika sesuai). Jangan membuat layout mobile seolah-olah hanya desktop yang dikecilkan.
- Gunakan ikon Lucide yang bermakna, label aksesibel, tooltip seperlunya, active states yang jelas, dan satu sistem ukuran ikon. Jangan menampilkan ikon tanpa nama/tujuan yang bisa dipahami.
- Tambahkan tombol fullscreen yang dapat ditemukan namun tidak mengganggu. Implementasikan dengan Fullscreen API pada area aplikasi yang tepat, mendukung masuk dan keluar, memperbarui label/`aria-label`, serta menangani browser yang menolak/tidak mendukung fullscreen. **Jangan** masuk fullscreen otomatis ketika halaman dibuka.
- Hormati `prefers-reduced-motion`; animasi harus singkat, fungsional, dan tidak mengganggu pembacaan.

## 9. Aksesibilitas, SEO, keamanan, dan performa

- Sasaran aksesibilitas WCAG 2.2 AA: semantik HTML, heading berurutan, label form, alt text, keyboard navigation, focus-visible yang nyata, kontras teks memadai, ukuran target sentuh nyaman, status error diumumkan secara aksesibel, dan dialog dengan fokus terkelola.
- Jangan memakai `maximum-scale=1` atau mengunci zoom. Jangan mengandalkan warna saja untuk menunjukkan status. Jangan menggunakan `div` sebagai tombol bila `<button>` tepat.
- Tambahkan metadata judul/deskripsi yang unik per halaman, canonical/OG bila sesuai, favicon baru, `lang="id"`, manifest valid, dan link internal yang benar.
- Performa: hindari request library duplikat, bundle awal terlalu besar, gambar tanpa ukuran intrinsik, font eksternal berlebihan, layout shift, render blocking yang tak diperlukan, dan animasi berat. Terapkan code-splitting per route jika masuk akal, lazy loading pada modul/visual di bawah fold, dan caching yang tepat.
- Jangan meninggalkan console error/warning yang berasal dari kode kita, mixed content, request ke path `/myassets` di luar `/muslimweb/`, link mati, API key placeholder, secret, atau data pribadi hard-coded.

## 10. Pengujian wajib dan target Lighthouse

Target yang dikejar adalah skor Lighthouse **100** untuk Performance, Accessibility, Best Practices, dan SEO pada mobile dan desktop, jika realistis untuk route dan perangkat uji yang digunakan. Skor ini adalah target yang harus diukur—**jangan pernah mengklaim 100 jika belum menjalankan pengukuran nyata**. Skor bisa dipengaruhi jaringan, API pihak ketiga, perangkat, cache, serta kondisi runner.

Sebelum menyatakan pekerjaan selesai:

1. Pastikan package scripts tersedia dan berjalan: install bersih bila memungkinkan, `npm run build`, lint, dan tests. Tambahkan automated tests yang proporsional (misalnya Vitest/React Testing Library untuk utility dan komponen penting; Playwright jika lingkungan mendukung).
2. Uji semua route: loading awal, refresh/deep link, navigasi antarfitur, empty/error/retry state, light/dark mode, storage lama/rusak, tombol fullscreen, pencarian, pagination, bookmark, audio, dan share/copy yang relevan.
3. Pastikan link dan aset internal tidak 404 baik pada root `/muslimweb/` maupun route bertingkat. Periksa console serta network di browser jika tooling tersedia.
4. Uji tampilan mobile dan desktop pada ukuran viewport yang disebutkan di atas; pastikan tidak ada horizontal scroll dan semua kontrol dapat digunakan dengan keyboard dan sentuhan.
5. Jalankan Lighthouse/CI yang tersedia pada beranda dan route utama, sekurangnya mobile dan desktop jika memungkinkan. Catat hasil aktual beserta route, mode, dan tanggal pengujian. Perbaiki audit merah/kuning yang bisa dikontrol; jangan menyembunyikan fungsi penting hanya demi skor.
6. Jika Lighthouse/browser tooling tidak tersedia di environment, selesaikan build/test yang bisa dijalankan, tandai audit yang belum dilakukan sebagai **belum terverifikasi**, dan tuliskan command yang tepat agar pengguna bisa menjalankannya lokal. Jangan memalsukan skor.
7. Tambahkan/update `README.md` dengan cara install, dev, build, test, deploy GitHub Pages, strategi routing/base path, modul yang tersedia, sumber API, serta batasan yang masih ada.

## 11. Kriteria selesai

Pekerjaan baru selesai jika:

- seluruh fitur utama yang ditemukan pada repository lama telah diinventarisasi dan dimigrasikan atau statusnya dijelaskan;
- seluruh logo, favicon, manifest, dan branding konsisten dengan iMuslim;
- tidak ada konten template/dummy, tautan placeholder, path aset salah, nomor telepon pribadi bawaan, atau `YOUR_API_KEY` yang tertinggal;
- API yang dipakai telah diuji dan diberi error/fallback UX yang benar;
- build produksi Vite berfungsi di `/muslimweb/` GitHub Pages dengan route dan aset yang valid;
- tema, keyboard, tampilan mobile/desktop, dan tombol fullscreen berfungsi;
- build, tes, console/network, serta hasil Lighthouse yang benar-benar dapat dijalankan sudah diperiksa;
- ringkasan akhir menyebutkan file/fitur yang diubah, hasil perintah test/build, endpoint yang terverifikasi, skor Lighthouse aktual (atau jelas menyatakan belum terverifikasi), dan keterbatasan yang masih tersisa.

**Mulai sekarang dengan membaca repository lengkap dan memeriksa status Git. Lanjutkan dari audit menjadi implementasi nyata. Jangan melakukan redesign halaman depan saja dan jangan berhenti dengan daftar rekomendasi.**
