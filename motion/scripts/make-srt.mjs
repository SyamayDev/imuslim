// Subtitle SRT Bahasa Indonesia untuk semua varian, diturunkan dari timeline (src/timeline.js)
// sehingga waktunya selalu sama dengan teks di layar. Film tanpa voice-over: SRT memuat teks layar.
//   node scripts/make-srt.mjs   → out/imuslim-<varian>.srt
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import content from '../src/data/content.json' with { type: 'json' };
import { montageParts, VARIANTS } from '../src/timeline.js';

const motion = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 60;
const lh = content.lighthouse;

/** Adegan pendalaman fitur reel (src/scenes/Reel.jsx): judul + tiga chip. */
const DEEP = {
  RHome: ['Mulai hari dengan tenang.', 'Sapaan & tanggal Masehi–Hijriah · Waktu sholat berikutnya + hitung mundur · Lanjutkan membaca & ayat hari ini'],
  RQuran: ['Baca, dengar, dan pahami.', 'Murattal 6 qari, per ayat atau satu surah · Terjemahan Kemenag & tafsir per ayat · Cari surah, ayat, atau dengan suara'],
  RSholat: ['Tak terlewat waktu sholat.', '517 kota · WIB, WITA, WIT · Imsakiyah bulanan + tanggal Hijriah · Pengingat adzan (opsional)'],
  RDoa: ['Doa harian, lengkap dengan sumbernya.', '335 doa dari dua koleksi · Arab, latin, arti, dan dalil · Simpan, salin, bagikan'],
  RHadits: ['9 kitab hadits & Arbain.', 'Bukhari, Muslim, Abu Dawud, dan 6 kitab lain · Lompat langsung ke nomor hadits · Simpan, salin, bagikan'],
  RKalender: ['Masehi & Hijriah berdampingan.', 'Hari besar Islam (perkiraan) · Catat acara pribadimu · Tanggal Hijriah bisa disesuaikan'],
  RZakat: ['Hitung zakat dengan jelas.', 'Penghasilan, maal, dan fitrah · Harga emas referensi atau isi sendiri · Rumus & asumsi ditampilkan'],
  RNyaman: ['Nyaman di mata, aman untuk datamu.', 'Tema terang & gelap · Bisa dipasang di layar utama · Tanpa akun, iklan, atau pelacak'],
};

/** Teks layar per adegan dalam frame lokal: [mulai, selesai, teks]. */
const CUES = {
  ...Object.fromEntries(Object.entries(DEEP).map(([k, [title, chips]]) => [k, () => [[6, 280, `${title}
${chips}`]]])),
  S11QR: (props) => [
    [24, 176, 'iMuslim · Teman ibadah harian.'],
    [176, (props.len ?? 792) - 12, `Pindai kode QR untuk membuka iMuslim — ${content.url}
Gratis · tanpa akun · tanpa iklan · langsung di browser`],
  ],
  S4: () => [[130, 286, 'iMuslim · Teman ibadah harian.']],
  S5: (props) => {
    const mp = montageParts(props);
    const A = [
      ["Al-Qur'an", 'Baca, dengar, dan renungkan — 114 surah.'],
      ['Jadwal Sholat', 'Hitung mundur ke waktu sholat berikutnya.'],
      ['Doa & Dzikir', '335 doa, lengkap dengan sumbernya.'],
      ['Hadits', '9 kitab dan Arbain An-Nawawi.'],
    ];
    const line = 'Kalender Hijriah · Arah Kiblat · Zakat · Pengaturan';
    const out = [];
    if (mp.a) A.forEach(([t, s], i) => out.push([i * mp.aLen + 8, (i + 1) * mp.aLen, `${t}\n${s}`]));
    if (mp.b) out.push([mp.a, mp.a + mp.b, line]);
    if (mp.c) out.push([mp.a + mp.b + 4, mp.a + mp.b + mp.c, mp.b ? `Semua dalam satu genggaman.\n${line}` : 'Semua dalam satu genggaman.']);
    return out;
  },
  S6: () => [
    [28, 120, content.basmalah.arab],
    [120, 272, `“${content.basmalah.translation}” (${content.basmalah.ref})\n114 surah · audio 6 qari · tafsir`],
  ],
  S7: () => [[10, 286, `Jadwal sholat 517 kota\nContoh data asli: ${content.prayer.city} · ${content.prayer.dateLabel}`]],
  S8: () => [
    [8, 190, 'Arah kiblat dari tempat Anda'],
    [190, 288, `Arah kiblat dari tempat Anda — ${String(content.qibla.bearing).replace('.', ',')}°\n${content.qibla.from} → Ka'bah · ± ${content.qibla.distanceKm.toLocaleString('id-ID')} km · dihitung langsung di perangkat`],
  ],
  S9: () => [
    [0, 108, `Kalender Hijriah — ${content.hijri.label}\n${content.hijri.gregorian} · Masehi & Hijriah berdampingan`],
    [108, 198, 'Doa & Dzikir · Hadits\n335 doa · 9 kitab + 42 Arbain'],
    [198, 288, 'Kalkulator zakat\nZakat 2,5% · Nisab 85 gram emas · Fitrah 2,5 kg beras per jiwa'],
  ],
  S10: (props, end) => [
    [6, end, `Cepat · Ringan · Tanpa iklan · Tanpa pelacak\nLighthouse (${lh.formFactor}, ${lh.url}, ${lh.measured}): Performa ${lh.scores.performance} · Aksesibilitas ${lh.scores.accessibility} · Praktik terbaik ${lh.scores.bestPractices} · SEO ${lh.scores.seo}`],
  ],
  S11: (props) => {
    const len = props.len ?? 288;
    return [[24, len - 12, `iMuslim · Teman ibadah harian. · ${content.url}\nSumber data: equran.id · api.myquran.com · hadis-api-id · OpenStreetMap`]];
  },
};

const tc = (frame) => {
  const ms = Math.round((frame / FPS) * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

await mkdir(resolve(motion, 'out'), { recursive: true });
for (const [key, v] of Object.entries(VARIANTS)) {
  const cues = [];
  for (const seg of v.segments) {
    const make = CUES[seg.scene];
    if (!make) continue;
    const off = seg.offset ?? 0;
    const end = off + seg.dur;
    for (const [f0, f1, text] of make(seg.props ?? {}, end)) {
      const a = Math.max(f0, off);
      const b = Math.min(f1, end);
      if (b - a < 54) continue; // terlalu singkat untuk dibaca
      cues.push([seg.from + a - off, seg.from + b - off, text]);
    }
  }
  cues.sort((x, y) => x[0] - y[0]);
  const srt = cues.map(([a, b, t], i) => `${i + 1}\n${tc(a)} --> ${tc(b)}\n${t}\n`).join('\n');
  const file = resolve(motion, 'out', `imuslim-${key}.srt`);
  await writeFile(file, srt, 'utf8');
  const short = cues.filter(([a, b]) => b - a < 90).length;
  console.log(`${file}: ${cues.length} cue${short ? `, ${short} di bawah 1,5 dtk` : ''}`);
}
