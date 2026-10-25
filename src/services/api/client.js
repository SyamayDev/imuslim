import { ApiError, ERROR_KIND, isAbortError } from './errors.js';
import { cacheGet, cacheSet } from './cache.js';

const DEFAULT_TIMEOUT = 12000;
const inflight = new Map();

function abortError() {
  return new DOMException('Permintaan dibatalkan', 'AbortError');
}

/** Bungkus promise agar bisa dibatalkan pemanggil tanpa membatalkan request bersama. */
export function withSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
}

function sleep(ms, signal) {
  return withSignal(new Promise((r) => setTimeout(r, ms)), signal);
}

function classifyStatus(status) {
  if (status === 404 || status === 410) return ERROR_KIND.NOT_FOUND;
  if (status === 429) return ERROR_KIND.RATE_LIMIT;
  if (status >= 500) return ERROR_KIND.SERVER;
  return ERROR_KIND.HTTP;
}

/**
 * Request GET JSON tunggal (dideduplikasi per URL). Tidak menambah header kustom
 * agar tidak memicu preflight CORS.
 */
function rawFetchJson(url, timeout) {
  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      let res;
      try {
        res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      } catch (cause) {
        if (controller.signal.aborted) {
          throw new ApiError(ERROR_KIND.TIMEOUT, `Waktu habis setelah ${timeout} ms`, { url, cause });
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          throw new ApiError(ERROR_KIND.OFFLINE, 'Perangkat offline', { url, cause });
        }
        throw new ApiError(ERROR_KIND.NETWORK, 'Gagal terhubung (jaringan/CORS/TLS)', { url, cause });
      }
      if (!res.ok) {
        const retryAfter = Number(res.headers.get('retry-after')) || null;
        let kind = classifyStatus(res.status);
        // Beberapa API (mis. myQuran) menjawab "data tidak ada" dengan HTTP 400 + {status:false}.
        if (kind === ERROR_KIND.HTTP) {
          const body = await res.json().catch(() => null);
          if (body && body.status === false && /not\s*found|tidak\s*ditemukan/i.test(String(body.message ?? ''))) kind = ERROR_KIND.NOT_FOUND;
        }
        throw new ApiError(kind, `HTTP ${res.status}`, { status: res.status, url, retryAfter });
      }
      try {
        return await res.json();
      } catch (cause) {
        if (controller.signal.aborted) {
          throw new ApiError(ERROR_KIND.TIMEOUT, `Waktu habis setelah ${timeout} ms`, { url, cause });
        }
        throw new ApiError(ERROR_KIND.SHAPE, 'Respons bukan JSON yang valid', { url, status: res.status, cause });
      }
    } finally {
      clearTimeout(timer);
    }
  })();

  inflight.set(url, promise);
  promise.then(
    () => inflight.delete(url),
    () => inflight.delete(url),
  );
  return promise;
}

const RETRYABLE = new Set([ERROR_KIND.TIMEOUT, ERROR_KIND.NETWORK, ERROR_KIND.SERVER]);

/**
 * Ambil JSON dengan timeout, klasifikasi error, satu kali retry untuk error sementara,
 * dan validasi bentuk respons. `validate(json)` mengembalikan data ter-mapping atau
 * melempar error (akan dibungkus sebagai ApiError SHAPE).
 */
export async function fetchJson(url, { timeout = DEFAULT_TIMEOUT, retries = 1, validate, signal } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      const json = await withSignal(rawFetchJson(url, timeout), signal);
      if (!validate) return json;
      try {
        return validate(json);
      } catch (cause) {
        if (cause instanceof ApiError) {
          cause.url ||= url;
          throw cause;
        }
        throw new ApiError(ERROR_KIND.SHAPE, cause?.message || 'Bentuk respons tidak valid', { url, cause });
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      const canRetry = error instanceof ApiError && RETRYABLE.has(error.kind) && attempt < retries;
      if (!canRetry) throw error;
      attempt += 1;
      await sleep(450 * attempt, signal);
    }
  }
}

/**
 * Ambil data dengan cache:
 *  1. Cache segar (umur < ttl) → langsung dipakai.
 *  2. Ambil dari sumber utama → simpan ke cache.
 *  3. Bila gagal: pakai cache lama (ditandai stale) bila ada,
 *  4. lalu sumber cadangan (tidak di-cache, ditandai fallbackUsed),
 *  5. bila semua gagal → lempar error sumber utama.
 */
export async function cachedRequest({ key, ttl, load, fallback, signal, force = false }) {
  const cached = await cacheGet(key);
  if (cached && !force && Date.now() - cached.savedAt < ttl) {
    return { data: cached.data, fetchedAt: cached.savedAt, stale: false, fromCache: true };
  }
  try {
    const data = await load(signal);
    const entry = await cacheSet(key, data);
    return { data, fetchedAt: entry.savedAt, stale: false, fromCache: false };
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (cached) {
      return { data: cached.data, fetchedAt: cached.savedAt, stale: true, fromCache: true, error };
    }
    if (fallback) {
      try {
        const data = await fallback(signal);
        return { data, fetchedAt: Date.now(), stale: false, fromCache: false, fallbackUsed: true, error };
      } catch (fallbackError) {
        if (isAbortError(fallbackError)) throw fallbackError;
      }
    }
    throw error;
  }
}

/** Batasi jumlah promise yang berjalan bersamaan. */
export function pLimit(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active += 1;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

/** Helper validasi kecil. */
export function assert(condition, message) {
  if (!condition) throw new ApiError(ERROR_KIND.SHAPE, message);
}

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;
