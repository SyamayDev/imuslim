// Doa: dua koleksi dari dua sumber berbeda, ditampilkan terpisah agar ID tidak tertukar.
//  - equran.id/api/doa  : 227 doa & dzikir (Arab, latin, terjemahan, keterangan/dalil, tag).
//  - api.myquran.com/v2 : 108 doa (koleksi yang dipakai versi lama). Sumber ini tidak
//    menyediakan transliterasi latin, sehingga latin tidak ditampilkan (tidak dikarang).
import { ApiError, ERROR_KIND } from './errors.js';
import { assert, cachedRequest, DAY, fetchJson } from './client.js';

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
