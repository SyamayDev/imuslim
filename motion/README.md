# iMuslim — film motion graphic & reel Instagram

Video promosi **"Cahaya yang Menuntun"** untuk iMuslim, dibuat dengan [Remotion](https://www.remotion.dev/) (React). Proyek ini terpisah dari aplikasi. Kode aplikasi tidak diubah dan folder ini tidak ikut build situs.

Deliverable utama adalah **reel Instagram 9:16 berdurasi 90 detik**, lengkap dengan musik, QR code di akhir, sampul potret, dan caption.

- Konsep, palet, huruf, angka beserta sumbernya, dan aturan teks agama: [`BRAND_BIBLE.md`](BRAND_BIBLE.md)
- Shot per shot dengan timecode frame: [`STORYBOARD.md`](STORYBOARD.md), animatic reel [`storyboard-reel-animatic.jpg`](storyboard-reel-animatic.jpg), dan animatic film [`storyboard-animatic.jpg`](storyboard-animatic.jpg)
- Brief asli: [`../docs/MASTERPROMPT-MOTION.md`](../docs/MASTERPROMPT-MOTION.md)

## Hasil (folder `out/`)

`out/` tidak disimpan di Git karena ukurannya besar. Semua angka di bawah adalah **hasil ukur** dari berkas final: ffprobe, filter loudnorm ffmpeg (EBU R128), dan `scripts/qa.mjs`, diukur 25 Oktober 2026. Data mentahnya ada di `out/qa-report.json`.

### Reel Instagram (yang dipakai)

| Berkas | Video | Durasi | Ukuran | Audio | Loudness | Kedipan (WCAG 2.3.1) |
|---|---|---|---|---|---|---|
| `imuslim-reel-1080x1920.mp4` | 1080×1920 · 60 fps · H.264 High yuv420p · 10,4 Mbps | 90,0 dtk | 117,5 MB | AAC 48 kHz stereo 336 kbps · versi **musik** | −14,16 LUFS · −1,47 dBTP · LRA 1,7 | area terburuk 1,61% → lolos |
| `imuslim-reel-1080x1920-30fps.mp4` | 1080×1920 · 30 fps · 10,5 Mbps | 90,0 dtk | 118,2 MB | sama | −14,16 LUFS · −1,47 dBTP | 1,12% → lolos |
| `imuslim-reel-1080x1920-tanpa-alat-musik.mp4` | sama dengan versi 60 fps | 90,0 dtk | 117,3 MB | desain suara + rebana | −14,11 LUFS · −1,37 dBTP · LRA 4,8 | video identik |

- **Sampul potret:** `imuslim-reel-cover-1080x1920.png` / `.jpg`. Konten penting berada di tengah 1080×1440 sehingga tetap utuh di grid profil 3:4.
- **Caption:** `caption-instagram.txt`.
- **Subtitle:** `imuslim-reel.srt` (23 cue).
- **QR code** mengarah ke `https://imuslim-seven.vercel.app/` (situs dicek: HTTP 200). Kode ini di-decode dengan jsQR langsung dari frame **video final** (`node scripts/verify-qr.mjs out/imuslim-reel-1080x1920.mp4`) dan terbaca di **30 dari 30** uji: detik 80,3–89,5, lebar frame 1080/540/360 px, versi 60 dan 30 fps. Artinya QR bisa dipindai sekitar 9 detik di akhir video.
- **Audio & stem reel:** `audio/imuslim-reel-{musik,tanpa-alat-musik,ambience}.wav` dan `audio/stems/imuslim-reel-stem-{musik,perkusi,efek,ambience}.wav` (48 kHz/24-bit).
- **Kurva loudness per bar** (`node scripts/audio/curve.mjs out/audio/imuslim-reel-musik.wav`): bar 0–36 berada di −15,9 s.d. −13,1 LUFS (yang paling pelan adalah intro). Penurunan antarbar terbesar 3,9 LU, dan itu hanya terjadi di fade akhir (bar 37).

Untuk Instagram, pakai versi 30 fps bila ingin hasil paling konsisten (Instagram umumnya memutar reel di 30 fps). Versi 60 fps lebih halus bila diputar langsung.

### Deliverable lain

| Berkas | Hasil ukur |
|---|---|
| `imuslim-ident-4k.mp4` (+ `-tanpa-alat-musik`) | 3840×2160 · 60 fps · 6,0 dtk · 25,1 MB · −13,7 LUFS · −1,52 dBTP · kedipan 0% |
| `imuslim-hero-1080p.mp4` / `.webm` | 1920×1080 · 60 fps · 9,0 dtk · 1,8 MB / 1,7 MB · tanpa suara · loop mulus · kedipan 0% |
| `stills/` | 6 still 3840×2160 PNG + thumbnail YouTube 1280×720 |
| `arsip-v1/` | film 60 dtk 16:9 & teaser 1:1 versi sebelumnya. **Belum** memuat perbaikan kedipan di flip-book dan musik baru. Baca `arsip-v1/BACA-DULU.txt` |
| `master/` | master ProRes 422 HQ (reel 5,1 GB, ident 1,4 GB, hero 0,5 GB) untuk penyuntingan ulang; boleh dihapus bila tidak perlu |

## Render ulang

Butuh Node 22+. ffmpeg tidak perlu dipasang terpisah karena skrip memakai ffmpeg bawaan Remotion.

```bash
cd motion
npm install

npm run assets   # salin logo/SVG & data dari aplikasi, ambil ulang tangkapan layar, buat tekstur grain
npm run audio    # sintesis musik & efek → out/audio/*.wav (+ stem), dinormalisasi −14 LUFS / ≤ −1 dBTP
node scripts/capture-extra.mjs     # tangkapan layar halaman panjang + tafsir (untuk reel)
node scripts/make-qr.mjs           # matriks QR → src/data/qr.json
node scripts/render-all.mjs reel   # REEL 90 dtk → master ProRes + MP4 60 fps & 30 fps (audio di-mux)
node scripts/make-stills.mjs cover # sampul reel 1080×1920 (PNG + JPG)
node scripts/verify-qr.mjs out/imuslim-reel-1080x1920.mp4   # bukti QR terbaca dari video final
npm run render   # semua varian: film, reel, teaser, ident
node scripts/render-all.mjs hero   # loop hero web (MP4 + WebM, tanpa suara)
node scripts/make-srt.mjs          # subtitle SRT per varian
node scripts/make-stills.mjs       # 6 still 4K + thumbnail YouTube
node scripts/make-animatic.mjs reel   # animatic (satu still per shot) dari video hasil render
npm run qa       # ffprobe + loudness (EBU R128) + cek kedipan WCAG → out/qa-report.json
                 # (bisa disaring: node scripts/qa.mjs imuslim-reel)
npm run studio   # pratinjau interaktif di Remotion Studio
```

Opsi lain `render-all.mjs`:

- `--frames=0-119 --out=<folder>`: uji cepat sebagian frame;
- `--encode-only`: encode/mux ulang tanpa render Remotion;
- `--patch=a-b`: render ulang frame a..b saja lalu disambung ke master yang ada. Ini aman karena ProRes intra-frame, dan jumlah frame diverifikasi.

Alur render:

1. Remotion merender frame PNG ke master ProRes. Film memakai ProRes 4444 4K; varian lain ProRes 422 HQ.
2. ffmpeg meng-encode master menjadi H.264 High (yuv420p, BT.709, CRF 14, preset `slow`) dan me-mux audio AAC 320 kbps.
3. Versi audio lain menyalin stream video yang sama (`-c:v copy`) sehingga gambarnya identik bit per bit.

Waktu render terukur di laptop 32 thread: film 4K 19,4 menit, reel 90 detik 6,5 menit (+ encode ±1,5 menit).

## Struktur

```text
src/
  timeline.js        satu sumber timeline untuk video DAN audio (frame, BPM, segmen varian, cue)
  Root.jsx           komposisi: IMuslimReel, IMuslimFilm, IMuslimTeaser, IMuslimIdent, IMuslimHeroLoop,
                     IMuslimReelCover (still)
  compositions/      Cut.jsx (perakit adegan + transisi iris/celup), HeroLoop.jsx, ReelCover.jsx
  scenes/            Opening (1–4), Montage (5), Features (6–9), Finale (10–11),
                     Reel (pendalaman fitur reel + penutup QR)
  components/        Atmosphere (latar, debu emas, sinar, bloom, grain), Ornaments (kisi, roset, iris,
                     morph), Brand (Mark & Wordmark dari path asli), UI (tipografi kinetik, ponsel, laptop)
  lib/               theme (token warna/huruf), motion (BPM & 4 kurva easing), geometry, fonts, layout
  data/content.json  semua teks/angka yang tampil, beserta sumbernya (dibuat oleh npm run assets)
  data/qr.json       matriks QR penutup reel (dibuat oleh scripts/make-qr.mjs)
  brand/paths.js     path logo asli (disalin dari aplikasi)
public/              brand/ (SVG), screens/ (tangkapan layar asli aplikasi), textures/ (grain)
scripts/
  audio/             dsp, instruments, song-reel (lagu utuh reel), score (partitur per adegan untuk film/teaser/
                     ident), loudness, render-audio, curve, spectrogram, bands, selftest
  render-all.mjs, make-srt.mjs, make-stills.mjs, make-animatic.mjs, make-qr.mjs, verify-qr.mjs, qa.mjs,
  flash-map.mjs (peta panas kedipan), render-stills.mjs (lembar kontak QA), capture-screens.mjs,
  capture-extra.mjs, sync-assets.mjs, make-textures.mjs, ffmpeg-bin.mjs
```

## Audio

Semua bunyi **disintesis dari nol** dengan JavaScript (`scripts/audio/`). Tidak ada sampel, loop, atau musik pihak lain.

- **Instrumen:**
  - oud & qanun (senar dipetik Karplus-Strong, senar ganda oud sedikit sumbang, EQ badan kayu);
  - ney (seruling napas dengan portamento & vibrato);
  - darbuka (dum/tek/ka), rebana/daf (dentum & kerincingan), riq, tepuk tangan, bass, pad gesek, drone.
- **Efek:** impact, riser, reverse swell, whoosh stereo, bel FM, tick jam, kilau, kicau burung fajar, angin.
- **Reel 90 detik: satu lagu utuh** (`scripts/audio/song-reel.mjs`) dalam maqam **Hijaz pada D**, 100 BPM, 37,5 bar.
  - Strukturnya intro → build → chorus (hook oud) → bait → jeda tenang → chorus → jembatan (ney) → chorus → lari qanun → klimaks → chorus akhir → kadens.
  - Groove *maqsum* (darbuka, riq, rebana, tepuk, bass sinkopasi) tidak pernah berhenti mendadak.
  - Saat Basmalah, perkusi turun perlahan selama satu bar. Pad, bass panjang, dan ostinato qanun menjaga denyut sementara ney melantun, tanpa perkusi di atas teks ayat.
  - Setiap klimaks mendarat di ketukan berikutnya, tidak jatuh ke hening.
  - Efek suara dikunci ke gambar: hit di kilau logo f288, "pop" tiap chip fitur tepat di ketukan, bunyi "kunci" kompas, dan denting saat QR muncul.
- **Film/teaser/ident:** memakai partitur per adegan (`score.mjs`). Adegan Al-Qur'an di film tanpa perkusi dan melodi.
- **Tiga versi mix per varian:**
  - `musik`: pilihan pemilik, dengan instrumen bernuansa Islami;
  - `tanpa-alat-musik`: versi bawaan brief, berisi desain suara, rebana sederhana, dan ambience;
  - `ambience`: tanpa perkusi dan tanpa impact.
- **Mastering:**
  - EQ (high-pass 32 Hz, low-shelf −3,5 dB di 100 Hz, presence +2 dB di 3 kHz);
  - kompresor bus 2:1;
  - limiter look-ahead berbasis true-peak (interpolasi sinc 4×);
  - normalisasi ke −14 LUFS dengan puncak −1,6 dBTP sebelum AAC.
- **Stem film & reel** (WAV 48 kHz/24-bit, pra-master, skala sama dengan mix musik): `out/audio/stems/` berisi musik, perkusi, efek, dan ambience.

Pemeriksaan tanpa mendengar: `node scripts/audio/selftest.mjs` (penalaan tiap instrumen ±3 sen), `node scripts/audio/bands.mjs <wav>` (energi per oktaf), dan `node scripts/audio/spectrogram.mjs <wav> film <png>`.

## Aset & lisensi

| Aset | Sumber | Lisensi |
|---|---|---|
| Logo, wordmark, SVG merek | aplikasi iMuslim (repo ini) | milik proyek |
| Tangkapan layar aplikasi | diambil otomatis dari build lokal aplikasi (`scripts/capture-screens.mjs`) | milik proyek |
| Teks QS. Al-Fātiḥah [1]: 1 (Arab, terjemahan) | API publik equran.id | teks ditampilkan apa adanya, dengan rujukan |
| Jadwal sholat contoh (Kota Jakarta, 24-10-2026) | respons asli api.myquran.com | data publik |
| Peta bola bumi | `world-atlas` 2.0.2 (Natural Earth 1:110m) | ISC; data Natural Earth domain publik |
| Huruf Fraunces, Plus Jakarta Sans, Amiri Quran | Fontsource | SIL Open Font License 1.1 |
| Musik & efek suara | disintesis sendiri (`scripts/audio/`) | milik proyek |
| Grain film | dibuat sendiri (`scripts/make-textures.mjs`) | milik proyek |
| Remotion 4.0.538 | npm | [Remotion License](https://www.remotion.dev/license): gratis untuk perorangan & organisasi ≤ 3 orang; perusahaan lebih besar perlu lisensi perusahaan |
| flubber, d3-geo, topojson-client | npm | MIT / ISC |
| lucide-react 1.61.0 (ikon chip fitur), qrcode 1.5.4, jsqr 1.4.0 (uji QR) | npm | ISC / MIT / Apache-2.0 |

Murattal (bacaan ayat) **tidak** dipakai karena lisensi audio qari di equran.id tidak dapat dipastikan. Film juga tanpa voice-over.

## Teks agama yang tampil

| Teks | Rujukan | Di mana |
|---|---|---|
| بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ dan terjemahan "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang." | QS. Al-Fātiḥah [1]: 1 (equran.id) | Adegan 6 film (f1900–2159) |
| Tangkapan layar aplikasi: halaman surah Yasin (Basmalah & nama surah), doa sebelum tidur, hadits Arbain no. 1 | dirender aplikasi dari equran.id / myquran / hadis-api-id | kartu Al-Qur'an, Doa, Hadits di montase dan panel adegan 9 |
| Reel: halaman surah Yasin & Al-Fātiḥah ayat 2 dengan tafsir Kemenag, doa sebelum tidur + dalil, daftar kitab hadits & Arbain | tangkapan layar aplikasi (data API asli saat diambil) | adegan pendalaman fitur reel; Basmalah di bar 8–9 |

Aturan yang diterapkan (lihat juga [`BRAND_BIBLE.md`](BRAND_BIBLE.md)):

- teks Arab hanya muncul kata demi kata, tanpa blur atau distorsi;
- layar yang memuat teks agama tidak diberi blur dan tidak pernah tampil cermin;
- flip-book cepat hanya memakai layar tanpa ayat atau lafaz Allah.

## Keputusan yang diambil sendiri

- **Durasi film 60,0 detik.** Ini batas atas brief (50–60 detik). Pilihan ini mengikuti grid 25 bar pada 100 BPM.
- **Skor Lighthouse di film = situs live** (98/100/100/100, ponsel, 25 Oktober 2026), lengkap dengan keterangan di layar. Skor 100/100/100/100 di README utama diukur pada build lokal. Film tidak mencampur keduanya.
- **Reel 90 detik** (permintaan pemilik). Semua adegan reel 30 detik sebelumnya dipertahankan, lalu ditambah adegan Basmalah, langit sholat, delapan adegan pendalaman fitur, dan penutup ber-QR. Setiap potongan jatuh di awal bar.
- **Gerak yang aman untuk mata (WCAG 2.3.1).** Pemeriksaan kedipan membentuk beberapa keputusan:
  - halaman di dalam ponsel bergulir pelan;
  - pergantian adegan memakai geser pendek + memudar;
  - QR hanya memudar masuk lalu diam;
  - carousel di format potret diganti grid 2×2;
  - flip-book potret dibuat 8 halaman (½ ketukan);
  - cincin kartu terowongan diredupkan dan putarannya dipelankan.
- **Tiga versi audio.** Pemilik meminta musik dengan instrumen Islami, sedangkan brief meminta versi bawaan tanpa alat musik. Keduanya dibuat, ditambah versi ambience.
