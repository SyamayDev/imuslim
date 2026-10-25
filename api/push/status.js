// POST /api/push/status/ {endpoint} → apakah langganan perangkat ini tersimpan di server, dan hasil
// pengiriman terjadwal terakhirnya. Aplikasi memakainya untuk memperbaiki diri (langganan hilang →
// daftar ulang) dan menampilkan "notifikasi terakhir" secara jujur.
import { guard } from '../_lib/guard.js';
import { handle, json, preflight, readJson } from '../_lib/http.js';
import { getSubscription, lastDelivery, subId, validateEndpoint } from '../_lib/subs.js';

export const OPTIONS = preflight;

export const POST = handle(async (request) => {
  await guard(request);
  const endpoint = validateEndpoint((await readJson(request))?.endpoint);
  const sub = await getSubscription(endpoint);
  if (!sub) return json(request, 200, { subscribed: false });
  return json(request, 200, { subscribed: true, cityId: sub.cityId, adzan: sub.adzan, imsak: sub.imsak, last: await lastDelivery(subId(endpoint)) });
});
