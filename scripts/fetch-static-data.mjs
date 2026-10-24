// Mengambil indeks 114 surah dari equran.id dan menyimpannya sebagai data statis tervalidasi.
// Dipakai untuk: judul halaman surah yang di-prerender saat build, dan cadangan daftar surah
// bila API sedang tidak bisa diakses (ditandai jelas di UI).
// Jalankan ulang bila perlu: node scripts/fetch-static-data.mjs
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'https://equran.id/api/v2/surat';

const res = await fetch(URL, { signal: AbortSignal.timeout(30000) });
if (!res.ok) throw new Error(`HTTP ${res.status} dari ${URL}`);
const json = await res.json();
if (json.code !== 200 || !Array.isArray(json.data) || json.data.length !== 114) {
  throw new Error('Bentuk respons equran.id tidak sesuai harapan');
}
const surahs = json.data.map((s, i) => {
  if (s.nomor !== i + 1) throw new Error(`Urutan surah tidak valid di indeks ${i}`);
  return {
    number: s.nomor,
    name: s.nama,
    latin: s.namaLatin,
    meaning: s.arti,
    ayahCount: s.jumlahAyat,
    place: s.tempatTurun,
  };
});
const totalAyah = surahs.reduce((sum, s) => sum + s.ayahCount, 0);
if (totalAyah !== 6236) throw new Error(`Total ayat ${totalAyah}, seharusnya 6236`);

const out = {
  source: URL,
  fetchedAt: new Date().toISOString(),
  surahs,
};
await writeFile(resolve(root, 'src/data/surah-index.json'), JSON.stringify(out, null, 0) + '\n');
console.log(`✓ src/data/surah-index.json (${surahs.length} surah, ${totalAyah} ayat)`);
