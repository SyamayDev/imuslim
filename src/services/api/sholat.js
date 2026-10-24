// Jadwal sholat & imsakiyah dari api.myquran.com/v2 (daftar 518 kota/kabupaten).
// Tidak ada perhitungan waktu sholat lokal: bila API gagal, hanya cache lama (ditandai) yang dipakai.
import { ApiError, ERROR_KIND } from './errors.js';
import { assert, cachedRequest, DAY, fetchJson } from './client.js';
import { timezoneForCity } from '../../utils/prayer.js';

const BASE = 'https://api.myquran.com/v2/sholat';
export const PRAYER_KEYS = ['imsak', 'subuh', 'terbit', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function mapCities(json) {
  assert(json && json.status === true && Array.isArray(json.data), 'Respons daftar kota tidak valid');
  const cities = json.data
    .filter((c) => typeof c.id === 'string' && /^\d{4}$/.test(c.id) && typeof c.lokasi === 'string')
    .map((c) => ({ id: c.id, name: c.lokasi.trim() }));
  assert(cities.length > 100, 'Daftar kota tidak lengkap');
  return cities;
}

export function getCities({ signal, force } = {}) {
  return cachedRequest({
    key: 'sholat:cities',
    ttl: 30 * DAY,
    force,
    signal,
    load: (s) => fetchJson(`${BASE}/kota/semua`, { signal: s, validate: mapCities }),
  });
}

export function mapSchedule(json, cityId, year, month) {
  if (json && json.status === false) throw new ApiError(ERROR_KIND.NOT_FOUND, 'Jadwal untuk kota ini tidak ditemukan');
  assert(json && json.status === true && json.data && Array.isArray(json.data.jadwal), 'Respons jadwal tidak valid');
  const d = json.data;
  assert(String(d.id) === String(cityId), 'ID kota pada respons tidak cocok');
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const days = d.jadwal.map((day) => {
    assert(typeof day.date === 'string' && DATE_RE.test(day.date) && day.date.startsWith(prefix), 'Tanggal jadwal tidak valid');
    const times = {};
    for (const key of PRAYER_KEYS) {
      assert(typeof day[key] === 'string' && TIME_RE.test(day[key]), `Waktu ${key} tidak valid pada ${day.date}`);
      times[key] = day[key];
    }
    return { date: day.date, label: typeof day.tanggal === 'string' ? day.tanggal : day.date, times };
  });
  assert(days.length >= 28 && days.length <= 31, 'Jumlah hari dalam jadwal bulanan tidak wajar');
  return {
    cityId: String(d.id),
    city: String(d.lokasi ?? '').trim(),
    region: String(d.daerah ?? '').trim(),
    timezone: timezoneForCity(String(d.id), d.daerah),
    year,
    month,
    days,
  };
}

export function getMonthlySchedule(cityId, year, month, { signal, force } = {}) {
  const mm = String(month).padStart(2, '0');
  return cachedRequest({
    key: `sholat:jadwal:${cityId}:${year}-${mm}`,
    ttl: 30 * DAY,
    force,
    signal,
    load: (s) => fetchJson(`${BASE}/jadwal/${encodeURIComponent(cityId)}/${year}/${mm}`, { signal: s, validate: (j) => mapSchedule(j, cityId, year, month) }),
  });
}

// Referensi tanggal Hijriah dari myQuran (memakai penyesuaian −1 dari algoritmenya).
export function mapHijriReference(json) {
  assert(json && json.status === true && Array.isArray(json.data?.num) && json.data.num.length === 7, 'Respons Hijriah tidak valid');
  const [, , , , day, month, year] = json.data.num;
  assert([day, month, year].every(Number.isInteger), 'Tanggal Hijriah tidak valid');
  return { day, month, year, label: String(json.data.date?.[1] ?? ''), adj: json.request?.adj ?? null };
}

export function getHijriReference(isoDate, { signal, force } = {}) {
  return cachedRequest({
    key: `hijri:ref:${isoDate}`,
    ttl: 7 * DAY,
    force,
    signal,
    load: (s) => fetchJson(`https://api.myquran.com/v2/cal/hijr/${isoDate}`, { signal: s, validate: mapHijriReference }),
  });
}
