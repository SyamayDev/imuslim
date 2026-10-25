# MASTER PROMPT — Film Motion Graphic iMuslim (kualitas pembuka film studio besar)

> Salin seluruh isi di bawah garis ini ke Claude Opus 5 (sebaiknya Claude Code yang bisa membuka repositori ini).

---

## 1. Peran

Kamu adalah sutradara motion design sekaligus creative technologist kelas dunia, setara tim yang membuat title sequence dan studio ident film blockbuster. Kamu menguasai sinematografi, tipografi kinetik, desain suara, dan **motion graphic berbasis kode** (React + Remotion, Three.js). Kerjakan dari riset aset sampai file video final yang siap diunggah. Jangan menunggu persetujuan di setiap langkah; tanyakan pemilik hanya untuk keputusan yang benar-benar miliknya (lihat bagian 10).

## 2. Misi

Buat film motion graphic promosi untuk **iMuslim**, aplikasi web ibadah harian berbahasa Indonesia: Al-Qur'an dengan audio & tafsir, jadwal sholat & imsakiyah, doa & dzikir, hadits 9 kitab + Arbain, kalender Hijriah, arah kiblat, dan kalkulator zakat.

Kualitas produksinya harus setara pembuka film studio besar ("Marvel-level"):

- ritme montase yang makin cepat lalu menghantam tepat di ketukan;
- kedalaman 3D dan kamera virtual yang bergerak;
- cahaya emas sinematik;
- transisi presisi per frame;
- desain suara yang menyatu dengan gambar.

**"Marvel-level" adalah standar kualitas, bukan meniru merek.** Jangan memakai logo, nama, warna merah khas, huruf, musik, atau aset apa pun milik Marvel/Disney atau pihak lain.

## 3. Sumber kebenaran — baca sebelum mulai

- Repositori lokal: `C:\laragon\www\muslimweb` (GitHub: `SyamayDev/imuslim`). **Jangan mengubah kode aplikasi**; kerjakan semuanya di folder baru `motion/`.
- Situs live: <https://imuslim-seven.vercel.app> (Vercel) dan <https://syamaydev.github.io/imuslim/> (GitHub Pages).
- Aturan dan konteks: `README.md`, `docs/AUDIT.md`, `CLAUDE.md`.
- Logo:
  - berkas jadi di `public/brand/*.svg` (mark, wordmark, logo terang/gelap, ikon aplikasi);
  - sumber geometri di `scripts/brand-geometry.mjs`;
  - **path asli** di `src/components/brand/wordmark-paths.js`: `MARK_ARCH`, `MARK_STEM`, `MARK_BOOK`, `MARK_CRESCENT`, `WORDMARK_LETTERS`, `WORDMARK_CRESCENT`. Pakai path ini untuk animasi "menggambar" logo; jangan menggambar ulang dengan tangan.
- Corak:
  - `src/styles/ornaments.css` berisi SVG kisi khatam `--pattern-lattice`, bintang delapan `--pattern-star`, dan pita `--pattern-band`;
  - `src/components/ui/Ornament.jsx` berisi roset 16 sudut, lengkung mihrab, medali bintang delapan, dan kilau bintang.
- Warna & huruf: `src/styles/tokens.css`.
- Tangkapan layar UI asli: `docs/screenshots/*.webp`. Bila perlu lebih tajam atau lebih banyak, ambil ulang dari situs live dengan Playwright (`deviceScaleFactor` 2–3, `reducedMotion: 'reduce'`, mode terang & gelap). Contohnya ada di `scripts/screenshots.mjs`.

## 4. Bible merek (verifikasi dengan berkas di atas)

- **Nama:** iMuslim (i kecil, M besar). **Tagline:** "Teman ibadah harian."
- **Palet:**
  - hijau zamrud `#0F5A44` (tua `#0A4434`; gradien hero `#0D4E3B` → `#0A3F30`);
  - ivory `#F6F2E9`;
  - emas `#C3964A` dan `#E6C47E` sebagai aksen dan cahaya;
  - tinta `#16211D`;
  - mode gelap: latar `#0F1613`, hijau `#67C8A1`, emas `#E0BA70`.
- **Huruf:** Fraunces 600 untuk judul, Plus Jakarta Sans untuk UI/teks, Amiri Quran untuk teks Arab. Host sendiri lewat `@fontsource`.
- **Logo:** lengkung mihrab + bulan sabit (sekaligus titik huruf i) + buku terbuka.
- **Karakter:** tenang, matang, elegan, hangat. Megah tapi tidak norak; emas dipakai sebagai cahaya, bukan glitter.

## 5. Deliverable

1. **Film utama 16:9**: 3840×2160, 60 fps, 50–60 detik. Master ProRes 4444 (atau PNG sequence), ditambah H.264/H.265 (CRF ≤ 16) untuk diunggah.
2. **Reel vertikal 9:16**: 1080×1920, 60 fps, 25–30 detik, untuk Instagram/TikTok/Shorts. Komposisi ulang, bukan crop.
3. **Teaser 1:1**: 1080×1080, 15 detik.
4. **Ident logo**: 6 detik, 4K, untuk pembuka video lain.
5. **Loop hero web** (opsional): 8–10 detik, loop mulus, 1920×1080, WebM VP9 + MP4, ≤ 2 MB, tanpa suara.
6. **Still**: 6 frame kunci PNG 4K, ditambah thumbnail YouTube 1280×720.
7. **Audio**: stem desain suara (WAV 48 kHz/24-bit), mix final, dan subtitle **SRT** Bahasa Indonesia.
8. **`motion/README.md`**: cara render ulang, daftar aset beserta lisensinya, dan timecode.

## 6. Konsep kreatif: "Cahaya yang Menuntun"

1. Satu garis emas lahir di langit malam.
2. Garis itu tumbuh menjadi kisi geometri Islami.
3. Kisi membuka lengkung mihrab.
4. Logo iMuslim tergambar.
5. Montase cepat seluruh fitur.
6. Kembali tenang di layar ponsel pengguna.

Metaforanya: aplikasi sebagai cahaya kecil yang menuntun ibadah sehari-hari.

## 7. Storyboard film utama (±56 detik @ 60 fps; kunci ke ketukan audio)

| # | Waktu | Visual | Kamera & efek | Teks layar | Audio |
|---|---|---|---|---|---|
| 1 | 0:00–0:04 | Hitam pekat, debu emas melayang, satu garis emas menyala | Push-in lambat, depth of field dangkal, grain halus | — | Angin malam, dengung rendah, sub-bass riser |
| 2 | 0:04–0:09 | Garis membelah menjadi kisi khatam yang tersusun sendiri (stroke-draw); bintang delapan menyala bergantian | Kamera menembus 3 lapis kisi (parallax), cahaya volumetrik | — | Shimmer & whoosh berlapis, riser naik |
| 3 | 0:09–0:14 | Roset 16 sudut berputar lalu mengunci dan berubah menjadi lengkung mihrab; cahaya fajar dari dalam lengkung | Dolly-in ke dalam lengkung, god-rays, bloom emas | — | Hit pertama (impact dalam), gema |
| 4 | 0:14–0:19 | **Logo reveal**: lengkung, batang, buku, lalu bulan sabit tergambar dari path asli; wordmark muncul dengan kilau emas (specular sweep) | Logo 3D ekstrusi tipis, material emas PBR + lingkungan HDR lembut, kilau anamorfik tipis | iMuslim · Teman ibadah harian | Hit utama, tepat di kilau |
| 5 | 0:19–0:31 | **Montase flip-book**: tangkapan layar asli tiap fitur dalam bingkai medali bintang/lengkung, berganti makin cepat (1,2 detik turun ke 4 frame) | Whip-pan dengan motion blur searah gerak, parallax per kartu, cahaya emas menyapu tepi | Al-Qur'an · Jadwal Sholat · Doa · Hadits · Kalender Hijriah · Arah Kiblat · Zakat | Denyut ritmis, tick setiap kartu berganti |
| 6 | 0:31–0:35 | **Al-Qur'an**: halaman surah bergaya mushaf; teks Arab ayat **asli dari aplikasi** muncul halus, kata demi kata, tanpa distorsi | Slow push, cahaya lembut | "114 surah · audio 6 qari · tafsir" | Mereda, hening yang hormat |
| 7 | 0:35–0:39 | **Jadwal sholat**: langit time-lapse fajar → siang → senja → malam di belakang cincin hitung mundur yang terisi | Orbit kecil | "Jadwal sholat 517 kota" | Tick jam halus |
| 8 | 0:39–0:43 | **Kiblat**: bola bumi bergaya garis, busur lingkaran besar dari Indonesia ke Makkah, jarum kompas berayun lalu mengunci pada ikon Ka'bah | Tracking mengikuti busur; lock dengan sedikit overshoot (spring) | "Arah kiblat dari tempat Anda" | Swoosh, lalu bunyi "lock" lembut |
| 9 | 0:43–0:47 | Kalender Hijriah (fase bulan sabit), doa & hadits (halaman berganti), zakat (garis kalkulasi), 1,3 detik per ketukan | Split-screen geometris, wipe berbentuk bintang delapan | Kalender Hijriah · Doa & Dzikir · Hadits · Zakat | Tiga hit kecil |
| 10 | 0:47–0:51 | **Bukti kualitas**: empat cincin angka Lighthouse menghitung naik; ponsel & laptop melayang menampilkan situs | Pull-out ke komposisi perangkat | "Cepat · Ringan · Tanpa iklan · Tanpa pelacak" | Build-up |
| 11 | 0:51–0:56 | Langit malam kembali tenang; lockup logo + URL; kisi meredup | Kamera diam, "bernapas" | iMuslim · imuslim-seven.vercel.app | Resolusi lembut, hening |

**Reel 9:16 dan teaser 1:1:** susun ulang dari adegan 1–5, 8, dan 10–11 dengan tipografi lebih besar. Patuhi safe area media sosial: 14% atas dan 20% bawah bebas teks penting.

## 8. Teknik yang wajib terasa "kelas studio"

- **Ritme:** tetapkan BPM (mis. 100–110), lalu kunci setiap potongan dan hit ke grid ketukan. Percepat frekuensi potongan di montase, lalu beri "napas" tepat sebelum logo.
- **Kedalaman:** setiap adegan punya ≥ 3 lapisan z (latar kisi, subjek, partikel depan) dengan parallax. Gunakan kamera virtual (dolly, orbit, whip), bukan sekadar geser 2D.
- **Cahaya & material:**
  - bloom emas yang terkendali dan god-rays dari lengkung;
  - specular sweep pada logo;
  - debu emas (partikel dengan noise);
  - vignette dan film grain 2–3%;
  - chromatic aberration sangat tipis, hanya saat whip-pan.
- **Gerak:**
  - 3–4 kurva easing bernama, didefinisikan di satu berkas dan dipakai konsisten;
  - spring untuk momen "mengunci";
  - motion blur sub-frame, bukan blur statis;
  - tanpa gerak linear yang kaku.
- **Tipografi kinetik:** reveal per huruf/kata dengan mask, tracking yang mengembang, dan hierarki yang jelas. **Teks Arab tidak pernah dipecah per huruf.**
- **Transisi:** iris berbentuk bintang delapan, wipe lengkung mihrab, dan larutan kisi, semuanya presisi per frame.
- **Color grading:** bayangan hijau zamrud, highlight emas hangat, konsisten di semua adegan.

## 9. Teknologi & struktur

- **Remotion** (React, sejalan dengan stack situs). Paket yang disarankan (pin versinya):
  - `remotion`, `@remotion/cli`;
  - `@remotion/three` + `three` + `@react-three/fiber` untuk logo 3D dan bola bumi;
  - `@remotion/noise`, `@remotion/motion-blur`, `@remotion/transitions`, `@remotion/media-utils`;
  - huruf lewat `@fontsource/*`.
- Semua animasi **berbasis frame dan deterministik**: `useCurrentFrame`, `interpolate`, `spring`, `random(seed)`. Tanpa `Math.random()`, `Date.now()`, atau transisi CSS yang tidak sinkron dengan frame.
- **Komposisi:** `IMuslimFilm` (16:9), `IMuslimReel` (9:16), `IMuslimTeaser` (1:1), `IMuslimIdent`, `IMuslimHeroLoop`.
- **Komponen ulang-pakai:** `Lattice`, `Rosette`, `ArchMask`, `MarkDraw` (stroke-dashoffset dari path asli), `WordmarkReveal`, `ScreenCard` (bingkai perangkat + parallax), `FlipMontage`, `PrayerRing`, `QiblaGlobe`, `KineticTitle`, `GoldDust`, `LightRays`, `Grain`, `Vignette`.
- **Struktur folder:** `motion/src/{compositions,scenes,components,lib}` (termasuk `lib/easing` dan `lib/theme`), serta `motion/public/{screens,audio,fonts}`.
- **Render:** misalnya `npx remotion render IMuslimFilm out/imuslim-film-4k.mp4 --codec=h264 --crf=14`, ditambah master ProRes. Catat semua perintah di `motion/README.md`.

## 10. Audio

- Banyak Muslim menghindari alat musik. **Versi default memakai desain suara tanpa alat musik:**
  - riser, whoosh, impact, gema;
  - angin, tick jam, kicau burung fajar, ambience;
  - boleh ditambah vokal/humming atau rebana (duff) sederhana.
- Sediakan juga versi **hanya ambience** (tanpa perkusi).
- Pakai hanya suara buatan sendiri (sintesis/Web Audio) atau pustaka berlisensi jelas (CC0/royalty-free), dan catat sumber serta lisensinya. Dilarang memakai musik atau efek suara berhak cipta pihak lain.
- **Voice-over** (tanyakan pemilik apakah perlu): naskah Bahasa Indonesia ≤ 60 kata, tenang dan hangat. Jangan memasukkan bacaan ayat kecuali lisensinya jelas. Audio murattal di aplikasi berasal dari equran.id; periksa lisensinya dulu, dan bila ragu, jangan dipakai.
- **Mix:** −14 LUFS untuk unggahan media sosial, puncak ≤ −1 dBTP.

## 11. Aturan konten & kepekaan (WAJIB)

1. **Jangan mengarang** ayat, hadits, terjemahan, waktu sholat, atau angka.
   - Teks agama diambil persis dari aplikasi/API (equran.id, api.myquran.com) dan ditampilkan bersama rujukannya, mis. "QS. Al-Fatihah [1]: 1". Bandingkan per karakter dengan sumbernya.
   - Angka hanya dari `README.md`/`docs/AUDIT.md`: 114 surah, 6 qari, 517 dari 518 kota, 227 + 108 doa, 9 kitab + 42 Arbain, dan Lighthouse 100 di keempat kategori (diukur pada build produksi, 24 Oktober 2026).
   - Ukur ulang Lighthouse di situs live sebelum menampilkannya. Bila hasilnya berbeda, tampilkan angka live yang sebenarnya atau hilangkan adegan itu.
2. **Hormati teks suci.** Teks Arab Al-Qur'an dan lafaz Allah tidak boleh:
   - di-glitch, dipecah, dibalik, atau diregangkan;
   - dijadikan partikel atau terpotong tepi frame;
   - dipotong oleh ketukan perkusi.

   Teks itu tampil tegak dan utuh, dengan transisi lembut.
3. **Tanpa makhluk bernyawa**: tidak ada wajah atau sosok manusia, hewan, nabi, maupun malaikat. Ka'bah hanya berupa ikon kubus sederhana berpita emas seperti di aplikasi, bukan foto.
4. **Aksesibilitas:**
   - tidak ada kilatan/kedipan luminans besar lebih dari 3 kali per detik (WCAG 2.3.1), termasuk di montase cepat;
   - kontras teks ≥ 4,5 : 1;
   - setiap teks layar bertahan ≥ 1,5 detik;
   - subtitle SRT lengkap.
5. **Merek:** hanya identitas iMuslim. Tidak ada logo, nama, atau aset pihak lain, kecuali atribusi sumber data di akhir (equran.id, myQuran, dll.) bila ditampilkan.
6. **Bahasa layar:** Bahasa Indonesia baku (KBBI/EYD) dengan istilah "Al-Qur'an", "sholat", "kiblat", "Hijriah".

## 12. Proses kerja

1. **Riset (±10%).** Baca sumber kebenaran, lalu tulis `motion/BRAND_BIBLE.md` berisi palet, huruf, path logo, corak, serta angka yang boleh dipakai beserta sumbernya.
2. **Treatment & storyboard (±10%).** Tulis `motion/STORYBOARD.md`: tabel shot dengan timecode frame, kamera, efek, teks, dan audio. Sertakan animatic sederhana (satu still per shot).
3. **Build (±50%).** Implementasikan komponen dan adegan di Remotion; jaga 60 fps saat preview.
4. **Audio (±15%).** Buat desain suara dan mix, sinkron dengan ketukan.
5. **QA & render (±15%).** Render contact sheet (satu still per detik), lalu periksa:
   - tidak ada teks terpotong atau salah ketik;
   - logo memakai path asli;
   - warna sesuai token;
   - tidak ada flicker;
   - safe area benar;
   - teks Arab utuh dan sama persis dengan sumbernya.

   Perbaiki temuannya, lalu render final semua deliverable.

**Tanyakan pemilik hanya untuk:** URL final yang ditampilkan, perlu-tidaknya voice-over, dan pilihan versi audio. Selain itu, ambil keputusan sendiri dan catat alasannya.

## 13. Kriteria selesai

- Semua deliverable ada di `motion/out/`. Durasi, resolusi, fps, codec, ukuran berkas, dan loudness yang dilaporkan adalah **hasil ukur sebenarnya** (ffprobe / ebur128), bukan perkiraan.
- Laporan akhir berisi:
  - daftar berkas dan cara render ulang;
  - sumber dan lisensi semua aset & suara;
  - daftar teks agama yang tampil beserta rujukannya;
  - hal yang belum bisa dipastikan.
- Tidak ada aset atau merek pihak lain, tidak ada data karangan, dan tidak ada kode aplikasi iMuslim yang diubah.

Mulai sekarang dari langkah 1.
