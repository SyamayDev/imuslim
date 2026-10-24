// Utilitas waktu sholat yang sadar zona waktu kota (WIB/WITA/WIT).
// Indonesia tidak memakai DST, sehingga offset tetap: WIB +7, WITA +8, WIT +9.

export const TIMEZONES = {
  WIB: { label: 'WIB', iana: 'Asia/Jakarta', offset: 7 },
  WITA: { label: 'WITA', iana: 'Asia/Makassar', offset: 8 },
  WIT: { label: 'WIT', iana: 'Asia/Jayapura', offset: 9 },
};

// Prefiks 2 digit ID kota myQuran → provinsi (diverifikasi dari respons API 24-10-2026).
const PREFIX_TZ = {
  '01': 'WIB', '02': 'WIB', '03': 'WIB', '04': 'WIB', '05': 'WIB', '06': 'WIB', '07': 'WIB', '08': 'WIB',
  '09': 'WIB', '10': 'WIB', '11': 'WIB', '12': 'WIB', '13': 'WIB', '14': 'WIB', '15': 'WIB', '16': 'WIB',
  '17': 'WITA', '18': 'WITA', '19': 'WITA', '20': 'WIB', '21': 'WITA', '22': 'WIB', '23': 'WITA', '24': 'WITA',
  '25': 'WITA', '26': 'WITA', '27': 'WITA', '28': 'WITA', '29': 'WITA', '30': 'WITA',
  '31': 'WIT', '32': 'WIT', '33': 'WIT', '34': 'WIT',
};

const WITA_REGIONS = ['BALI', 'NUSA TENGGARA', 'KALIMANTAN SELATAN', 'KALIMANTAN TIMUR', 'KALIMANTAN UTARA', 'SULAWESI', 'GORONTALO'];
const WIT_REGIONS = ['MALUKU', 'PAPUA'];

export function timezoneForRegion(region) {
  const r = String(region || '').toUpperCase();
  if (!r) return null;
  if (WIT_REGIONS.some((k) => r.includes(k))) return 'WIT';
  if (WITA_REGIONS.some((k) => r.includes(k))) return 'WITA';
  return 'WIB';
}

export function timezoneForCity(cityId, region) {
  return timezoneForRegion(region) ?? PREFIX_TZ[String(cityId).slice(0, 2)] ?? 'WIB';
}

const pad = (n) => String(n).padStart(2, '0');

/** Tanggal & jam "dinding" di zona waktu kota untuk instan tertentu. */
export function wallClock(nowMs, tz) {
  const offset = TIMEZONES[tz]?.offset ?? 7;
  const d = new Date(nowMs + offset * 3600000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds(),
    iso: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
  };
}

/** Instan (ms epoch) dari tanggal ISO + "HH:MM" di zona waktu kota. */
export function instantOf(isoDate, hhmm, tz) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const offset = TIMEZONES[tz]?.offset ?? 7;
  return Date.UTC(y, m - 1, d, hh, mm) - offset * 3600000;
}

export function addDaysIso(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export const PRAYER_LABELS = {
  imsak: 'Imsak',
  subuh: 'Subuh',
  terbit: 'Terbit',
  dhuha: 'Dhuha',
  dzuhur: 'Dzuhur',
  ashar: 'Ashar',
  maghrib: 'Maghrib',
  isya: 'Isya',
};
export const ORDER = ['imsak', 'subuh', 'terbit', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'];
/** Waktu yang merupakan sholat wajib (untuk adzan). */
export const OBLIGATORY = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];

/**
 * Tentukan waktu berikutnya & yang sedang berlangsung.
 * @param days daftar hari {date, times} (minimal hari ini; besok opsional)
 */
export function getPrayerStatus(days, nowMs, tz) {
  const today = wallClock(nowMs, tz).iso;
  const byDate = new Map(days.map((d) => [d.date, d]));
  const todayData = byDate.get(today);
  if (!todayData) return null;
  const events = ORDER.map((key) => ({ key, label: PRAYER_LABELS[key], time: todayData.times[key], at: instantOf(today, todayData.times[key], tz) }));
  let next = events.find((e) => e.at > nowMs) ?? null;
  let nextIsTomorrow = false;
  if (!next) {
    const tomorrow = byDate.get(addDaysIso(today, 1));
    if (tomorrow) {
      // Setelah Isya, waktu berikutnya adalah waktu pertama esok hari (Imsak), sama seperti versi lama.
      const t = addDaysIso(today, 1);
      next = { key: 'imsak', label: PRAYER_LABELS.imsak, time: tomorrow.times.imsak, at: instantOf(t, tomorrow.times.imsak, tz) };
      nextIsTomorrow = true;
    }
  }
  const passed = events.filter((e) => e.at <= nowMs);
  // Sholat wajib yang waktunya sedang berjalan (terakhir masuk).
  const current = [...passed].reverse().find((e) => OBLIGATORY.includes(e.key)) ?? null;
  return { today, events, next, nextIsTomorrow, current, passedKeys: new Set(passed.map((e) => e.key)) };
}

export function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function describeCountdown(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} menit lagi`;
  if (m === 0) return `${h} jam lagi`;
  return `${h} jam ${m} menit lagi`;
}

/** Zona waktu perangkat sama dengan zona kota? (untuk catatan di UI) */
export function deviceMatchesTz(tz, nowMs = Date.now()) {
  const deviceOffsetH = -new Date(nowMs).getTimezoneOffset() / 60;
  return deviceOffsetH === (TIMEZONES[tz]?.offset ?? 7);
}
