// Penyimpanan langganan push di Redis.
// Yang disimpan hanya: alamat langganan push browser (+ kunci enkripsinya), ID kota, dan
// pilihan adzan/imsak — tidak ada data pribadi lain. Dihapus saat pengguna mematikannya.
import { createHash } from 'node:crypto';
import { HttpError } from './http.js';
import { redis } from './redis.js';

/** Host layanan push resmi browser (mencegah server dipakai mengirim request ke URL lain). */
const PUSH_HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', 'push.services.mozilla.com', 'notify.windows.com', 'push.apple.com'];
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export const K = {
  sub: (id) => `push:sub:${id}`,
  city: (cityId) => `push:city:${cityId}`,
  cityImsak: (cityId) => `push:cityimsak:${cityId}`,
  cities: 'push:cities',
};

export function subId(endpoint) {
  return createHash('sha256').update(endpoint).digest('base64url').slice(0, 24);
}

export function validateEndpoint(endpoint) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new HttpError(400, 'Endpoint langganan tidak valid');
  }
  if (url.protocol !== 'https:' || !PUSH_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) {
    throw new HttpError(400, 'Endpoint bukan layanan push yang dikenal');
  }
  if (endpoint.length > 1024) throw new HttpError(400, 'Endpoint terlalu panjang');
  return endpoint;
}

export function validateInput(body) {
  const sub = body?.subscription;
  const endpoint = validateEndpoint(sub?.endpoint);
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !B64URL.test(p256dh) || !B64URL.test(auth) || p256dh.length > 200 || auth.length > 64) {
    throw new HttpError(400, 'Kunci langganan tidak valid');
  }
  const cityId = String(body?.cityId ?? '');
  if (!/^\d{4}$/.test(cityId)) throw new HttpError(400, 'ID kota tidak valid');
  return {
    endpoint,
    keys: { p256dh, auth },
    cityId,
    adzan: body?.adzan === true,
    imsak: body?.imsak === true,
  };
}

/** Simpan/ubah langganan; pindahkan antarkota bila kotanya berganti. */
export async function saveSubscription(input, now = Date.now()) {
  const id = subId(input.endpoint);
  const [prevRaw] = await redis([['GET', K.sub(id)]]);
  const prev = prevRaw ? JSON.parse(prevRaw) : null;
  const record = { ...input, createdAt: prev?.createdAt ?? now, updatedAt: now };
  const cmds = [['SET', K.sub(id), JSON.stringify(record)], ['SADD', K.city(input.cityId), id], ['SADD', K.cities, input.cityId]];
  cmds.push(input.imsak ? ['SADD', K.cityImsak(input.cityId), id] : ['SREM', K.cityImsak(input.cityId), id]);
  if (prev && prev.cityId !== input.cityId) cmds.push(['SREM', K.city(prev.cityId), id], ['SREM', K.cityImsak(prev.cityId), id]);
  await redis(cmds);
  if (prev && prev.cityId !== input.cityId) await dropCityIfEmpty(prev.cityId);
  return { id, record };
}

export async function removeSubscription(endpoint) {
  const id = subId(endpoint);
  const [prevRaw] = await redis([['GET', K.sub(id)]]);
  if (!prevRaw) return false;
  const prev = JSON.parse(prevRaw);
  await redis([['DEL', K.sub(id)], ['SREM', K.city(prev.cityId), id], ['SREM', K.cityImsak(prev.cityId), id]]);
  await dropCityIfEmpty(prev.cityId);
  return true;
}

async function dropCityIfEmpty(cityId) {
  const [n] = await redis([['SCARD', K.city(cityId)]]);
  if (!n) await redis([['SREM', K.cities, cityId]]);
}

export async function getSubscription(endpoint) {
  const [raw] = await redis([['GET', K.sub(subId(endpoint))]]);
  return raw ? JSON.parse(raw) : null;
}

/** Semua langganan aktif untuk satu kota. */
export async function citySubscriptions(cityId) {
  const [ids] = await redis([['SMEMBERS', K.city(cityId)]]);
  if (!ids?.length) return [];
  const [raws] = await redis([['MGET', ...ids.map(K.sub)]]);
  return raws.map((r, i) => (r ? { id: ids[i], ...JSON.parse(r) } : null)).filter(Boolean);
}

export async function removeById(id, cityId) {
  await redis([['DEL', K.sub(id)], ['SREM', K.city(cityId), id], ['SREM', K.cityImsak(cityId), id]]);
}
