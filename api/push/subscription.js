// POST   /api/push/subscription/ → simpan/ubah langganan {subscription, cityId, adzan, imsak}
// DELETE /api/push/subscription/ → hapus langganan {endpoint}
import { guard } from '../_lib/guard.js';
import { handle, json, preflight, readJson } from '../_lib/http.js';
import { planCity } from '../_lib/schedule.js';
import { lastDelivery, removeSubscription, saveSubscription, subId, validateEndpoint, validateInput } from '../_lib/subs.js';

export const maxDuration = 30;
export const OPTIONS = preflight;

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
  const last = await lastDelivery(subId(input.endpoint));
  return json(request, 200, { ok: true, cityId: input.cityId, adzan: input.adzan, imsak: input.imsak, planned, last });
});

export const DELETE = handle(async (request) => {
  await guard(request);
  const body = await readJson(request);
  const removed = await removeSubscription(validateEndpoint(body?.endpoint));
  return json(request, 200, { ok: true, removed });
});
