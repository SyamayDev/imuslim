// Hadits 9 kitab.
// Sumber lama api.hadith.gading.dev gagal TLS handshake secara konsisten (diuji 24-10-2026),
// sehingga diganti dua penyedia aktif yang memakai dataset 9 kitab yang sama:
//  - utama   : hadis-api-id.vercel.app (mendukung paginasi)
//  - cadangan: api.myquran.com/v2/hadits (per nomor; dipanggil dengan batas konkurensi)
// Arbain An-Nawawi (42 hadits) dari api.myquran.com/v2/hadits/arbain.
import { ApiError, ERROR_KIND } from './errors.js';
import { assert, cachedRequest, DAY, fetchJson, pLimit } from './client.js';

const PRIMARY = 'https://hadis-api-id.vercel.app';
const MYQURAN = 'https://api.myquran.com/v2/hadits';
export const HADITH_PAGE_SIZE = 20;
export const ARBAIN_SLUG = 'arbain';

// Slug lama (gading.dev) → slug baru.
export const LEGACY_BOOK_SLUG = { 'abu-daud': 'abu-dawud' };

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function mapBooks(list) {
  assert(Array.isArray(list) && list.length > 0, 'Daftar kitab kosong');
  return list.map((b) => {
    assert(typeof b.slug === 'string' && typeof b.name === 'string' && Number.isInteger(b.total), 'Data kitab tidak valid');
    return { slug: b.slug, name: b.name, total: b.total };
  });
}

export function getBooks({ signal, force } = {}) {
  return cachedRequest({
    key: 'hadits:books',
    ttl: 30 * DAY,
    force,
    signal,
    load: (s) => fetchJson(`${PRIMARY}/hadith`, { signal: s, validate: mapBooks }),
    fallback: (s) =>
      fetchJson(`${MYQURAN}/perawi`, {
        signal: s,
        validate: (j) => {
          assert(j && j.status === true, 'Respons perawi myQuran tidak valid');
          return mapBooks(j.data);
        },
      }),
  });
}

function mapHadith(h, slug) {
  assert(Number.isInteger(h.number) && str(h.arab), 'Data hadits tidak valid');
  return { book: slug, number: h.number, arab: str(h.arab), translation: str(h.id) };
}

export function mapPage(json, slug, page) {
  assert(json && json.slug === slug && Array.isArray(json.items), 'Respons halaman hadits tidak valid');
  assert(json.pagination && json.pagination.currentPage === page, 'Halaman tidak cocok');
  return {
    book: { slug: json.slug, name: json.name, total: json.total },
    page,
    totalPages: json.pagination.totalPages,
    items: json.items.map((h) => mapHadith(h, slug)),
  };
}

const limit = pLimit(4);

async function fetchPageFromMyquran(book, page, signal) {
  const start = (page - 1) * HADITH_PAGE_SIZE + 1;
  const end = Math.min(start + HADITH_PAGE_SIZE - 1, book.total);
  assert(start <= end, 'Halaman di luar jangkauan');
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const settled = await Promise.allSettled(
    numbers.map((n) => limit(() => fetchJson(`${MYQURAN}/${book.slug}/${n}`, { signal, validate: (j) => mapMyquranHadith(j, book.slug, n) }))),
  );
  if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
  const items = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (items.length === 0) throw settled.find((r) => r.status === 'rejected')?.reason ?? new ApiError(ERROR_KIND.NETWORK, 'Gagal memuat');
  return {
    book,
    page,
    totalPages: Math.ceil(book.total / HADITH_PAGE_SIZE),
    items,
    partial: items.length < numbers.length,
  };
}

export function getHadithPage(book, page, { signal, force } = {}) {
  return cachedRequest({
    key: `hadits:page:${book.slug}:${page}:${HADITH_PAGE_SIZE}`,
    ttl: 30 * DAY,
    force,
    signal,
    load: (s) =>
      fetchJson(`${PRIMARY}/hadith/${encodeURIComponent(book.slug)}?page=${page}&limit=${HADITH_PAGE_SIZE}`, {
        signal: s,
        timeout: 15000,
        validate: (j) => mapPage(j, book.slug, page),
      }),
    fallback: (s) => fetchPageFromMyquran(book, page, s),
  });
}

export function mapMyquranHadith(json, slug, number) {
  if (json && json.status === false) throw new ApiError(ERROR_KIND.NOT_FOUND, str(json.message) || 'Hadits tidak ditemukan');
  assert(json && json.status === true && json.data, 'Respons hadits myQuran tidak valid');
  assert(json.data.number === number, 'Nomor hadits tidak cocok');
  return mapHadith(json.data, slug);
}

export function getHadith(slug, number, { signal, force } = {}) {
  return cachedRequest({
    key: `hadits:item:${slug}:${number}`,
    ttl: 30 * DAY,
    force,
    signal,
    load: (s) =>
      fetchJson(`${PRIMARY}/hadith/${encodeURIComponent(slug)}/${number}`, {
        signal: s,
        validate: (j) => {
          assert(j && j.slug === slug && j.number === number, 'Respons hadits tidak cocok');
          return { ...mapHadith(j, slug), bookName: j.name };
        },
      }),
    fallback: (s) => fetchJson(`${MYQURAN}/${encodeURIComponent(slug)}/${number}`, { signal: s, validate: (j) => mapMyquranHadith(j, slug, number) }),
  });
}

export function mapArbain(json) {
  assert(json && json.status === true && Array.isArray(json.data) && json.data.length > 0, 'Respons Arbain tidak valid');
  return json.data.map((h, i) => {
    const number = Number(h.no) || i + 1;
    assert(str(h.arab), `Teks Arab Arbain no. ${number} kosong`);
    return { book: ARBAIN_SLUG, number, title: str(h.judul), arab: str(h.arab), translation: str(h.indo) };
  });
}

export function getArbain({ signal, force } = {}) {
  return cachedRequest({
    key: 'hadits:arbain',
    ttl: 30 * DAY,
    force,
    signal,
    load: (s) => fetchJson(`${MYQURAN}/arbain/semua`, { signal: s, validate: mapArbain, timeout: 15000 }),
  });
}

export const ARBAIN_BOOK = { slug: ARBAIN_SLUG, name: 'Arbain An-Nawawi', total: 42 };
