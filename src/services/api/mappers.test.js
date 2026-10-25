// Pemetaan respons API diuji dengan respons asli yang direkam 24-10-2026 (src/test/fixtures).
import alquranCloud112 from '../../test/fixtures/alquran-cloud-112.json';
import ayah946 from '../../test/fixtures/alquran-cloud-ayah-94-6.json';
import xau from '../../test/fixtures/currency-xau.json';
import equranDoa from '../../test/fixtures/equran-doa.json';
import equranDoa2 from '../../test/fixtures/equran-doa-2.json';
import myqDoa2 from '../../test/fixtures/myquran-doa-2.json';
import equran112 from '../../test/fixtures/equran-surat-112.json';
import tafsir112 from '../../test/fixtures/equran-tafsir-112.json';
import booksJson from '../../test/fixtures/hadis-api-books.json';
import muslimP2 from '../../test/fixtures/hadis-api-muslim-p2.json';
import arbain from '../../test/fixtures/myquran-arbain.json';
import arbain1 from '../../test/fixtures/myquran-arbain-1.json';
import myqDoa from '../../test/fixtures/myquran-doa.json';
import bukhari1 from '../../test/fixtures/myquran-hadits-bukhari-1.json';
import hijr from '../../test/fixtures/myquran-hijr-2026-10-24.json';
import jadwalAceh from '../../test/fixtures/myquran-jadwal-0105-2026-10.json';
import jadwal from '../../test/fixtures/myquran-jadwal-1301-2026-10.json';
import kota from '../../test/fixtures/myquran-kota.json';
import { mapEquranDoaItem, mapEquranDoaList, mapMyquranDoaItem, mapMyquranDoaList } from './doa.js';
import { mapArbain, mapArbainItem, mapBooks, mapMyquranHadith, mapPage } from './hadits.js';
import { mapGold } from './misc.js';
import { DAILY_AYAH_REFS, mapAlquranCloudAyah, mapAlquranCloudSurah, mapEquranSurah, mapTafsir, SURAH_INDEX } from './quran.js';
import { mapCities, mapHijriReference, mapSchedule } from './sholat.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

describe("Al-Qur'an", () => {
  it('equran.id: ayat, latin, terjemahan, audio 6 qari', () => {
    const s = mapEquranSurah(equran112, 112);
    expect(s).toMatchObject({ number: 112, latin: 'Al-Ikhlas', ayahCount: 4, source: 'equran.id' });
    expect(s.ayahs).toHaveLength(4);
    expect(s.ayahs[0].latin).toBeTruthy();
    expect(s.ayahs[0].translation).toBeTruthy();
    expect(Object.keys(s.ayahs[0].audio)).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(s.audioFull['05']).toMatch(/^https:\/\/cdn\.equran\.id\//);
  });

  it('equran.id: menolak data bila jumlah ayat tidak sesuai metadata', () => {
    const broken = clone(equran112);
    broken.data.ayat.pop();
    expect(() => mapEquranSurah(broken, 112)).toThrow(/Jumlah ayat/);
    expect(() => mapEquranSurah(equran112, 113)).toThrow(/Nomor surah/);
  });

  it('alquran.cloud (cadangan): dipetakan per nomor ayat & basmalah di ayat 1 dibuang', () => {
    const s = mapAlquranCloudSurah(alquranCloud112, 112);
    expect(s.ayahs).toHaveLength(4);
    expect(s.ayahs[0].arab.startsWith('بِسْمِ')).toBe(false);
    expect(s.ayahs[0].arab).toMatch(/^قُلْ/);
    expect(s.ayahs[2].translation).toBeTruthy();
    expect(s.ayahs[3].audio['05']).toMatch(/^https:\/\//);
    expect(s.latin).toBe('Al-Ikhlas'); // nama dari indeks equran.id
  });

  it('alquran.cloud: urutan ayat terbalik tetap dipetakan benar berdasarkan numberInSurah', () => {
    const shuffled = clone(alquranCloud112);
    shuffled.data[1].ayahs.reverse();
    const s = mapAlquranCloudSurah(shuffled, 112);
    const expected = alquranCloud112.data[1].ayahs.find((a) => a.numberInSurah === 2).text;
    expect(s.ayahs[1].translation).toBe(expected.trim());
  });

  it('ayat harian & tafsir', () => {
    const a = mapAlquranCloudAyah(ayah946, [94, 6]);
    expect(a).toMatchObject({ surah: 94, ayah: 6 });
    expect(a.translation.length).toBeGreaterThan(10);
    expect(() => mapAlquranCloudAyah(ayah946, [94, 5])).toThrow();
    const t = mapTafsir(tafsir112, 112);
    expect(Object.keys(t)).toHaveLength(4);
  });

  it('indeks statis 114 surah, 6.236 ayat, rujukan ayat harian valid', () => {
    expect(SURAH_INDEX).toHaveLength(114);
    expect(SURAH_INDEX.reduce((s, x) => s + x.ayahCount, 0)).toBe(6236);
    for (const [s, a] of DAILY_AYAH_REFS) {
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(SURAH_INDEX[s - 1].ayahCount);
    }
  });
});

describe('doa', () => {
  it('equran.id: latin & keterangan tersedia', () => {
    const list = mapEquranDoaList(equranDoa);
    expect(list[0]).toMatchObject({ collection: 'equran', id: 1 });
    expect(list[0].latin).toBeTruthy();
    expect(list[0].about).toMatch(/HR\./);
  });
  it('myQuran: skema baru (doa/artinya), ID = urutan, latin kosong tidak dikarang', () => {
    const list = mapMyquranDoaList(myqDoa);
    expect(list[0]).toMatchObject({ collection: 'myquran', id: 1, title: myqDoa.data[0].judul, arab: myqDoa.data[0].doa, translation: myqDoa.data[0].artinya });
    expect(list.every((d) => d.latin === '')).toBe(true);
  });
  it('skema lama (arab/indo) ditolak sebagai data kosong', () => {
    expect(() => mapMyquranDoaList({ status: true, data: [{ judul: 'x', arab: 'y', indo: 'z' }] })).toThrow();
  });
});

describe('doa per nomor (halaman detail)', () => {
  it('equran.id /api/doa/2 → satu doa lengkap', () => {
    const d = mapEquranDoaItem(equranDoa2);
    expect(d).toMatchObject({ collection: 'equran', id: 2, title: 'Doa Sebelum Tidur 2' });
    expect(d.arab).toBeTruthy();
    expect(d.latin).toBeTruthy();
    expect(d.about).toMatch(/Bukhari/);
  });
  it('myQuran /v2/doa/2 → ID mengikuti nomor yang diminta', () => {
    const d = mapMyquranDoaItem(myqDoa2, 2);
    expect(d).toMatchObject({ collection: 'myquran', id: 2 });
    expect(d.arab).toBeTruthy();
  });
  it('nomor tidak ada → NOT_FOUND (bukan galat format)', () => {
    expect(() => mapEquranDoaItem({ status: 'error', message: 'Data doa dengan nomor 9999 tidak ditemukan.' })).toThrow(/tidak ditemukan/);
    expect(() => mapMyquranDoaItem({ status: false, message: 'data not found' }, 999)).toThrow(/tidak ditemukan/);
  });
});

describe('Arbain per nomor (halaman detail)', () => {
  it('/v2/hadits/arbain/1 → satu hadits, sama dengan item di daftar lengkap', () => {
    const one = mapArbainItem(arbain1, 1);
    const fromList = mapArbain(arbain).find((h) => h.number === 1);
    expect(one).toMatchObject({ book: 'arbain', number: 1, title: 'Amalan Bergantung pada Niat' });
    expect(one.arab).toBe(fromList.arab);
    expect(one.translation).toBe(fromList.translation);
  });
  it('nomor di luar 1–42 → NOT_FOUND', () => {
    expect(() => mapArbainItem({ status: false, message: 'data not found' }, 99)).toThrow(/tidak ditemukan/);
  });
});

describe('jadwal sholat', () => {
  it('daftar kota', () => {
    const cities = mapCities(kota);
    expect(cities.length).toBeGreaterThan(500);
    expect(cities.find((c) => c.id === '1301')?.name).toBe('KOTA JAKARTA');
  });
  it('jadwal bulanan tervalidasi & zona waktu', () => {
    const s = mapSchedule(jadwal, '1301', 2026, 10);
    expect(s.days).toHaveLength(31);
    expect(s.timezone).toBe('WIB');
    expect(s.days[0].times.subuh).toMatch(/^\d{2}:\d{2}$/);
  });
  it('ID kota berawalan nol (Sumatra) tetap cocok walau API mengirim angka', () => {
    expect(jadwalAceh.data.id).toBe(105);
    const s = mapSchedule(jadwalAceh, '0105', 2026, 10);
    expect(s.cityId).toBe('0105');
    expect(s.city).toBe('KAB. ACEH SELATAN');
    expect(s.timezone).toBe('WIB');
    expect(s.days).toHaveLength(31);
    expect(() => mapSchedule(jadwalAceh, '0106', 2026, 10)).toThrow(/tidak cocok/);
  });
  it('jadwal dengan format waktu rusak ditolak', () => {
    const broken = clone(jadwal);
    broken.data.jadwal[3].subuh = '4.12';
    expect(() => mapSchedule(broken, '1301', 2026, 10)).toThrow(/subuh/);
  });
  it('status false → NOT_FOUND', () => {
    expect(() => mapSchedule({ status: false }, '9999', 2026, 10)).toThrow(/tidak ditemukan/);
  });
  it('referensi Hijriah myQuran', () => {
    expect(mapHijriReference(hijr)).toMatchObject({ day: 12, month: 5, year: 1448 });
  });
});

describe('hadits', () => {
  it('kitab & halaman', () => {
    expect(mapBooks(booksJson)).toHaveLength(9);
    const page = mapPage(muslimP2, 'muslim', 2);
    expect(page.items.map((h) => h.number)).toEqual([4, 5, 6]);
    expect(page.items[0].translation).toBeTruthy();
    expect(() => mapPage(muslimP2, 'muslim', 3)).toThrow();
  });
  it('myQuran per nomor & Arbain', () => {
    expect(mapMyquranHadith(bukhari1, 'bukhari', 1)).toMatchObject({ book: 'bukhari', number: 1 });
    expect(() => mapMyquranHadith({ status: false, message: 'nomor kurang dari 1' }, 'bukhari', 0)).toThrow(/nomor/);
    const a = mapArbain(arbain);
    expect(a[0]).toMatchObject({ book: 'arbain', number: 1 });
    expect(a[0].title).toBeTruthy();
  });
});

describe('harga emas', () => {
  it('XAU→IDR per gram', () => {
    const g = mapGold(xau);
    expect(g.perGram).toBe(Math.round(xau.xau.idr / 31.1034768));
    expect(g.date).toBe(xau.date);
  });
  it('tanpa harga → ditolak', () => {
    expect(() => mapGold({ date: '2026-10-24', xau: {} })).toThrow();
  });
});
