// Jadwal sholat di server: data myQuran yang sama dengan aplikasi (mapSchedule & util zona waktu
// dari src/), di-cache di Redis, lalu tiap waktu sholat dijadwalkan ke QStash tepat di menitnya.
import { mapSchedule } from '../../src/services/api/sholat.js';
import { addDaysIso, instantOf, OBLIGATORY, PRAYER_LABELS, TIMEZONES, wallClock } from '../../src/utils/prayer.js';
import { config } from './env.js';
import { publishBatch } from './qstash.js';
import { redis } from './redis.js';
import { K } from './subs.js';

const API = 'https://api.myquran.com/v2/sholat/jadwal';

/** Jadwal satu bulan (dari cache Redis atau API myQuran). */
export async function monthSchedule(cityId, year, month, { fetchImpl = fetch, c = config() } = {}) {
  const mm = String(month).padStart(2, '0');
  const key = `push:jadwal:${cityId}:${year}-${mm}`;
  const [cached] = await redis([['GET', key]], c);
  if (cached) return JSON.parse(cached);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetchImpl(`${API}/${cityId}/${year}/${mm}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`myQuran HTTP ${res.status}`);
    const data = mapSchedule(await res.json(), cityId, year, month);
    await redis([['SET', key, JSON.stringify(data), 'EX', 40 * 86400]], c);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Waktu (ms epoch) yang perlu dikirimi notifikasi untuk satu kota pada tanggal-tanggal tertentu. */
export function eventsFor(schedules, dates, { imsak }) {
  const keys = [...(imsak ? ['imsak'] : []), ...OBLIGATORY];
  const out = [];
  for (const date of dates) {
    const sched = schedules.find((s) => s.days.some((d) => d.date === date));
    const day = sched?.days.find((d) => d.date === date);
    if (!day) continue;
    for (const key of keys) {
      out.push({
        key,
        date,
        time: day.times[key],
        at: instantOf(date, day.times[key], sched.timezone),
        tz: sched.timezone,
        city: sched.city,
      });
    }
  }
  return out;
}

/**
 * Jadwalkan notifikasi hari ini & besok untuk satu kota (idempoten: tiap kota+tanggal+waktu
 * hanya dijadwalkan sekali berkat kunci SET NX di Redis + Upstash-Deduplication-Id).
 */
export async function planCity(cityId, now = Date.now(), { fetchImpl = fetch, c = config() } = {}) {
  const tzGuess = 'WIB';
  // Ambil bulan berjalan (dan bulan berikutnya bila "besok" jatuh di bulan baru).
  const first = await monthSchedule(cityId, ...ym(wallClock(now, tzGuess).iso), { fetchImpl, c });
  const tz = first.timezone;
  const today = wallClock(now, tz).iso;
  const tomorrow = addDaysIso(today, 1);
  const schedules = [first];
  for (const d of [today, tomorrow]) {
    const [y, m] = ym(d);
    if (!schedules.some((s) => s.year === y && s.month === m)) schedules.push(await monthSchedule(cityId, y, m, { fetchImpl, c }));
  }
  const [imsakCount] = await redis([['SCARD', K.cityImsak(cityId)]], c);
  const events = eventsFor(schedules, [today, tomorrow], { imsak: imsakCount > 0 }).filter((e) => e.at > now + 20000);
  if (!events.length) return { cityId, planned: 0 };

  const flags = await redis(
    events.map((e) => ['SET', `push:sched:${cityId}:${e.date}:${e.key}`, '1', 'NX', 'EX', 3 * 86400]),
    c,
  );
  const fresh = events.filter((_, i) => flags[i] === 'OK');
  const flagKey = (e) => `push:sched:${cityId}:${e.date}:${e.key}`;
  const url = `${c.publicBase.replace(/\/+$/, '')}/api/push/fire/`;
  let results;
  try {
    results = await publishBatch(
      fresh.map((e) => ({
        url,
        notBefore: Math.floor(e.at / 1000),
        dedupId: `imuslim-${cityId}-${e.date}-${e.key}`,
        body: { cityId, date: e.date, key: e.key, time: e.time, at: e.at, tz: e.tz, city: e.city },
      })),
      c,
    );
  } catch (error) {
    // Lepas penanda agar percobaan berikutnya (cron/fire/langganan) menjadwalkan ulang.
    if (fresh.length) await redis(fresh.map((e) => ['DEL', flagKey(e)]), c).catch(() => {});
    throw error;
  }
  // QStash bisa menolak sebagian pesan dalam satu batch.
  const failed = fresh.filter((_, i) => Array.isArray(results) && results[i]?.error);
  if (failed.length) await redis(failed.map((e) => ['DEL', flagKey(e)]), c);
  return { cityId, planned: fresh.length - failed.length };
}

function ym(iso) {
  const [y, m] = iso.split('-').map(Number);
  return [y, m];
}

/** Isi notifikasi untuk satu waktu sholat. */
export function payloadFor(ev) {
  const label = PRAYER_LABELS[ev.key] ?? ev.key;
  const title = ev.key === 'imsak' ? 'Waktu imsak telah tiba' : `Waktu ${label} telah tiba`;
  const body = `${ev.time} ${TIMEZONES[ev.tz]?.label ?? ''} · ${ev.city}${ev.key === 'imsak' ? '' : ' — ketuk untuk memutar adzan'}`;
  return {
    type: 'prayer',
    title,
    body,
    key: ev.key,
    at: ev.at,
    tag: `${ev.date}:${ev.key}`,
    url: `sholat/?adzan=${encodeURIComponent(ev.key)}&at=${ev.at}`,
  };
}
