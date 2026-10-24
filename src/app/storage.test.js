import { buildMigration, migrateLegacyEvents, runLegacyMigration } from './migrate-legacy.js';
import { validateEvents, validatePrefs, validateQuran, validateSavedDoa, validateSavedHadits, DEFAULT_PREFS } from './stores.js';
import { createStore } from '../utils/storage.js';

describe('migrasi data versi lama', () => {
  const legacy = {
    darkMode: 'enabled',
    quranFontSize: 'Large',
    userName: 'Syahril May Mubdi', // nilai bawaan yang tertanam → tidak dimigrasikan
    bookmarkedSurahs: JSON.stringify({ 1: { nomor: 1 }, 36: { nomor: 36 }, 999: {} }),
    lastRead: JSON.stringify({ surahNumber: 2, surahName: 'Al-Baqarah', ayatNumber: 255 }),
    savedDoas: JSON.stringify([{ id: 5, judul: 'Doa Husnul Khatimah', arab: 'x', indo: 'y', source: 'quran' }]),
    savedHadiths: JSON.stringify([{ bookId: 'abu-daud', bookName: 'Abu Daud', number: 10, arab: 'a', id: 'b' }]),
    markedEvents: JSON.stringify({ '2026-10-23': { name: 'Kajian', time: '19:30' } }),
  };
  const get = (k) => legacy[k] ?? null;

  it('memetakan preferensi, bookmark, doa, hadits', () => {
    const m = buildMigration(get, -420);
    expect(m['imuslim:prefs']).toEqual({ theme: 'dark', arabicScale: 1.35 });
    expect(m['imuslim:quran'].favorites).toEqual([1, 36]);
    expect(m['imuslim:quran'].lastRead).toMatchObject({ surah: 2, ayah: 255, surahLatin: 'Al-Baqarah' });
    expect(m['imuslim:doa'][0]).toMatchObject({ collection: 'myquran', id: 5, title: 'Doa Husnul Khatimah' });
    expect(m['imuslim:hadits'][0]).toMatchObject({ book: 'abu-dawud', number: 10, translation: 'b' });
  });

  it('memperbaiki kunci tanggal acara yang mundur 1 hari di zona waktu timur UTC', () => {
    // versi lama: klik 24 Okt (WIB) tersimpan sebagai "2026-10-23"
    expect(migrateLegacyEvents({ '2026-10-23': { name: 'Kajian', time: '19:30' } }, -420)).toEqual({
      '2026-10-24': [{ id: 'lama-2026-10-23', name: 'Kajian', time: '19:30' }],
    });
    // di barat UTC tidak ada pergeseran
    expect(Object.keys(migrateLegacyEvents({ '2026-10-23': { name: 'A' } }, 300))).toEqual(['2026-10-23']);
  });

  it('data rusak diabaikan tanpa crash', () => {
    const bad = { bookmarkedSurahs: '{rusak', lastRead: 'null', savedDoas: '"x"', markedEvents: '[]' };
    expect(buildMigration((k) => bad[k] ?? null, -420)).toEqual({});
  });

  it('menghapus kata sandi teks polos dari formulir lama & hanya berjalan sekali', () => {
    localStorage.clear();
    localStorage.setItem('userPassword', 'rahasia');
    localStorage.setItem('darkMode', 'enabled');
    runLegacyMigration();
    expect(localStorage.getItem('userPassword')).toBeNull();
    expect(JSON.parse(localStorage.getItem('imuslim:prefs')).theme).toBe('dark');
    expect(localStorage.getItem('darkMode')).toBe('enabled'); // data lama lain tidak dihapus
    localStorage.setItem('imuslim:prefs', JSON.stringify({ theme: 'light' }));
    runLegacyMigration();
    expect(JSON.parse(localStorage.getItem('imuslim:prefs')).theme).toBe('light');
  });
});

describe('validasi data lokal', () => {
  it('preferensi rusak → nilai aman', () => {
    expect(validatePrefs('x')).toEqual(DEFAULT_PREFS);
    const p = validatePrefs({ theme: 'neon', arabicScale: 99, qari: '99', cityId: '<script>', hijriOffset: 9, name: 5 });
    expect(p).toMatchObject({ theme: 'system', arabicScale: 1.8, qari: '05', cityId: null, hijriOffset: 0, name: '' });
  });
  it('bookmark Al-Qur’an di luar rentang dibuang', () => {
    const q = validateQuran({ favorites: [1, 1, 0, 115, 'x', 2], bookmarks: [{ surah: 2, ayah: 255 }, { surah: 200, ayah: 1 }], lastRead: { surah: 1, ayah: 999 } });
    expect(q.favorites).toEqual([1, 2]);
    expect(q.bookmarks).toHaveLength(1);
    expect(q.lastRead).toBeNull();
  });
  it('doa, hadits, dan acara divalidasi', () => {
    expect(validateSavedDoa([{ collection: 'lain', id: 1, title: 'x' }, { collection: 'equran', id: 3, title: 'Doa' }])).toHaveLength(1);
    expect(validateSavedHadits([{ book: 'bukhari', number: 1 }, { book: 'Bukhari!!', number: 1 }])).toHaveLength(1);
    expect(validateEvents({ '2026-13-01': [{ name: 'x' }], '2026-10-24': [{ name: '  ' }, { name: 'Kajian', time: '25:00' }] })).toEqual({
      '2026-10-24': [expect.objectContaining({ name: 'Kajian', time: '' })],
    });
  });
  it('store membaca localStorage rusak tanpa error & memberi tahu pelanggan', () => {
    localStorage.setItem('t:store', '{bukan json');
    const store = createStore('t:store', { defaultValue: { a: 1 }, validate: (v) => (v && typeof v.a === 'number' ? v : undefined) });
    expect(store.get()).toEqual({ a: 1 });
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.set({ a: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('t:store'))).toEqual({ a: 2 });
    unsub();
  });
});
