// POST   /api/push/subscription/ → simpan/ubah langganan {subscription, cityId, adzan, imsak}
// DELETE /api/push/subscription/ → hapus langganan {endpoint}
import { readiness } from '../_lib/env.js';
import { handle, HttpError, json, preflight, readJson } from '../_lib/http.js';
import { redis } from '../_lib/redis.js';
import { planCity } from '../_lib/schedule.js';
import { removeSubscription, saveSubscription, validateEndpoint, validateInput } from '../_lib/subs.js';

export const maxDuration = 30;
export const OPTIONS = preflight;

async function guard(request) {
  if (!readiness().ok) throw new HttpError(503, 'Notifikasi push belum dikonfigurasi di server');
  // batas sederhana: 30 permintaan/menit per IP
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim().slice(0, 64);
  const [n] = await redis([['INCR', `push:rl:${ip}`], ['EXPIRE', `push:rl:${ip}`, 60, 'NX']]);
  if (n > 30) throw new HttpError(429, 'Terlalu banyak permintaan, coba lagi sebentar');
}

export const POST = handle(async (request) => {
  await guard(request);
  const input = validateInput(await readJson(request));
  await saveSubscription(input);
  let planned = null;
  if (input.adzan || input.imsak) {
    try {
      planned = (await planCity(input.cityId)).planned;
    } catch (error) {
      // langganan tetap tersimpan; cron harian/pemicu berikutnya akan menjadwalkan ulang
      console.error('[push] gagal menjadwalkan', input.cityId, error?.message);
    }
  }
  return json(request, 200, { ok: true, cityId: input.cityId, adzan: input.adzan, imsak: input.imsak, planned });
});

export const DELETE = handle(async (request) => {
  await guard(request);
  const body = await readJson(request);
  const removed = await removeSubscription(validateEndpoint(body?.endpoint));
  return json(request, 200, { ok: true, removed });
});
