import { __resetCacheForTests, cacheSet } from './cache.js';
import { cachedRequest, fetchJson, pLimit } from './client.js';
import { ApiError, ERROR_KIND, describeError } from './errors.js';

const json = (body, status = 200, headers = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } }));

beforeEach(() => {
  __resetCacheForTests();
  vi.useRealTimers();
});

describe('fetchJson', () => {
  it('mengembalikan data tervalidasi', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => json({ ok: 1 }));
    await expect(fetchJson('https://x.test/a', { validate: (j) => j.ok * 2 })).resolves.toBe(2);
  });

  it('404 → NOT_FOUND tanpa retry', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => json({}, 404));
    await expect(fetchJson('https://x.test/404')).rejects.toMatchObject({ kind: ERROR_KIND.NOT_FOUND, status: 404 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('HTTP 400 + {status:false, "Data not found"} (gaya myQuran) → NOT_FOUND', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => json({ status: false, message: 'Data not found' }, 400));
    await expect(fetchJson('https://x.test/400')).rejects.toMatchObject({ kind: ERROR_KIND.NOT_FOUND, status: 400 });
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => json({ message: 'bad' }, 400));
    await expect(fetchJson('https://x.test/400b')).rejects.toMatchObject({ kind: ERROR_KIND.HTTP, status: 400 });
  });

  it('429 → RATE_LIMIT dengan Retry-After', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => json({}, 429, { 'Retry-After': '30' }));
    await expect(fetchJson('https://x.test/429')).rejects.toMatchObject({ kind: ERROR_KIND.RATE_LIMIT, retryAfter: 30 });
  });

  it('5xx dicoba ulang sekali lalu berhasil', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => json({}, 503))
      .mockImplementationOnce(() => json({ ok: true }));
    await expect(fetchJson('https://x.test/503')).resolves.toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('gagal jaringan (CORS/TLS) → NETWORK', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(fetchJson('https://x.test/net', { retries: 0 })).rejects.toMatchObject({ kind: ERROR_KIND.NETWORK });
  });

  it('timeout via AbortController → TIMEOUT', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    await expect(fetchJson('https://x.test/slow', { timeout: 30, retries: 0 })).rejects.toMatchObject({ kind: ERROR_KIND.TIMEOUT });
  });

  it('JSON rusak atau bentuk berubah → SHAPE', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response('<html>', { status: 200 })));
    await expect(fetchJson('https://x.test/html')).rejects.toMatchObject({ kind: ERROR_KIND.SHAPE });
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => json({ data: null }));
    await expect(
      fetchJson('https://x.test/shape', {
        validate: (j) => {
          if (!j.data) throw new Error('data kosong');
          return j.data;
        },
      }),
    ).rejects.toMatchObject({ kind: ERROR_KIND.SHAPE, message: 'data kosong' });
  });

  it('permintaan identik yang bersamaan dideduplikasi', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => json({ n: 1 }));
    await Promise.all([fetchJson('https://x.test/same'), fetchJson('https://x.test/same'), fetchJson('https://x.test/same')]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('pembatalan oleh pemanggil melempar AbortError', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const p = fetchJson('https://x.test/hang', { signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('pesan error jujur untuk pengguna', () => {
    expect(describeError(new ApiError(ERROR_KIND.SERVER, 'x', { status: 502 }))).toMatch(/gangguan.*HTTP 502/);
  });
});

describe('cachedRequest', () => {
  it('memakai cache segar tanpa request', async () => {
    await cacheSet('k1', { a: 1 });
    const load = vi.fn();
    const r = await cachedRequest({ key: 'k1', ttl: 60_000, load });
    expect(r).toMatchObject({ data: { a: 1 }, stale: false, fromCache: true });
    expect(load).not.toHaveBeenCalled();
  });

  it('sumber gagal + cache lama → data ditandai stale beserta error', async () => {
    await cacheSet('k2', { a: 'lama' });
    const err = new ApiError(ERROR_KIND.TIMEOUT, 't');
    const r = await cachedRequest({ key: 'k2', ttl: 0, load: () => Promise.reject(err) });
    expect(r).toMatchObject({ data: { a: 'lama' }, stale: true, error: err });
  });

  it('tanpa cache → sumber cadangan dipakai (tidak di-cache)', async () => {
    const r = await cachedRequest({
      key: 'k3',
      ttl: 1000,
      load: () => Promise.reject(new ApiError(ERROR_KIND.NETWORK, 'n')),
      fallback: () => Promise.resolve({ b: 2 }),
    });
    expect(r).toMatchObject({ data: { b: 2 }, fallbackUsed: true });
    const again = await cachedRequest({ key: 'k3', ttl: 1000, load: () => Promise.resolve({ fresh: true }) });
    expect(again.data).toEqual({ fresh: true });
  });

  it('semua gagal → error sumber utama dilempar (tanpa data palsu)', async () => {
    const err = new ApiError(ERROR_KIND.SERVER, 's', { status: 500 });
    await expect(cachedRequest({ key: 'k4', ttl: 1, load: () => Promise.reject(err), fallback: () => Promise.reject(new Error('x')) })).rejects.toBe(err);
  });

  it('force melewati cache segar', async () => {
    await cacheSet('k5', { v: 1 });
    const r = await cachedRequest({ key: 'k5', ttl: 60_000, force: true, load: () => Promise.resolve({ v: 2 }) });
    expect(r.data).toEqual({ v: 2 });
  });
});

describe('pLimit', () => {
  it('membatasi konkurensi', async () => {
    const limit = pLimit(2);
    let active = 0;
    let max = 0;
    const task = () =>
      limit(async () => {
        active += 1;
        max = Math.max(max, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
      });
    await Promise.all(Array.from({ length: 7 }, task));
    expect(max).toBe(2);
  });
});
