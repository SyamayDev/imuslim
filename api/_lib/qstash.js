// Upstash QStash: menjadwalkan pemanggilan endpoint pada detik tertentu (Upstash-Not-Before),
// plus verifikasi tanda tangan JWT (HS256) agar endpoint "fire" hanya bisa dipicu QStash.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './env.js';

/**
 * Kirim beberapa pesan terjadwal sekaligus.
 * @param {{ url: string, body: object, notBefore: number, dedupId: string }[]} messages notBefore = detik epoch
 */
export async function publishBatch(messages, c = config()) {
  if (!messages.length) return [];
  const res = await fetch(`${c.qstashUrl.replace(/\/+$/, '')}/v2/batch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.qstashToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(
      messages.map((m) => ({
        destination: m.url,
        headers: {
          'Content-Type': 'application/json',
          'Upstash-Not-Before': String(m.notBefore),
          'Upstash-Deduplication-Id': m.dedupId,
          'Upstash-Retries': '2',
        },
        body: JSON.stringify(m.body),
      })),
    ),
  });
  if (!res.ok) throw new Error(`QStash HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unpad = (s) => String(s).replace(/=+$/, '');

/**
 * Verifikasi header Upstash-Signature terhadap body mentah.
 * Mengembalikan true bila valid dengan salah satu kunci penandatanganan (current/next).
 */
export function verifySignature(token, rawBody, keys = config().qstashSigningKeys, nowSec = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string' || token.split('.').length !== 3) return false;
  const [h, p, s] = token.split('.');
  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  if (header.alg !== 'HS256') return false;
  const sig = Buffer.from(unpad(s), 'base64url');
  const signedOk = keys.some((key) => {
    const expect = createHmac('sha256', key).update(`${h}.${p}`).digest();
    return expect.length === sig.length && timingSafeEqual(expect, sig);
  });
  if (!signedOk) return false;
  if (payload.iss !== 'Upstash') return false;
  const leeway = 60;
  if (typeof payload.exp === 'number' && nowSec > payload.exp + leeway) return false;
  if (typeof payload.nbf === 'number' && nowSec + leeway < payload.nbf) return false;
  const bodyHash = b64url(createHash('sha256').update(rawBody ?? '').digest());
  return unpad(payload.body) === bodyHash;
}

/** Untuk tes: buat token bertanda tangan seperti QStash. */
export function signForTest(rawBody, key, { url = 'https://example.test/api/push/fire/', nowSec = Math.floor(Date.now() / 1000) } = {}) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(
    JSON.stringify({ iss: 'Upstash', sub: url, iat: nowSec, nbf: nowSec, exp: nowSec + 300, jti: 'test', body: b64url(createHash('sha256').update(rawBody).digest()) }),
  );
  const s = b64url(createHmac('sha256', key).update(`${h}.${p}`).digest());
  return `${h}.${p}.${s}`;
}
