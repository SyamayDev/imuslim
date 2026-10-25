# Storyboard — "Cahaya yang Menuntun"

Film utama `IMuslimFilm`: 3840×2160, 60 fps, 3600 frame (60,0 detik). Tempo musik 100 BPM: 1 ketukan = 36 frame, 1 bar = 144 frame. Setiap potongan adegan jatuh tepat di awal bar. Timeline untuk video dan audio berasal dari satu berkas, `src/timeline.js`.

Animatic (satu still per shot): [`storyboard-animatic.jpg`](storyboard-animatic.jpg).

| # | Frame | Waktu | Visual | Kamera & efek | Teks layar | Audio (versi musik) |
|---|---|---|---|---|---|---|
| 1 | 0–287 | 0:00,0–0:04,8 | Langit malam, debu emas, lalu satu garis emas menyala (f48) dan membelah (f216) | Push-in lambat, bloom, grain | — | Angin malam, drone D, sub-bass riser. Ney membuka frasa Hijaz (f60), kilau dan bel di f48 |
| 2 | 288–575 | 0:04,8–0:09,6 | Garis menjadi tiga lapis kisi khatam yang tergambar sendiri, bintang delapan menyala bergantian | Kamera menembus kisi (parallax 3 lapis), sinar volumetrik, bloom (f498) | — | Arpeggio qanun (D lalu Eb, makin rapat), whoosh, riser dan reverse swell, roll darbuka 3 ketukan menuju hit |
| 3 | 576–863 | 0:09,6–0:14,4 | Roset 16 sudut berputar dan mengunci (spring), lalu morph menjadi lengkung mihrab (f688). Cahaya fajar dari dalam lengkung | Dolly-in ke dalam lengkung (f782), god-rays | — | **Hit pertama** (impact, rebana, bass) di f576. Ostinato oud Gm–Cm, dentum rebana tiap 2 ketukan, whoosh morph, bel fajar (f752) |
| 4 | 864–1151 | 0:14,4–0:19,2 | Logo tergambar dari path asli: lengkung (f872), batang (f908), buku (f930), bulan sabit (f974). Wordmark terungkap dengan kilau | Kilau specular, sinar, partikel emas | iMuslim · Teman ibadah harian. | Pad Eb menegang, riser 1 bar, satu nada qanun per bagian logo, bel sabit. Napas 0,45 dtk, lalu **hit utama** tepat di kilau (f1008) dengan akor D, glissando qanun, dan frasa ney |
| 5 | 1152–1871 | 0:19,2–0:31,2 | Montase: A) 4 kartu fitur besar (3 ketukan/kartu), B) carousel 4 fitur (1 ketukan), C) flip-book 16 layar dalam terowongan kartu (¼ ketukan) | Kartu masuk dengan perspektif, carousel 3D, terowongan berputar dengan motion blur sub-frame (6 sampel) | Al-Qur'an · Jadwal Sholat · Doa & Dzikir · Hadits · Kalender Hijriah · Arah Kiblat · Zakat · Pengaturan · "Semua dalam satu genggaman." | Groove maqsum: darbuka, riq, rebana, bass. Hook oud 4 bar dalam Hijaz. Tick + whoosh di tiap pergantian kartu. Lari qanun 16 nada menaiki tangga Hijaz, perkusi berhenti di nada ke-12 (napas) |
| 6 | 1872–2159 | 0:31,2–0:36,0 | Kartu bergaya mushaf: Basmalah muncul kata demi kata (tanpa distorsi), terjemahan, rujukan | Iris bintang, slow push | بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ · terjemahan · QS. Al-Fātiḥah [1]: 1 · "114 surah · audio 6 qari · tafsir" | **Hening yang hormat**: tanpa perkusi dan tanpa melodi, hanya pad lembut dan angin |
| 7 | 2160–2447 | 0:36,0–0:40,8 | Langit time-lapse fajar → siang → senja → malam di belakang cincin waktu yang terisi. Bintang khatam morph menjadi lingkaran | Celup ke hitam, siluet masjid, matahari melintas, bulan sabit | Jadwal sholat 517 kota · contoh data asli Kota Jakarta 24 Okt 2026 · 5 waktu sholat | Tick jam tiap ketukan, kicau burung fajar, groove ringan, melodi oud lembut |
| 8 | 2448–2735 | 0:40,8–0:45,6 | Bola bumi garis, busur lingkaran besar Jakarta → Makkah (f2540–2620), ikon Ka'bah (f2616), jarum kompas berayun lalu mengunci | Bola bumi berputar, lock dengan overshoot (spring) | Arah kiblat dari tempat Anda · 295,2° · Jakarta → Ka'bah ± 7.920 km | Whoosh, nada qanun naik mengikuti busur, bel Ka'bah, bunyi "lock" tepat saat jarum pertama mencapai sasaran |
| 9 | 2736–3023 | 0:45,6–0:50,4 | Tiga panel: kalender Hijriah (fase bulan), doa & hadits (ponsel mengipas), zakat (baris kalkulasi) | Iris bintang delapan antarpanel | Kalender Hijriah · Doa & Dzikir · Hadits · Zakat | Tiga hit kecil di f2736, f2844, f2934. Hook oud kembali, groove maqsum |
| 10 | 3024–3311 | 0:50,4–0:55,2 | Empat cincin skor Lighthouse menghitung naik, laptop & ponsel melayang | Orbit kecil, pull-out | Cepat · Ringan · Tanpa iklan · Tanpa pelacak · skor 98/100/100/100 + keterangan pengukuran | Build-up: groove saidi, nada qanun per cincin, tick hitungan, roll darbuka makin rapat, riser. Napas 18 frame sebelum penutup |
| 11 | 3312–3599 | 0:55,2–1:00,0 | Langit malam tenang, lockup logo + URL, kisi meredup, memudar ke hitam | Kamera diam, "bernapas" | iMuslim · Teman ibadah harian. · imuslim-seven.vercel.app · sumber data | Resolusi lembut: akor D, glissando turun, frasa ney penutup, lalu memudar ke hening |

## Varian

| Komposisi | Ukuran | Durasi | Susunan (frame) |
|---|---|---|---|
| `IMuslimReel` | 1080×1920 | 5400 f (90,0 dtk) | lihat tabel reel di bawah |
| `IMuslimTeaser` | 1080×1080 | 900 f (15,0 dtk) | S2 (potong) 0 · S4 144 · S5 bagian C 432 · S11 576 |
| `IMuslimIdent` | 3840×2160 | 360 f (6,0 dtk) | S2 (potong) 0 · S4 72 |

Reel dan teaser dikomposisi ulang (bukan crop). Komposisinya memakai tata letak potret/persegi tersendiri dan safe area 14% atas, 20% bawah.

## Teknik

- Empat kurva bernama (`silk`, `glide`, `dive`, `land`) di `src/lib/motion.js`, ditambah spring untuk momen mengunci (roset, kompas).
- Morph bentuk dengan `flubber`: roset → lengkung, bintang → bulan sabit, khatam → lingkaran.
- Motion blur sub-frame (`@remotion/motion-blur`) hanya pada flip-book cepat.
- Transisi: iris bintang delapan (dengan frame terakhir adegan sebelumnya dibekukan), celup ke hitam, serta morph bentuk antar-adegan (roset → lengkung, khatam → cincin).
- Setiap adegan punya ≥ 3 lapis kedalaman: kisi latar, subjek, dan partikel/debu emas depan.

## Reel Instagram 90 detik (`IMuslimReel`)

Reel adalah deliverable utama untuk Instagram. Isinya semua adegan reel 30 detik sebelumnya, adegan Basmalah dan langit sholat dari film, ditambah delapan adegan pendalaman fitur (`src/scenes/Reel.jsx`).

Setiap adegan pendalaman memakai pola yang sama:
- judul kinetik di dalam safe area atas;
- ponsel naik dari bawah dan halaman aslinya **bergulir**;
- tiga chip fitur muncul tepat di ketukan 1–3;
- satu kartu UI asli "terangkat" dari layar di ketukan 4;
- adegan keluar dengan sapuan ke atas, seperti swipe.

Semua potongan jatuh di awal bar (144 frame), sehingga musiknya berupa satu lagu utuh (`scripts/audio/song-reel.mjs`).

| Bar | Frame | Waktu | Adegan | Isi layar | Musik |
|---|---|---|---|---|---|
| 0 | 0–143 | 0:00,0–0:02,4 | S1 + S2 (potong) | Garis emas, kisi khatam | Intro: arpeggio qanun, ney, isian darbuka |
| 1–2 | 144–431 | 0:02,4–0:07,2 | S4 Logo | Logo tergambar, wordmark, "Teman ibadah harian." | Build tanpa jeda → **hit di kilau logo (f288)**, groove masuk |
| 3–5 | 432–863 | 0:07,2–0:14,4 | S5 bagian A | Kartu Al-Qur'an, Jadwal Sholat, Doa & Dzikir, Hadits | Hook A (oud) + groove maqsum penuh |
| 6–7 | 864–1151 | 0:14,4–0:19,2 | Beranda | "Mulai hari dengan tenang." + 3 chip + kartu waktu sholat berikutnya | Bait B; perkusi menurun perlahan di bar 7 |
| 8–9 | 1152–1439 | 0:19,2–0:24,0 | S6 Basmalah | QS. Al-Fātiḥah [1]: 1 + terjemahan | **Tenang tanpa perkusi**: pad, bass panjang, ostinato qanun (denyut tetap), ney |
| 10–11 | 1440–1727 | 0:24,0–0:28,8 | Al-Qur'an | "Baca, dengar, dan pahami." + kartu tafsir | Hook A kembali (crash) |
| 12–13 | 1728–2015 | 0:28,8–0:33,6 | S7 Langit sholat | Jadwal sholat 517 kota, cincin waktu | Groove ringan + detik jam + kicau fajar |
| 14–15 | 2016–2303 | 0:33,6–0:38,4 | Jadwal sholat | "Tak terlewat waktu sholat." + kartu imsakiyah | Bait B penuh |
| 16–17 | 2304–2591 | 0:38,4–0:43,2 | S8 Kiblat | Bola bumi, busur, kompas mengunci 295,2° | Jembatan C (ney memimpin), bel Ka'bah, bunyi "kunci" |
| 18–19 | 2592–2879 | 0:43,2–0:48,0 | Doa | "Doa harian, lengkap dengan sumbernya." + kartu dalil | Jembatan C → build |
| 20–21 | 2880–3167 | 0:48,0–0:52,8 | Hadits | "9 kitab hadits & Arbain." + kartu Arbain | Hook A + qanun oktaf |
| 22–23 | 3168–3455 | 0:52,8–0:57,6 | Kalender | "Masehi & Hijriah berdampingan." + kartu hari ini | Hook A2 |
| 24–25 | 3456–3743 | 0:57,6–1:02,4 | Zakat | "Hitung zakat dengan jelas." + kartu nisab | Bait B |
| 26–27 | 3744–4031 | 1:02,4–1:07,2 | Nyaman & privat | Tema terang ↔ gelap (sapuan melingkar), 3 chip | Bait B2 → build |
| 28–29 | 4032–4319 | 1:07,2–1:12,0 | S5 bagian B+C | Grid 2×2: Kalender, Kiblat, Zakat, Pengaturan muncul satu per ketukan; flip-book 8 halaman (½ ketukan) "Semua dalam satu genggaman." | Hook A, lalu lari 16 nada qanun yang **mendarat** di bar 30 |
| 30–31 | 4320–4607 | 1:12,0–1:16,8 | S10 Bukti | Cincin Lighthouse 98/100/100/100 (situs live) | Klimaks: hook A satu oktaf lebih tinggi |
| 32–37½ | 4608–5399 | 1:16,8–1:30,0 | Penutup + QR | Lockup logo → kartu **QR code** diam di tengah, URL, "Pindai untuk membuka iMuslim" | Chorus akhir (oud + ney), kadens D di f5256, akor berdering sampai memudar |

Pemeriksaan kedipan (WCAG 2.3.1) membentuk beberapa keputusan gerak di reel:
- halaman di dalam ponsel bergulir pelan (≤ 180 px CSS per adegan);
- pergantian adegan memakai geser pendek + memudar;
- QR hanya memudar masuk lalu diam;
- carousel diganti grid 2×2;
- flip-book diperlambat menjadi 8 halaman.

Sampul reel: komposisi `IMuslimReelCover` (1080×1920). Konten pentingnya berada di tengah 1080×1440, area yang tetap terlihat di grid profil 3:4.

