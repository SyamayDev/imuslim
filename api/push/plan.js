// GET /api/push/plan/ — Vercel Cron harian (cadangan): jadwalkan notifikasi hari ini & besok untuk
// semua kota yang punya pelanggan. Dilindungi CRON_SECRET (Vercel mengirimnya otomatis).
import { config, readiness } from '../_lib/env.js';
import { handle, HttpError, json } from '../_lib/http.js';
import { redis } from '../_lib/redis.js';
import { planCity } from '../_lib/schedule.js';
import { K } from '../_lib/subs.js';

export const maxDuration = 60;

export const GET = handle(async (request) => {
  const c = config();
  if (!c.cronSecret || request.headers.get('authorization') !== `Bearer ${c.cronSecret}`) throw new HttpError(401, 'Tidak diizinkan');
  if (!readiness(c).ok) throw new HttpError(503, 'Belum dikonfigurasi');
  const [cities] = await redis([['SMEMBERS', K.cities]], c);
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < cities.length) {
        const cityId = cities[next++];
        try {
          results.push(await planCity(cityId, Date.now(), { c }));
        } catch (error) {
          results.push({ cityId, error: error?.message ?? String(error) });
        }
      }
    }),
  );
  return json(request, 200, { ok: true, cities: cities.length, planned: results.reduce((n, r) => n + (r.planned ?? 0), 0), errors: results.filter((r) => r.error) });
});
