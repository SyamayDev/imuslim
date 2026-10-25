// Jadwal myQuran (hasil mapSchedule) → daftar waktu untuk alarm adzan native Android.
// Instan dihitung dengan instantOf yang sama dengan pengingat web & server push, sehingga
// ketiganya berbunyi di menit yang sama.
import { instantOf, OBLIGATORY, TIMEZONES } from '../../utils/prayer.js';

const KEYS = ['imsak', ...OBLIGATORY];

/** Semua waktu (imsak + 5 waktu wajib) mulai tanggal fromIso, urut waktu. */
export function nativeEvents(schedules, fromIso) {
  const out = [];
  for (const s of schedules) {
    for (const d of s.days) {
      if (d.date < fromIso) continue;
      for (const key of KEYS) out.push({ key, date: d.date, time: d.times[key], at: instantOf(d.date, d.times[key], s.timezone) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Konfigurasi untuk AdzanAlarm.configure. schedules boleh kosong (mis. mematikan adzan). */
export function nativeConfig(prefs, schedules, fromIso) {
  const tz = schedules[0]?.timezone ?? 'WIB';
  const enabled = Boolean(prefs.cityId && (prefs.adzanEnabled || prefs.imsakAlert));
  return {
    enabled,
    adzan: Boolean(prefs.adzanEnabled),
    imsak: Boolean(prefs.imsakAlert),
    cityId: prefs.cityId ?? '',
    cityName: prefs.cityName ?? '',
    tz,
    offsetHours: TIMEZONES[tz]?.offset ?? 7,
    events: enabled ? nativeEvents(schedules, fromIso) : [],
  };
}
