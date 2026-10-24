// Langkah pasca-build untuk GitHub Pages (static hosting tanpa rewrite SPA):
//  1. Salin index.html ke setiap route statis (/quran/index.html, /sholat/index.html, …)
//     dengan <title>, deskripsi, canonical, dan og:url yang sesuai → route bisa dibuka
//     langsung & di-refresh dengan status HTTP 200.
//  2. Prerender judul untuk 114 halaman surah (/quran/1 … /quran/114).
//  3. 404.html = salinan aplikasi (noindex) untuk route dinamis lain (doa/hadits detail)
//     dan alamat yang memang tidak ada — router menampilkan halaman yang tepat.
//  4. Alamat lama (jadwalsholatdanimsakiah, hadist, kalkulatorzakat, setting) tetap 200
//     lalu dialihkan di klien, canonical menunjuk ke alamat baru.
//  5. sitemap.xml, robots.txt, .nojekyll, dan BUILD_ID untuk service worker.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const SITE = 'https://syamaydev.github.io/muslimweb';
const surahIndex = JSON.parse(await readFile(resolve(root, 'src/data/surah-index.json'), 'utf8'));

export const ROUTES = [
  { path: '/', title: 'iMuslim — Teman Ibadah Harian', description: null },
  {
    path: '/quran',
    title: "Al-Qur'an Digital · iMuslim",
    description: "Baca 114 surah Al-Qur'an dengan teks Arab, transliterasi latin, terjemahan Kemenag, tafsir, dan audio murattal 6 qari. Simpan bookmark dan lanjutkan bacaan terakhir.",
  },
  {
    path: '/sholat',
    title: 'Jadwal Sholat & Imsakiyah · iMuslim',
    description: 'Jadwal sholat harian dan imsakiyah bulanan untuk 500+ kota/kabupaten di Indonesia, lengkap dengan hitung mundur waktu sholat berikutnya.',
  },
  {
    path: '/doa',
    title: 'Doa & Dzikir · iMuslim',
    description: 'Kumpulan doa harian dan dzikir lengkap dengan teks Arab, latin, terjemahan, serta keterangan sumber. Cari, simpan, salin, dan bagikan.',
  },
  {
    path: '/hadits',
    title: 'Hadits 9 Kitab & Arbain · iMuslim',
    description: 'Baca hadits dari 9 kitab (Bukhari, Muslim, Abu Dawud, Tirmidzi, Nasai, Ibnu Majah, Ahmad, Malik, Darimi) dan Arbain An-Nawawi dengan terjemahan Indonesia.',
  },
  {
    path: '/kalender',
    title: 'Kalender Masehi & Hijriah · iMuslim',
    description: 'Kalender Masehi dan Hijriah berdampingan, perkiraan hari besar Islam, serta catatan acara pribadi yang tersimpan di perangkat.',
  },
  {
    path: '/kiblat',
    title: 'Arah Kiblat · iMuslim',
    description: "Hitung arah kiblat dari lokasi Anda ke Ka'bah, lengkap dengan derajat, jarak, dan kompas perangkat bila didukung.",
  },
  {
    path: '/zakat',
    title: 'Kalkulator Zakat · iMuslim',
    description: 'Hitung zakat penghasilan, zakat maal, dan zakat fitrah dengan rumus yang transparan dan nilai acuan yang dapat Anda sesuaikan.',
  },
  { path: '/pengaturan', title: 'Pengaturan · iMuslim', description: 'Atur tema, ukuran teks Arab, qari, kota jadwal sholat, pengingat adzan, dan data lokal iMuslim.' },
  { path: '/tentang', title: 'Tentang & Sumber Data · iMuslim', description: 'Tentang iMuslim, sumber data API yang dipakai, metode perhitungan, privasi, dan kredit.' },
];

const LEGACY = [
  { path: '/jadwalsholatdanimsakiah', canonical: '/sholat' },
  { path: '/hadist', canonical: '/hadits' },
  { path: '/kalkulatorzakat', canonical: '/zakat' },
  { path: '/setting', canonical: '/pengaturan' },
];

const DEFAULT_DESC =
  "iMuslim: Al-Qur'an digital dengan audio, jadwal sholat & imsakiyah, doa, hadits, kalender Hijriah, arah kiblat, dan kalkulator zakat dalam satu aplikasi web yang ringan.";

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function withMeta(html, { title, description, canonical, noindex = false }) {
  const desc = esc(description ?? DEFAULT_DESC);
  // GitHub Pages mengalihkan /folder → /folder/ (301), jadi canonical memakai garis miring akhir.
  const url = `${SITE}${canonical === '/' ? '/' : `${canonical}/`}`;
  let out = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s, `$1${desc}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/s, `$1${desc}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  if (noindex) out = out.replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>');
  return out;
}

// ---------- Preload per route (mengurangi rantai muat SPA) ----------
const BASE_PATH = '/muslimweb/';
const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'));
const assetFiles = await readdir(resolve(dist, 'assets'));
const findAsset = (re) => assetFiles.find((f) => re.test(f));

function pageModuleFor(path) {
  if (path === '/') return 'src/pages/Home.jsx';
  const [a, b, c] = path.split('/').filter(Boolean);
  const map = {
    quran: b ? 'src/pages/quran/SurahPage.jsx' : 'src/pages/quran/QuranIndex.jsx',
    sholat: 'src/pages/Sholat.jsx',
    jadwalsholatdanimsakiah: 'src/pages/Sholat.jsx',
    doa: b ? 'src/pages/doa/DoaDetail.jsx' : 'src/pages/doa/DoaIndex.jsx',
    hadits: c ? 'src/pages/hadits/HaditsDetail.jsx' : b ? 'src/pages/hadits/HaditsBook.jsx' : 'src/pages/hadits/HaditsIndex.jsx',
    hadist: 'src/pages/hadits/HaditsIndex.jsx',
    kalender: 'src/pages/Kalender.jsx',
    kiblat: 'src/pages/Kiblat.jsx',
    zakat: 'src/pages/Zakat.jsx',
    kalkulatorzakat: 'src/pages/Zakat.jsx',
    pengaturan: 'src/pages/Pengaturan.jsx',
    setting: 'src/pages/Pengaturan.jsx',
    tentang: 'src/pages/Tentang.jsx',
  };
  return map[a] ?? null;
}

function collect(key, files, css, seen = new Set()) {
  if (seen.has(key) || !manifest[key]) return;
  seen.add(key);
  const m = manifest[key];
  files.add(m.file);
  (m.css ?? []).forEach((c) => css.add(c));
  (m.imports ?? []).forEach((k) => collect(k, files, css, seen));
}

const entryFiles = new Set();
const entryCss = new Set();
collect('index.html', entryFiles, entryCss);

const FONT_UI = findAsset(/^plus-jakarta-sans-latin-wght-normal-.*\.woff2$/);
const FONT_DISPLAY = findAsset(/^fraunces-latin-600-normal-.*\.woff2$/);
const FONT_ARABIC = findAsset(/^amiri-quran-arabic-400-normal-.*\.woff2$/);
if (!FONT_UI || !FONT_DISPLAY || !FONT_ARABIC) throw new Error('Berkas font utama tidak ditemukan di dist/assets');

function preloadTags(path) {
  const tags = [];
  const font = (f) => tags.push(`<link rel="preload" href="${BASE_PATH}assets/${f}" as="font" type="font/woff2" crossorigin />`);
  font(FONT_UI);
  font(FONT_DISPLAY);
  if (/^\/(quran\/\d+|doa\/[^/]+\/\d+|hadits\/[^/]+)/.test(path)) font(FONT_ARABIC);
  const page = pageModuleFor(path);
  if (page) {
    const files = new Set();
    const css = new Set();
    collect(page, files, css);
    for (const c of css) if (!entryCss.has(c)) tags.push(`<link rel="stylesheet" crossorigin href="${BASE_PATH}${c}" />`);
    for (const f of files) if (!entryFiles.has(f)) tags.push(`<link rel="modulepreload" crossorigin href="${BASE_PATH}${f}" />`);
  }
  return tags.map((t) => `    ${t}`).join('\n');
}

async function writeRoute(path, html) {
  const file = path === '/' ? resolve(dist, 'index.html') : resolve(dist, `.${path}`, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html.replace('</head>', `${preloadTags(path)}\n  </head>`));
}

const template = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!template.includes('<div id="root">')) throw new Error('dist/index.html tidak valid');

for (const r of ROUTES) await writeRoute(r.path, withMeta(template, { title: r.title, description: r.description, canonical: r.path }));

for (const s of surahIndex.surahs) {
  await writeRoute(
    `/quran/${s.number}`,
    withMeta(template, {
      title: `Surah ${s.latin} (${s.meaning}) · Al-Qur'an · iMuslim`,
      description: `Baca Surah ${s.latin} (${s.name}) — ${s.meaning}, ${s.ayahCount} ayat, ${s.place}. Teks Arab, latin, terjemahan, tafsir, dan audio murattal.`,
      canonical: `/quran/${s.number}`,
    }),
  );
}

// Route dinamis yang jumlahnya kecil & stabil juga dibuatkan HTML agar tautan bagikan
// berstatus 200 (judul detail diperbarui di klien). Jumlah sesuai audit API 24-10-2026;
// item baru di luar rentang ini tetap berfungsi lewat 404.html.
const HADITH_BOOKS = {
  'abu-dawud': 'Abu Dawud',
  ahmad: 'Ahmad',
  bukhari: 'Bukhari',
  darimi: 'Darimi',
  'ibnu-majah': 'Ibnu Majah',
  malik: 'Malik',
  muslim: 'Muslim',
  nasai: 'Nasai',
  tirmidzi: 'Tirmidzi',
};
const DYNAMIC = [];
for (const [slug, name] of Object.entries(HADITH_BOOKS)) {
  DYNAMIC.push({ path: `/hadits/${slug}`, title: `Hadits ${name} · iMuslim`, description: `Baca hadits riwayat ${name} dengan teks Arab dan terjemahan Indonesia.` });
}
DYNAMIC.push({ path: '/hadits/arbain', title: 'Hadits Arbain An-Nawawi · iMuslim', description: '42 hadits Arbain An-Nawawi dengan teks Arab dan terjemahan Indonesia.' });
for (let i = 1; i <= 42; i++) {
  DYNAMIC.push({ path: `/hadits/arbain/${i}`, title: `Hadits Arbain An-Nawawi No. ${i} · iMuslim`, description: `Hadits Arbain An-Nawawi nomor ${i} dengan teks Arab dan terjemahan Indonesia.` });
}
for (let i = 1; i <= 227; i++) {
  DYNAMIC.push({ path: `/doa/equran/${i}`, title: 'Doa & Dzikir · iMuslim', description: 'Doa dengan teks Arab, latin, terjemahan, dan keterangan dalil dari equran.id.' });
}
for (let i = 1; i <= 108; i++) {
  DYNAMIC.push({ path: `/doa/myquran/${i}`, title: 'Kumpulan Doa · iMuslim', description: 'Doa dengan teks Arab dan terjemahan dari api.myquran.com.' });
}
for (const r of DYNAMIC) await writeRoute(r.path, withMeta(template, { title: r.title, description: r.description, canonical: r.path }));

for (const l of LEGACY) {
  const target = ROUTES.find((r) => r.path === l.canonical);
  await writeRoute(l.path, withMeta(template, { title: target.title, description: target.description, canonical: l.canonical, noindex: true }));
}

await writeFile(resolve(dist, '404.html'), withMeta(template, { title: 'iMuslim', description: DEFAULT_DESC, canonical: '/', noindex: true }));

// sitemap & robots
const today = new Date().toISOString().slice(0, 10);
const urls = [...ROUTES.map((r) => r.path), ...surahIndex.surahs.map((s) => `/quran/${s.number}`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((p) => `  <url><loc>${SITE}${p === '/' ? '/' : `${p}/`}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n')}\n</urlset>\n`;
await writeFile(resolve(dist, 'sitemap.xml'), sitemap);
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(resolve(dist, '.nojekyll'), '');

// BUILD_ID service worker = hash isi index.html (berubah bila aset berubah)
const buildId = createHash('sha256').update(template).digest('hex').slice(0, 12);
const swFile = resolve(dist, 'sw.js');
const sw = await readFile(swFile, 'utf8');
if (!sw.includes('__BUILD_ID__')) throw new Error('Penanda __BUILD_ID__ tidak ditemukan di sw.js');
await writeFile(swFile, sw.replace('__BUILD_ID__', buildId));

// Manifest Vite hanya dibutuhkan saat build.
await rm(resolve(dist, '.vite'), { recursive: true, force: true });

console.log(`postbuild: ${ROUTES.length} route + ${surahIndex.surahs.length} surah + ${DYNAMIC.length} halaman dinamis + ${LEGACY.length} alamat lama, 404.html, sitemap (${urls.length} URL), sw ${buildId}`);
