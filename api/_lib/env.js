// Konfigurasi server push. Semua nilai rahasia hanya ada di environment variable Vercel
// (bukan VITE_*), tidak pernah dikirim ke browser kecuali kunci publik VAPID.

const pick = (...names) => {
  for (const n of names) if (process.env[n]) return process.env[n];
  return '';
};

export function config() {
  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || 'imuslim-seven.vercel.app';
  return {
    vapidPublic: pick('VAPID_PUBLIC_KEY'),
    vapidPrivate: pick('VAPID_PRIVATE_KEY'),
    // Subjek VAPID: kontak untuk layanan push. Memakai URL situs, bukan email pribadi.
    vapidSubject: pick('VAPID_SUBJECT') || `https://${prodHost}`,
    // Upstash Redis — nama variabel integrasi Vercel Marketplace (KV_*) atau Upstash langsung.
    redisUrl: pick('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL'),
    redisToken: pick('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN'),
    // Upstash QStash — penjadwal pesan tepat waktu.
    qstashUrl: pick('QSTASH_URL') || 'https://qstash.upstash.io',
    qstashToken: pick('QSTASH_TOKEN'),
    qstashSigningKeys: [pick('QSTASH_CURRENT_SIGNING_KEY'), pick('QSTASH_NEXT_SIGNING_KEY')].filter(Boolean),
    cronSecret: pick('CRON_SECRET'),
    // URL publik endpoint "fire" yang dipanggil QStash (harus domain produksi, bukan pratinjau).
    publicBase: pick('PUSH_PUBLIC_BASE') || `https://${prodHost}`,
  };
}

/** Apakah semua komponen push sudah dikonfigurasi? */
export function readiness(c = config()) {
  const missing = [];
  if (!c.vapidPublic || !c.vapidPrivate) missing.push('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY');
  if (!c.redisUrl || !c.redisToken) missing.push('Upstash Redis (KV_REST_API_URL/KV_REST_API_TOKEN)');
  if (!c.qstashToken || !c.qstashSigningKeys.length) missing.push('Upstash QStash (QSTASH_TOKEN & signing keys)');
  return { ok: missing.length === 0, missing };
}
