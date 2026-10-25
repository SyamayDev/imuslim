// GET /api/push/config/ → apakah notifikasi saat aplikasi ditutup aktif + kunci publik VAPID.
import { config, readiness } from '../_lib/env.js';
import { handle, json, preflight } from '../_lib/http.js';

export const OPTIONS = preflight;

export const GET = handle(async (request) => {
  const c = config();
  const { ok } = readiness(c);
  return json(request, 200, { enabled: ok, publicKey: ok ? c.vapidPublic : null });
});
