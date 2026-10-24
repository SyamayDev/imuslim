// Seluruh data lokal pengguna iMuslim (namespace "imuslim:" agar tidak bentrok dengan
// proyek lain di origin syamaydev.github.io yang berbagi localStorage).
import { createStore, int, isObj, str } from '../utils/storage.js';
import { QARI, DEFAULT_QARI } from '../services/api/quran-constants.js';

const clampNum = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export const DEFAULT_PREFS = {
  theme: 'system', // 'system' | 'light' | 'dark'
  arabicScale: 1, // 0.8 – 1.8
  showLatin: true,
  showTranslation: true,
  qari: DEFAULT_QARI,
  cityId: null,
  cityName: '',
  hijriOffset: 0, // −2..+2 hari
  adzanEnabled: false,
  adzanNotify: false,
  imsakAlert: false,
  name: '',
};

export function validatePrefs(v) {
  if (!isObj(v)) return DEFAULT_PREFS;
  return {
    theme: ['system', 'light', 'dark'].includes(v.theme) ? v.theme : DEFAULT_PREFS.theme,
    arabicScale: Math.round(clampNum(v.arabicScale, 0.8, 1.8, 1) * 20) / 20,
    showLatin: typeof v.showLatin === 'boolean' ? v.showLatin : true,
    showTranslation: typeof v.showTranslation === 'boolean' ? v.showTranslation : true,
    qari: QARI[v.qari] ? v.qari : DEFAULT_QARI,
    cityId: typeof v.cityId === 'string' && /^\d{4}$/.test(v.cityId) ? v.cityId : null,
    cityName: str(v.cityName, 80),
    hijriOffset: int(v.hijriOffset, -2, 2) ?? 0,
    adzanEnabled: v.adzanEnabled === true,
    adzanNotify: v.adzanNotify === true,
    imsakAlert: v.imsakAlert === true,
    name: str(v.name, 40).trim(),
  };
}

export const prefsStore = createStore('imuslim:prefs', { defaultValue: DEFAULT_PREFS, validate: validatePrefs });

// ---------- Al-Qur'an ----------
export const DEFAULT_QURAN = { favorites: [], bookmarks: [], lastRead: null };

const validRef = (r) => isObj(r) && int(r.surah, 1, 114) !== null && int(r.ayah, 1, 286) !== null;

export function validateQuran(v) {
  if (!isObj(v)) return DEFAULT_QURAN;
  const favorites = Array.isArray(v.favorites) ? [...new Set(v.favorites.map((n) => int(n, 1, 114)).filter((n) => n !== null))] : [];
  const bookmarks = Array.isArray(v.bookmarks)
    ? v.bookmarks
        .filter(validRef)
        .map((b) => ({ surah: b.surah, ayah: b.ayah, surahLatin: str(b.surahLatin, 60), savedAt: Number(b.savedAt) || 0 }))
        .slice(0, 500)
    : [];
  const lastRead = validRef(v.lastRead)
    ? { surah: v.lastRead.surah, ayah: v.lastRead.ayah, surahLatin: str(v.lastRead.surahLatin, 60), at: Number(v.lastRead.at) || 0 }
    : null;
  return { favorites, bookmarks, lastRead };
}

export const quranStore = createStore('imuslim:quran', { defaultValue: DEFAULT_QURAN, validate: validateQuran });

// ---------- Doa tersimpan ----------
export function validateSavedDoa(v) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((d) => isObj(d) && ['equran', 'myquran'].includes(d.collection) && int(d.id, 1, 100000) !== null && str(d.title))
    .map((d) => ({
      collection: d.collection,
      id: d.id,
      title: str(d.title, 200),
      category: str(d.category, 120),
      arab: str(d.arab, 4000),
      translation: str(d.translation, 4000),
      savedAt: Number(d.savedAt) || 0,
    }))
    .slice(0, 500);
}
export const doaStore = createStore('imuslim:doa', { defaultValue: [], validate: validateSavedDoa });

// ---------- Hadits tersimpan ----------
export function validateSavedHadits(v) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((h) => isObj(h) && /^[a-z-]{2,30}$/.test(String(h.book)) && int(h.number, 1, 100000) !== null)
    .map((h) => ({
      book: h.book,
      bookName: str(h.bookName, 60),
      number: h.number,
      title: str(h.title, 200),
      arab: str(h.arab, 12000),
      translation: str(h.translation, 12000),
      savedAt: Number(h.savedAt) || 0,
    }))
    .slice(0, 500);
}
export const haditsStore = createStore('imuslim:hadits', { defaultValue: [], validate: validateSavedHadits });

// ---------- Acara kalender ----------
const ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export function validateEvents(v) {
  if (!isObj(v)) return {};
  const out = {};
  for (const [date, list] of Object.entries(v)) {
    if (!ISO.test(date) || !Array.isArray(list)) continue;
    const clean = list
      .filter((e) => isObj(e) && str(e.name).trim())
      .map((e) => ({
        id: str(e.id, 40) || `${date}-${Math.random().toString(36).slice(2, 8)}`,
        name: str(e.name, 80).trim(),
        time: HHMM.test(e.time) ? e.time : '',
      }))
      .slice(0, 20);
    if (clean.length) out[date] = clean;
  }
  return out;
}
export const eventsStore = createStore('imuslim:events', { defaultValue: {}, validate: validateEvents });

// ---------- Lokasi kiblat terakhir ----------
export function validateQiblaLocation(v) {
  if (!isObj(v)) return null;
  const lat = Number(v.lat);
  const lon = Number(v.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon, label: str(v.label, 160), source: ['gps', 'manual', 'search'].includes(v.source) ? v.source : 'manual' };
}
export const qiblaStore = createStore('imuslim:qibla', { defaultValue: null, validate: validateQiblaLocation });

export const ALL_STORES = [prefsStore, quranStore, doaStore, haditsStore, eventsStore, qiblaStore];
