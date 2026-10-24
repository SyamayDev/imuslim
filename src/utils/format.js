const LOCALE = 'id-ID';

export const rupiah = (n) =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(n || 0));

export const number = (n, digits = 0) =>
  new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n || 0);

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "2026-10-24" → Date lokal (tengah hari agar aman dari pergeseran zona). */
export function isoToLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function localIso(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatLongDate(iso) {
  const d = isoToLocalDate(iso);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(iso) {
  const d = isoToLocalDate(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function formatDateTime(ms) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms));
}

export function relativeTimeFrom(ms, now = Date.now()) {
  const diff = Math.round((now - ms) / 60000);
  if (diff < 1) return 'baru saja';
  if (diff < 60) return `${diff} menit lalu`;
  const h = Math.round(diff / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  return `${d} hari lalu`;
}

export function greeting(hour) {
  if (hour >= 3 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}
