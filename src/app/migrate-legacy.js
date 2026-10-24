// Migrasi satu kali dari kunci localStorage versi lama (Vue/jQuery) ke format iMuslim.
// Prinsip: tidak menghapus data lama milik orang lain (origin syamaydev.github.io dipakai
// bersama oleh semua proyek GitHub Pages pengguna), kecuali "userPassword" yang menyimpan
// kata sandi teks polos dari formulir palsu versi lama — itu dihapus demi keamanan.
import { isObj } from '../utils/storage.js';

const FLAG = 'imuslim:migrated';
// Versi lama menanam nama pribadi sebagai nilai bawaan "userName". Nama itu tidak boleh
// dimigrasikan sebagai sapaan, tetapi juga tidak perlu ikut dikirim di bundle publik —
// karena itu dibandingkan lewat hash FNV-1a (huruf kecil, NFC).
const LEGACY_DEFAULT_NAME_HASH = '90610ac9';

export function fnv1a(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text).normalize('NFC').toLowerCase()) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeIfAbsent(key, value) {
  try {
    if (localStorage.getItem(key) == null) localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* kuota penuh / mode privat — abaikan */
  }
}

const pad = (n) => String(n).padStart(2, '0');
function shiftIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * Versi lama membuat kunci tanggal acara dengan `new Date(y, m, d).toISOString()`,
 * yaitu tengah malam waktu lokal yang dikonversi ke UTC. Di zona waktu di timur UTC
 * (seluruh Indonesia) hasilnya mundur satu hari. Kunci digeser +1 hari agar acara
 * kembali ke tanggal yang dimaksud pengguna.
 */
export function migrateLegacyEvents(legacy, tzOffsetMinutes = new Date().getTimezoneOffset()) {
  if (!isObj(legacy)) return {};
  const shift = tzOffsetMinutes < 0 ? 1 : 0;
  const out = {};
  for (const [key, ev] of Object.entries(legacy)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isObj(ev) || typeof ev.name !== 'string' || !ev.name.trim()) continue;
    const date = shiftIso(key, shift);
    (out[date] ||= []).push({ id: `lama-${key}`, name: ev.name.trim().slice(0, 80), time: typeof ev.time === 'string' ? ev.time : '' });
  }
  return out;
}

export function buildMigration(get = read, tzOffsetMinutes) {
  const result = {};
  const parse = (k) => {
    const raw = get(k);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // Preferensi
  const prefs = {};
  const darkMode = get('darkMode');
  const olivera = get('OliveraTheme');
  const theme = get('theme');
  if (darkMode === 'enabled' || olivera === 'dark__mode' || theme === 'dark') prefs.theme = 'dark';
  else if (darkMode === 'disabled' || olivera === 'light__mode' || theme === 'light') prefs.theme = 'light';
  const fontSize = get('quranFontSize');
  if (fontSize === 'Small') prefs.arabicScale = 0.9;
  if (fontSize === 'Large') prefs.arabicScale = 1.35;
  const userName = get('userName');
  if (userName && userName.trim() && fnv1a(userName.trim()) !== LEGACY_DEFAULT_NAME_HASH) prefs.name = userName.trim().slice(0, 40);
  if (Object.keys(prefs).length) result['imuslim:prefs'] = prefs;

  // Al-Qur'an
  const bookmarked = parse('bookmarkedSurahs');
  const lastRead = parse('lastRead');
  const favorites = isObj(bookmarked)
    ? Object.keys(bookmarked)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 114)
    : [];
  const lr =
    isObj(lastRead) && Number.isInteger(Number(lastRead.surahNumber)) && Number.isInteger(Number(lastRead.ayatNumber))
      ? { surah: Number(lastRead.surahNumber), ayah: Number(lastRead.ayatNumber), surahLatin: String(lastRead.surahName ?? ''), at: Date.now() }
      : null;
  if (favorites.length || lr) result['imuslim:quran'] = { favorites, bookmarks: [], lastRead: lr };

  // Doa tersimpan (versi lama memakai urutan 1..108 dari api.myquran.com)
  const savedDoas = parse('savedDoas');
  if (Array.isArray(savedDoas) && savedDoas.length) {
    result['imuslim:doa'] = savedDoas
      .filter((d) => isObj(d) && Number.isInteger(Number(d.id)))
      .map((d) => ({
        collection: 'myquran',
        id: Number(d.id),
        title: String(d.judul ?? ''),
        category: String(d.source ?? ''),
        arab: String(d.arab ?? ''),
        translation: String(d.indo ?? ''),
        savedAt: Date.now(),
      }));
  }

  // Hadits tersimpan (slug lama gading.dev)
  const savedHadiths = parse('savedHadiths');
  if (Array.isArray(savedHadiths) && savedHadiths.length) {
    const slugMap = { 'abu-daud': 'abu-dawud' };
    result['imuslim:hadits'] = savedHadiths
      .filter((h) => isObj(h) && typeof h.bookId === 'string' && Number.isInteger(Number(h.number)))
      .map((h) => ({
        book: slugMap[h.bookId] ?? h.bookId,
        bookName: String(h.bookName ?? ''),
        number: Number(h.number),
        title: '',
        arab: String(h.arab ?? ''),
        translation: String(h.id ?? ''),
        savedAt: Date.now(),
      }));
  }

  // Acara kalender
  const events = migrateLegacyEvents(parse('markedEvents'), tzOffsetMinutes);
  if (Object.keys(events).length) result['imuslim:events'] = events;

  return result;
}

export function runLegacyMigration() {
  if (read(FLAG) === '1') return;
  const data = buildMigration();
  for (const [key, value] of Object.entries(data)) writeIfAbsent(key, value);
  try {
    localStorage.removeItem('userPassword');
    localStorage.setItem(FLAG, '1');
  } catch {
    /* abaikan */
  }
}

// Dijalankan sekali saat modul dimuat (sebelum store dibaca).
runLegacyMigration();

