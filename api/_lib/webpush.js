// Pengiriman Web Push (enkripsi aes128gcm + VAPID) lewat paket web-push.
import webpush from 'web-push';
import { config } from './env.js';

let configured = '';

function setup(c) {
  const sig = `${c.vapidPublic}|${c.vapidSubject}`;
  if (configured !== sig) {
    webpush.setVapidDetails(c.vapidSubject, c.vapidPublic, c.vapidPrivate);
    configured = sig;
  }
}

/**
 * Kirim satu notifikasi. TTL pendek & urgensi tinggi: adzan yang terlambat lebih dari
 * 10 menit tidak berguna, dan "high" membangunkan Android dari mode hemat daya (Doze).
 * @returns {'ok' | 'gone' | 'error'} 'gone' = langganan sudah tidak berlaku (hapus).
 */
export async function sendPush(sub, payload, { ttl = 600, c = config() } = {}) {
  setup(c);
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: ttl, urgency: 'high', topic: String(payload.key ?? 'imuslim').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || 'imuslim' });
    return 'ok';
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) return 'gone';
    console.error('[push] gagal kirim', error?.statusCode, error?.body?.slice?.(0, 200));
    return 'error';
  }
}

/** Kirim ke banyak langganan dengan konkurensi terbatas. */
export async function sendMany(subs, payloadOf, { concurrency = 20, ...opts } = {}) {
  const results = new Array(subs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, subs.length) }, async () => {
      while (next < subs.length) {
        const i = next++;
        results[i] = await sendPush(subs[i], payloadOf(subs[i]), opts);
      }
    }),
  );
  return results;
}
