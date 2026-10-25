// Langkah pasca-build (berlaku untuk GitHub Pages /imuslim/ maupun Vercel /):
//  1. Prerender setiap route statis menjadi HTML utuh (React 19 prerender, lihat
//     src/entry-server.jsx) dengan <title>, deskripsi, canonical, dan og:url masing-masing.
//     Halaman langsung tampil sebelum JavaScript selesai dimuat, lalu di-hydrate.
//  2. CSS aplikasi di-inline → cat pertama tidak menunggu request apa pun selain HTML.
//  3. Preload font & modul halaman per route.
//  4. Route dinamis yang jumlahnya stabil (114 surah, kitab hadits, Arbain, doa) juga
//     diprerender sehingga berstatus 200 saat dibuka langsung/di-refresh.
//  5. 404.html = aplikasi tanpa prerender (noindex) untuk alamat lain; router klien
//     menampilkan halaman yang tepat. Alamat lama dibuat 200 lalu dialihkan di klien.
//  6. sitemap.xml, robots.txt, .nojekyll, manifest (id = base), dan BUILD_ID service worker.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveSite } from './site-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, process.env.OUT_DIR || 'dist');
const ssrDir = resolve(root, 'dist-ssr');
const { base: BASE_PATH, url: SITE } = resolveSite();
const surahIndex = JSON.parse(await readFile(resolve(root, 'src/data/surah-index.json'), 'utf8'));
const { render, mapEquranDoaList, mapMyquranDoaList, mapArbain, serializeSeed } = await import(pathToFileURL(resolve(ssrDir, 'entry-server.js')).href);

// ---------- Data prerender: isi doa & Arbain ----------
// Diambil sekali saat build dari API yang sama dengan aplikasi (divalidasi oleh pemeta yang
// sama), lalu ditanam di halaman detail → teks tampil sebelum JavaScript berjalan dan bisa
// dirayapi mesin pencari. Di browser data tetap diperiksa ulang ke sumber. Bila API gagal saat
// build, halaman tetap dibuat tanpa data (dimuat dari API di browser). PRERENDER_DATA=0 mematikan.
async function fetchDataset(label, url, mapper) {
  if (process.env.PRERENDER_DATA === '0') return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return mapper(await res.json());
  } catch (error) {
    console.warn(`! data prerender ${label} dilewati (${error.message}); halaman memuat data dari API di browser`);
    return null;
  }
}
const DATA_FETCHED_AT = Date.now();
const [DOA_EQURAN, DOA_MYQURAN, ARBAIN] = await Promise.all([
  fetchDataset('doa equran.id', 'https://equran.id/api/doa', mapEquranDoaList),
  fetchDataset('doa myQuran', 'https://api.myquran.com/v2/doa/semua', mapMyquranDoaList),
  fetchDataset('Arbain', 'https://api.myquran.com/v2/hadits/arbain/semua', mapArbain),
]);
const clip = (text, max) => {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : clean;
};

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

/** URL kanonis: folder statis dilayani dengan garis miring akhir (GitHub Pages & Vercel trailingSlash). */
const pageUrl = (path) => `${SITE}${path === '/' ? '/' : `${path}/`}`;

function withMeta(html, { title, description, canonical, noindex = false }) {
  const desc = esc(description ?? DEFAULT_DESC);
  const url = pageUrl(canonical);
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

// ---------- Template: URL situs + CSS inline ----------
let template = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!/<div id="root"><!--app-html-->[\s\S]*?<!--\/app-html--><\/div>/.test(template)) throw new Error('dist/index.html tidak memiliki penanda <!--app-html-->');
const buildId = createHash('sha256').update(template).digest('hex').slice(0, 12);
template = template.replaceAll('__SITE_URL__', SITE);

const cssLinks = [...template.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">\s*/g)];
if (cssLinks.length !== 1) throw new Error(`Diharapkan tepat 1 stylesheet, ditemukan ${cssLinks.length}`);
const css = await readFile(resolve(dist, cssLinks[0][1].slice(BASE_PATH.length)), 'utf8');
template = template.replace(cssLinks[0][0], `<style>${css.trim()}</style>\n    `);

// Halaman sudah diprerender: JavaScript hanya diperlukan untuk hydration, bukan untuk
// mengecat. Prioritas rendah membiarkan HTML & font menang di jaringan yang lambat.
template = template
  .replace(/<script type="module" crossorigin src=/g, '<script type="module" crossorigin fetchpriority="low" src=')
  .replace(/<link rel="modulepreload" crossorigin href=/g, '<link rel="modulepreload" crossorigin fetchpriority="low" href=');

// ---------- Preload per route ----------
const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'));
const assetFiles = await readdir(resolve(dist, 'assets'));
const findAsset = (re) => assetFiles.find((f) => re.test(f));

function pageModuleFor(path) {
  if (path === '/') return 'src/pages/Home.jsx';
  const [a, b, c] = path.split('/').filter(Boolean);
  const map = {
    quran: b ? 'src/pages/quran/SurahPage.jsx' : 'src/pages/quran/QuranIndex.jsx',
    sholat: 'src/pages/Sholat.jsx',
    doa: b ? 'src/pages/doa/DoaDetail.jsx' : 'src/pages/doa/DoaIndex.jsx',
    hadits: c ? 'src/pages/hadits/HaditsDetail.jsx' : b ? 'src/pages/hadits/HaditsBook.jsx' : 'src/pages/hadits/HaditsIndex.jsx',
    kalender: 'src/pages/Kalender.jsx',
    kiblat: 'src/pages/Kiblat.jsx',
    zakat: 'src/pages/Zakat.jsx',
    pengaturan: 'src/pages/Pengaturan.jsx',
    tentang: 'src/pages/Tentang.jsx',
  };
  return map[a] ?? null;
}

function collect(key, files, seen = new Set()) {
  if (seen.has(key) || !manifest[key]) return;
  seen.add(key);
  files.add(manifest[key].file);
  (manifest[key].imports ?? []).forEach((k) => collect(k, files, seen));
}
const entryFiles = new Set();
collect('index.html', entryFiles);

const FONT_UI = findAsset(/^plus-jakarta-sans-latin-wght-normal-.*\.woff2$/);
const FONT_DISPLAY = findAsset(/^fraunces-latin-600-normal-.*\.woff2$/);
const FONT_ARABIC = findAsset(/^amiri-quran-arabic-400-normal-.*\.woff2$/);
if (!FONT_UI || !FONT_DISPLAY || !FONT_ARABIC) throw new Error('Berkas font utama tidak ditemukan di dist/assets');

function preloadTags(path, { arabic = false } = {}) {
  const tags = [];
  const font = (f) => tags.push(`<link rel="preload" href="${BASE_PATH}assets/${f}" as="font" type="font/woff2" crossorigin />`);
  font(FONT_UI);
  font(FONT_DISPLAY);
  // Font Arab di-preload bila HTML halaman memuat teks Arab (mis. daftar surah) atau halaman
  // detail yang menampilkannya segera setelah data datang. Tanpa preload, font yang baru
  // ditemukan saat layout mendapat prioritas tertinggi dan ikut menunda cat pertama.
  if (arabic || /^\/(quran\/\d+|doa\/[^/]+\/\d+|hadits\/[^/]+)/.test(path)) font(FONT_ARABIC);
  // Modul halaman tidak di-preload dari <head> (akan bersaing dengan cat pertama);
  // main.jsx membaca daftar ini dan mem-preload-nya tepat setelah First Contentful Paint.
  const page = pageModuleFor(path);
  if (page) {
    const files = new Set();
    collect(page, files);
    const list = [...files].filter((f) => !entryFiles.has(f)).map((f) => `${BASE_PATH}${f}`);
    if (list.length) tags.push(`<meta name="imuslim:modules" content="${list.join(' ')}" />`);
  }
  return tags.map((t) => `    ${t}`).join('\n');
}

const fileFor = (path) => (path === '/' ? resolve(dist, 'index.html') : resolve(dist, `.${path}`, 'index.html'));

async function writePage(path, html, options) {
  const file = fileFor(path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html.replace('</head>', `${preloadTags(path, options)}\n  </head>`));
}

/** Halaman prerender: HTML React disisipkan ke #root dan ditandai path-nya untuk hydration. */
async function prerenderPage(path, meta, seed = null) {
  const app = await render(path, seed ?? {});
  const seedTag = seed ? `<script type="application/json" id="imuslim-seed">${serializeSeed(seed)}</script>\n    ` : '';
  const html = withMeta(template, meta).replace(
    /<div id="root"><!--app-html-->[\s\S]*?<!--\/app-html--><\/div>/,
    () => `${seedTag}<div id="root" data-ssr="${esc(path)}">${app}</div>`,
  );
  await writePage(path, html, { arabic: /\blang="ar"/.test(app) });
}

let prerendered = 0;
for (const r of ROUTES) {
  await prerenderPage(r.path, { title: r.title, description: r.description, canonical: r.path });
  prerendered++;
}

for (const s of surahIndex.surahs) {
  await prerenderPage(`/quran/${s.number}`, {
    title: `Surah ${s.latin} (${s.meaning}) · Al-Qur'an · iMuslim`,
    description: `Baca Surah ${s.latin} (${s.name}) — ${s.meaning}, ${s.ayahCount} ayat, ${s.place}. Teks Arab, latin, terjemahan, tafsir, dan audio murattal.`,
    canonical: `/quran/${s.number}`,
  });
  prerendered++;
}

// Route dinamis yang jumlahnya kecil & stabil. Jumlah sesuai audit API 24-10-2026;
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

// Arbain: isi tiap hadits ikut diprerender bila data build tersedia.
const arbainNumbers = ARBAIN ? ARBAIN.map((h) => h.number) : Array.from({ length: 42 }, (_, i) => i + 1);
for (const n of arbainNumbers) {
  const item = ARBAIN?.find((h) => h.number === n);
  DYNAMIC.push({
    path: `/hadits/arbain/${n}`,
    title: item?.title ? `Hadits Arbain No. ${n}: ${clip(item.title, 70)} · iMuslim` : `Hadits Arbain An-Nawawi No. ${n} · iMuslim`,
    description: item ? `Hadits Arbain An-Nawawi nomor ${n}: ${clip(item.translation, 130)}` : `Hadits Arbain An-Nawawi nomor ${n} dengan teks Arab dan terjemahan Indonesia.`,
    seed: item ? { [`hadits:arbain:item:${n}`]: { data: item, fetchedAt: DATA_FETCHED_AT } } : null,
  });
}

// Doa: isi + judul doa sebelum/sesudah ikut diprerender bila data build tersedia.
function doaPages(collection, list, fallbackCount, label, source) {
  const ids = list ? list.map((d) => d.id) : Array.from({ length: fallbackCount }, (_, i) => i + 1);
  return ids.map((id, i) => {
    const doa = list?.[i];
    const brief = (d) => (d ? { id: d.id, title: d.title } : null);
    return {
      path: `/doa/${collection}/${id}`,
      title: doa ? `${clip(doa.title, 70)} · ${label} · iMuslim` : `${label} · iMuslim`,
      description: doa ? `${clip(doa.title, 60)}: ${clip(doa.translation, 120)} Teks Arab dan terjemahan dari ${source}.` : `Doa dengan teks Arab dan terjemahan dari ${source}.`,
      seed: doa
        ? {
            [`doa:item:${collection}:${id}`]: { data: doa, fetchedAt: DATA_FETCHED_AT },
            [`doa:nav:${collection}:${id}`]: { data: { prev: brief(list[i - 1]), next: brief(list[i + 1]) } },
          }
        : null,
    };
  });
}
DYNAMIC.push(...doaPages('equran', DOA_EQURAN, 227, 'Doa & Dzikir', 'equran.id'));
DYNAMIC.push(...doaPages('myquran', DOA_MYQURAN, 108, 'Kumpulan Doa', 'api.myquran.com'));

let seeded = 0;
for (const r of DYNAMIC) {
  await prerenderPage(r.path, { title: r.title, description: r.description, canonical: r.path }, r.seed ?? null);
  prerendered++;
  if (r.seed) seeded++;
}

// Alamat lama & 404: tanpa prerender (klien mengalihkan / merender halaman yang tepat).
for (const l of LEGACY) {
  const target = ROUTES.find((r) => r.path === l.canonical);
  await writePage(l.path, withMeta(template, { title: target.title, description: target.description, canonical: l.canonical, noindex: true }));
}
await writeFile(resolve(dist, '404.html'), withMeta(template, { title: 'iMuslim', description: DEFAULT_DESC, canonical: '/', noindex: true }));

// ---------- sitemap, robots, manifest, service worker ----------
const today = new Date().toISOString().slice(0, 10);
const urls = [...ROUTES.map((r) => r.path), ...surahIndex.surahs.map((s) => `/quran/${s.number}`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((p) => `  <url><loc>${pageUrl(p)}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n')}\n</urlset>\n`;
await writeFile(resolve(dist, 'sitemap.xml'), sitemap);
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(resolve(dist, '.nojekyll'), '');

const manifestFile = resolve(dist, 'manifest.webmanifest');
const webManifest = await readFile(manifestFile, 'utf8');
if (!webManifest.includes('__BASE__')) throw new Error('Penanda __BASE__ tidak ditemukan di manifest.webmanifest');
await writeFile(manifestFile, webManifest.replace('__BASE__', BASE_PATH));

const swFile = resolve(dist, 'sw.js');
const sw = await readFile(swFile, 'utf8');
if (!sw.includes('__BUILD_ID__')) throw new Error('Penanda __BUILD_ID__ tidak ditemukan di sw.js');
await writeFile(swFile, sw.replace('__BUILD_ID__', buildId));

// Berkas bantu build tidak ikut dipublikasikan.
await rm(resolve(dist, '.vite'), { recursive: true, force: true });
await rm(ssrDir, { recursive: true, force: true });

console.log(
  `postbuild: base ${BASE_PATH} · situs ${SITE}\n` +
    `  ${prerendered} halaman prerender (${ROUTES.length} route, ${surahIndex.surahs.length} surah, ${DYNAMIC.length} dinamis) + ${LEGACY.length} alamat lama + 404.html\n` +
    `  ${seeded} halaman berisi data prerender (doa equran ${DOA_EQURAN?.length ?? 0}, doa myQuran ${DOA_MYQURAN?.length ?? 0}, Arbain ${ARBAIN?.length ?? 0})\n` +
    `  CSS inline ${(css.length / 1024).toFixed(1)} KB · sitemap ${urls.length} URL · sw ${buildId}`,
);
