// Doa: dua koleksi dari dua sumber berbeda, ditampilkan terpisah agar ID tidak tertukar.
//  - equran.id/api/doa  : 227 doa & dzikir (Arab, latin, terjemahan, keterangan/dalil, tag).
//  - api.myquran.com/v2 : 108 doa (koleksi yang dipakai versi lama). Sumber ini tidak
//    menyediakan transliterasi latin, sehingga latin tidak ditampilkan (tidak dikarang).
import { ApiError, ERROR_KIND } from './errors.js';
import { assert, cachedRequest, DAY, fetchJson } from './client.js';
import { cacheGet } from './cache.js';

export const DOA_COLLECTIONS = {
  equran: { id: 'equran', label: 'Doa & Dzikir', source: 'equran.id', url: 'https://equran.id/api/doa' },
  myquran: { id: 'myquran', label: 'Kumpulan Doa', source: 'api.myquran.com', url: 'https://api.myquran.com/v2/doa/semua' },
};

export const MYQURAN_CATEGORY_LABEL = {
  quran: "Al-Qur'an",
  hadits: 'Hadits',
  pilihan: 'Pilihan',
  harian: 'Harian',
  ibadah: 'Ibadah',
  haji: 'Haji & Umrah',
  lainnya: 'Lainnya',
};

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function mapEquranDoaList(json) {
  assert(json && json.status === 'success' && Array.isArray(json.data), 'Respons doa equran.id tidak valid');
  const items = json.data
    .filter((d) => Number.isInteger(d.id) && str(d.ar) && str(d.nama))
    .map((d) => ({
      collection: 'equran',
      id: d.id,
      title: str(d.nama),
      category: str(d.grup) || 'Lainnya',
      arab: str(d.ar),
      latin: str(d.tr),
      translation: str(d.idn),
      about: str(d.tentang),
      tags: Array.isArray(d.tag) ? d.tag.filter((t) => typeof t === 'string') : [],
    }));
  assert(items.length > 0, 'Daftar doa kosong');
  return items;
}

export function mapMyquranDoaList(json) {
  assert(json && json.status === true && Array.isArray(json.data), 'Respons doa myQuran tidak valid');
  // Field `id` dari sumber kosong; ID = urutan (1..n) sesuai endpoint /v2/doa/{n} (sudah diverifikasi).
  const items = json.data
    .map((d, i) => ({
      collection: 'myquran',
      id: i + 1,
      title: str(d.judul),
      category: str(d.source) || 'lainnya',
      arab: str(d.doa),
      latin: str(d.latin),
      translation: str(d.artinya),
      about: str(d.ayat),
      tags: [],
    }))
    .filter((d) => d.arab && d.title);
  assert(items.length > 0, 'Daftar doa kosong');
  return items;
}

export function getDoaList(collection, { signal, force } = {}) {
  const meta = DOA_COLLECTIONS[collection];
  if (!meta) return Promise.reject(new ApiError(ERROR_KIND.NOT_FOUND, 'Koleksi doa tidak dikenal'));
  const mapper = collection === 'equran' ? mapEquranDoaList : mapMyquranDoaList;
  return cachedRequest({
    key: `doa:list:${collection}`,
    ttl: 7 * DAY,
    force,
    signal,
    load: (s) => fetchJson(meta.url, { signal: s, validate: mapper, timeout: 15000 }),
  });
}

// ---------- Satu doa (halaman detail) ----------
// Halaman detail cukup memuat satu doa (±1 KB) alih-alih seluruh koleksi (±280 KB).
// Bila daftar lengkap sudah tersimpan (pengguna datang dari halaman daftar), itu yang dipakai.
const ITEM_URL = {
  equran: (id) => `https://equran.id/api/doa/${id}`,
  myquran: (id) => `https://api.myquran.com/v2/doa/${id}`,
};

export function mapEquranDoaItem(json) {
  if (json && json.status === 'error') throw new ApiError(ERROR_KIND.NOT_FOUND, 'Doa tidak ditemukan');
  assert(json && json.status === 'success' && json.data && typeof json.data === 'object' && !Array.isArray(json.data), 'Respons doa equran.id tidak valid');
  return mapEquranDoaList({ status: 'success', data: [json.data] })[0];
}

export function mapMyquranDoaItem(json, id) {
  if (json && json.status === false) throw new ApiError(ERROR_KIND.NOT_FOUND, 'Doa tidak ditemukan');
  assert(json && json.status === true && json.data && typeof json.data === 'object', 'Respons doa myQuran tidak valid');
  const [item] = mapMyquranDoaList({ status: true, data: [json.data] });
  return { ...item, id };
}

export async function getDoaItem(collection, id, { signal, force } = {}) {
  if (!DOA_COLLECTIONS[collection]) throw new ApiError(ERROR_KIND.NOT_FOUND, 'Koleksi doa tidak dikenal');
  if (!force) {
    const list = await cacheGet(`doa:list:${collection}`);
    const hit = list?.data?.find?.((d) => d.id === id);
    if (hit) return { data: hit, fetchedAt: list.savedAt, stale: false, fromCache: true };
  }
  return cachedRequest({
    key: `doa:item:${collection}:${id}`,
    ttl: 30 * DAY,
    force,
    signal,
    load: async (s) => {
      try {
        return await fetchJson(ITEM_URL[collection](id), {
          signal: s,
          validate: (j) => (collection === 'equran' ? mapEquranDoaItem(j) : mapMyquranDoaItem(j, id)),
        });
      } catch (error) {
        if (error?.kind === ERROR_KIND.NOT_FOUND || error?.name === 'AbortError') throw error;
        // Endpoint per doa bermasalah → cari di daftar lengkap dari sumber yang sama.
        const list = await getDoaList(collection, { signal: s });
        const hit = list.data.find((d) => d.id === id);
        if (!hit) throw new ApiError(ERROR_KIND.NOT_FOUND, 'Doa tidak ditemukan');
        return hit;
      }
    },
  });
}
