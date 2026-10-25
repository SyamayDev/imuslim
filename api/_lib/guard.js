// Penjaga bersama endpoint publik push: server sudah dikonfigurasi + batas 30 permintaan/menit per IP.
import { readiness } from './env.js';
import { HttpError } from './http.js';
import { redis } from './redis.js';

export async function guard(request) {
  if (!readiness().ok) throw new HttpError(503, 'Notifikasi push belum dikonfigurasi di server');
  const ip = (request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim().slice(0, 64);
  const [n] = await redis([['INCR', `push:rl:${ip}`], ['EXPIRE', `push:rl:${ip}`, 60, 'NX']]);
  if (n > 30) throw new HttpError(429, 'Terlalu banyak permintaan, coba lagi sebentar');
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
