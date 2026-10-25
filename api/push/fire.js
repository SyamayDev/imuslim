// POST /api/push/fire/ — dipanggil Upstash QStash tepat saat waktu sholat masuk untuk satu kota.
// Hanya menerima permintaan bertanda tangan QStash. Setelah mengirim, sekaligus memastikan
// jadwal hari ini & besok untuk kota itu sudah terpasang (rantai mandiri bila cron terlewat).
import { readiness } from '../_lib/env.js';
import { handle, HttpError, json } from '../_lib/http.js';
import { verifySignature } from '../_lib/qstash.js';
import { payloadFor, planCity } from '../_lib/schedule.js';
import { citySubscriptions, recordDeliveries, removeById } from '../_lib/subs.js';
import { sendMany } from '../_lib/webpush.js';

export const maxDuration = 60;
const LATE = 10 * 60 * 1000;
const GRACE = 15 * 60 * 1000;
const KEYS = ['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];

export const POST = handle(async (request) => {
  if (!readiness().ok) throw new HttpError(503, 'Belum dikonfigurasi');
  const raw = await request.text();
  if (!verifySignature(request.headers.get('upstash-signature'), raw)) throw new HttpError(401, 'Tanda tangan tidak valid');
  const ev = JSON.parse(raw);
  if (!/^\d{4}$/.test(String(ev.cityId)) || !KEYS.includes(ev.key) || !Number.isFinite(ev.at)) throw new HttpError(400, 'Pesan tidak valid');

  let sent = 0;
  let gone = 0;
  const all = await citySubscriptions(ev.cityId);
  if (Date.now() - ev.at <= LATE) {
    const subs = all.filter((s) => (ev.key === 'imsak' ? s.imsak : s.adzan));
    const payload = payloadFor(ev);
    const results = await sendMany(subs, () => payload);
    sent = results.filter((r) => r === 'ok').length;
    await recordDeliveries(subs, results, ev);
    // Langganan yang sangat baru bisa ditolak sesaat; hanya hapus yang sudah cukup lama.
    const dead = subs.filter((s, i) => results[i] === 'gone' && Date.now() - (s.createdAt ?? 0) > GRACE);
    gone = dead.length;
    await Promise.all(dead.map((s) => removeById(s.id, s.cityId)));
  }
  // Kota tanpa pelanggan lagi tidak dijadwalkan ulang (hemat kuota QStash).
  try {
    if (all.length > gone) await planCity(ev.cityId);
  } catch (error) {
    console.error('[push] rencana lanjutan gagal', ev.cityId, error?.message);
  }
  return json(request, 200, { ok: true, sent, gone, late: Date.now() - ev.at > LATE });
});
