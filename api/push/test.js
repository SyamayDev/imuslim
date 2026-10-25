// POST /api/push/test/ {endpoint} → kirim satu notifikasi uji ke langganan itu saja.
import { readiness } from '../_lib/env.js';
import { handle, HttpError, json, preflight, readJson } from '../_lib/http.js';
import { redis } from '../_lib/redis.js';
import { getSubscription, removeById, subId, validateEndpoint } from '../_lib/subs.js';
import { sendPush } from '../_lib/webpush.js';

export const OPTIONS = preflight;

export const POST = handle(async (request) => {
  if (!readiness().ok) throw new HttpError(503, 'Notifikasi push belum dikonfigurasi di server');
  const endpoint = validateEndpoint((await readJson(request))?.endpoint);
  const sub = await getSubscription(endpoint);
  if (!sub) throw new HttpError(404, 'Langganan tidak ditemukan. Nyalakan ulang notifikasinya.');
  const id = subId(endpoint);
  const [first] = await redis([['SET', `push:test:${id}`, '1', 'NX', 'EX', 30]]);
  if (first !== 'OK') throw new HttpError(429, 'Tunggu 30 detik sebelum mengirim notifikasi uji lagi');
  const result = await sendPush(sub, {
    type: 'test',
    title: 'Notifikasi iMuslim berfungsi',
    body: 'Pengingat waktu sholat akan muncul seperti ini, walau iMuslim sedang ditutup.',
    key: 'test',
    tag: 'imuslim-test',
    url: 'sholat/',
  });
  if (result === 'gone') await removeById(id, sub.cityId);
  return json(request, 200, { ok: result === 'ok', result });
});
