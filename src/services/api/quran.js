// Al-Qur'an: sumber utama equran.id API v2 (teks Arab, latin, terjemahan Kemenag, audio 6 qari).
// Cadangan detail surah: api.alquran.cloud (Uthmani + terjemahan Indonesia + audio Alafasy),
// dipetakan per nomor ayat (bukan per indeks array).
import surahIndex from '../../data/surah-index.json';
import { ApiError, ERROR_KIND } from './errors.js';
import { assert, cachedRequest, DAY, fetchJson } from './client.js';
import { QARI, DEFAULT_QARI } from './quran-constants.js';
import { stripArabicDiacritics } from '../../utils/text.js';

const EQURAN = 'https://equran.id/api/v2';
const ALQURAN_CLOUD = 'https://api.alquran.cloud/v1';

export { QARI, DEFAULT_QARI };

/** Indeks surah statis (diambil dari equran.id, total 6.236 ayat tervalidasi). */
export const SURAH_INDEX = surahIndex.surahs;
export const SURAH_INDEX_META = { source: surahIndex.source, fetchedAt: surahIndex.fetchedAt };

export function getSurahMeta(number) {
  return SURAH_INDEX[Number(number) - 1] ?? null;
}

export function isValidSurahNumber(n) {
  const num = Number(n);
  return Number.isInteger(num) && num >= 1 && num <= 114;
}

function validAudioMap(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (QARI[k] && typeof v === 'string' && v.startsWith('https://')) out[k] = v;
  }
  return out;
}

export function mapEquranSurah(json, number) {
  assert(json && json.code === 200 && json.data, 'Respons equran.id tidak berisi data surah');
  const d = json.data;
  assert(d.nomor === number, 'Nomor surah pada respons tidak cocok');
  assert(Array.isArray(d.ayat) && d.ayat.length === d.jumlahAyat, 'Jumlah ayat tidak sesuai metadata surah');
  const ayahs = d.ayat.map((a, i) => {
    assert(a.nomorAyat === i + 1, `Urutan ayat tidak valid pada indeks ${i}`);
    assert(typeof a.teksArab === 'string' && a.teksArab.length > 0, `Teks Arab ayat ${i + 1} kosong`);
    return {
      number: a.nomorAyat,
      arab: a.teksArab.trim(),
      latin: typeof a.teksLatin === 'string' ? a.teksLatin.trim() : '',
      translation: typeof a.teksIndonesia === 'string' ? a.teksIndonesia.trim() : '',
      audio: validAudioMap(a.audio),
    };
  });
  return {
    source: 'equran.id',
    number: d.nomor,
    name: d.nama,
    latin: d.namaLatin,
    meaning: d.arti,
    place: d.tempatTurun,
    ayahCount: d.jumlahAyat,
    description: typeof d.deskripsi === 'string' ? d.deskripsi : '',
    audioFull: validAudioMap(d.audioFull),
    ayahs,
  };
}

const stripBom = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
// alquran.cloud menyertakan basmalah di awal ayat 1 (kecuali Al-Fatihah & At-Taubah).
// Dicocokkan per kata tanpa harakat karena urutan tanda baca Unicode dari sumber bisa berbeda.
const BASMALAH_WORDS = ['بسم', 'الله', 'الرحمن', 'الرحيم'];
const ALEF_WASLA = String.fromCharCode(0x671);
const ALEF = String.fromCharCode(0x627);
const bare = (w) => stripArabicDiacritics(w).split(ALEF_WASLA).join(ALEF);
export function stripLeadingBasmalah(text) {
  const words = text.trim().split(' ').filter(Boolean);
  if (words.length > 4 && BASMALAH_WORDS.every((w, i) => bare(words[i]) === w)) return words.slice(4).join(' ');
  return text;
}

export function mapAlquranCloudSurah(json, number) {
  assert(json && json.code === 200 && Array.isArray(json.data) && json.data.length === 3, 'Respons alquran.cloud tidak lengkap');
  const [arab, indo, audio] = json.data;
  assert(arab.number === number && indo.number === number && audio.number === number, 'Nomor surah tidak cocok');
  const byNumber = (edition) => new Map(edition.ayahs.map((a) => [a.numberInSurah, a]));
  const indoMap = byNumber(indo);
  const audioMap = byNumber(audio);
  const meta = getSurahMeta(number);
  const ayahs = arab.ayahs.map((a, i) => {
    assert(a.numberInSurah === i + 1, 'Urutan ayat tidak valid');
    let text = stripBom(a.text);
    if (number !== 1 && number !== 9 && a.numberInSurah === 1) text = stripLeadingBasmalah(text);
    const audioUrl = audioMap.get(a.numberInSurah)?.audio;
    return {
      number: a.numberInSurah,
      arab: text.trim(),
      latin: '',
      translation: indoMap.get(a.numberInSurah)?.text?.trim() ?? '',
      audio: typeof audioUrl === 'string' && audioUrl.startsWith('https://') ? { '05': audioUrl } : {},
    };
  });
  return {
    source: 'alquran.cloud',
    number,
    name: meta?.name ?? arab.name,
    latin: meta?.latin ?? arab.englishName,
    meaning: meta?.meaning ?? arab.englishNameTranslation,
    place: meta?.place ?? arab.revelationType,
    ayahCount: arab.numberOfAyahs,
    description: '',
    audioFull: { '05': `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3` },
    ayahs,
  };
}

export function getSurah(number, { signal, force } = {}) {
  const n = Number(number);
  if (!isValidSurahNumber(n)) {
    return Promise.reject(new ApiError(ERROR_KIND.NOT_FOUND, 'Nomor surah harus 1–114'));
  }
  return cachedRequest({
    key: `quran:surah:${n}`,
    ttl: 30 * DAY,
    force,
    signal,
    load: (s) => fetchJson(`${EQURAN}/surat/${n}`, { signal: s, validate: (j) => mapEquranSurah(j, n), timeout: 15000 }),
    fallback: (s) =>
      fetchJson(`${ALQURAN_CLOUD}/surah/${n}/editions/quran-uthmani,id.indonesian,ar.alafasy`, {
        signal: s,
        validate: (j) => mapAlquranCloudSurah(j, n),
        timeout: 15000,
      }),
  });
}

export function mapTafsir(json, number) {
  assert(json && json.code === 200 && json.data?.nomor === number, 'Respons tafsir tidak valid');
  assert(Array.isArray(json.data.tafsir), 'Data tafsir tidak tersedia');
  const map = {};
  for (const t of json.data.tafsir) {
    if (Number.isInteger(t.ayat) && typeof t.teks === 'string') map[t.ayat] = t.teks.trim();
  }
  return map;
}

export function getTafsir(number, { signal, force } = {}) {
  const n = Number(number);
  return cachedRequest({
    key: `quran:tafsir:${n}`,
    ttl: 30 * DAY,
    force,
    signal,
    load: (s) => fetchJson(`${EQURAN}/tafsir/${n}`, { signal: s, validate: (j) => mapTafsir(j, n), timeout: 20000 }),
  });
}

// Ayat pilihan beranda. Rujukan dipilih manual; teks & terjemahan selalu diambil dari API.
export const DAILY_AYAH_REFS = [
  [94, 6], [65, 3], [55, 60], [2, 153], [31, 12], [2, 286], [13, 28], [39, 53], [3, 139], [2, 186],
  [94, 5], [29, 69], [65, 2], [2, 152], [3, 159], [49, 13], [16, 97], [8, 46], [3, 200], [40, 60],
  [2, 45], [20, 114], [17, 80], [14, 7], [11, 6], [33, 41], [9, 51], [57, 4], [28, 77], [4, 36],
];

export function mapAlquranCloudAyah(json, [s, a]) {
  assert(json && json.code === 200 && Array.isArray(json.data) && json.data.length === 2, 'Respons ayat tidak lengkap');
  const [arab, indo] = json.data;
  assert(arab.surah?.number === s && arab.numberInSurah === a, 'Rujukan ayat tidak cocok');
  let text = stripBom(arab.text);
  if (s !== 1 && s !== 9 && a === 1) text = stripLeadingBasmalah(text);
  return {
    surah: s,
    ayah: a,
    arab: text.trim(),
    translation: String(indo.text ?? '').trim(),
    surahLatin: getSurahMeta(s)?.latin ?? arab.surah.englishName,
    source: 'alquran.cloud (Uthmani · terjemahan Kemenag)',
  };
}

export function getAyah(ref, { signal, force } = {}) {
  const [s, a] = ref;
  return cachedRequest({
    key: `quran:ayah:${s}:${a}`,
    ttl: 60 * DAY,
    force,
    signal,
    load: (sig) =>
      fetchJson(`${ALQURAN_CLOUD}/ayah/${s}:${a}/editions/quran-uthmani,id.indonesian`, {
        signal: sig,
        validate: (j) => mapAlquranCloudAyah(j, ref),
      }),
    fallback: async (sig) => {
      const { data } = await getSurah(s, { signal: sig });
      const ayah = data.ayahs.find((x) => x.number === a);
      assert(ayah, 'Ayat tidak ditemukan');
      return { surah: s, ayah: a, arab: ayah.arab, translation: ayah.translation, surahLatin: data.latin, source: data.source };
    },
  });
}
