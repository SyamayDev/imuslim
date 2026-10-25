// POST /api/push/test/ {endpoint} → kirim satu notifikasi uji ke langganan itu saja.
import { guard, sleep } from '../_lib/guard.js';
import { handle, HttpError, json, preflight, readJson } from '../_lib/http.js';
import { redis } from '../_lib/redis.js';
import { getSubscription, subId, validateEndpoint } from '../_lib/subs.js';
import { sendPush } from '../_lib/webpush.js';

export const maxDuration = 30;
export const OPTIONS = preflight;

const YOUNG = 3 * 60 * 1000;

export const POST = handle(async (request) => {
  await guard(request);
  const endpoint = validateEndpoint((await readJson(request))?.endpoint);
  const sub = await getSubscription(endpoint);
  if (!sub) throw new HttpError(404, 'Langganan tidak ditemukan di server. Matikan lalu nyalakan lagi notifikasinya.');
  const id = subId(endpoint);
  const [first] = await redis([['SET', `push:test:${id}`, '1', 'NX', 'EX', 30]]);
  if (first !== 'OK') throw new HttpError(429, 'Tunggu 30 detik sebelum mengirim notifikasi uji lagi');
  const payload = {
    type: 'test',
    title: 'Notifikasi iMuslim berfungsi',
    body: 'Pengingat waktu sholat akan muncul seperti ini, walau iMuslim sedang ditutup.',
    key: 'test',
    tag: 'imuslim-test',
    url: 'sholat/',
  };
  let result = await sendPush(sub, payload);
  // Langganan yang baru dibuat kadang ditolak sesaat (404) karena tokennya belum aktif di
  // layanan push. Coba ulang sebentar, dan JANGAN hapus langganan dari uji ini: dulu
  // penghapusan di sini membuat langganan hilang diam-diam sehingga notifikasi terjadwal tidak pernah datang.
  const young = Date.now() - (sub.createdAt ?? 0) < YOUNG;
  for (let i = 0; result === 'gone' && young && i < 3; i++) {
    await sleep(5000);
    result = await sendPush(sub, payload);
  }
  return json(request, 200, { ok: result === 'ok', result });
});
