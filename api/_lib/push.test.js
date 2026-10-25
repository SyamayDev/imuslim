// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../src/test/fixtures/myquran-jadwal-0105-2026-10.json' with { type: 'json' };
import { allowedOrigin } from './http.js';
import { signForTest, verifySignature } from './qstash.js';
import { eventsFor, payloadFor, planCity } from './schedule.js';
import { mapSchedule } from '../../src/services/api/sholat.js';
import { subId, validateInput } from './subs.js';

const KEY = 'sig_test_key_123';

describe('verifikasi tanda tangan QStash', () => {
  const body = JSON.stringify({ cityId: '0105', key: 'ashar', at: 1 });
  it('menerima token yang benar (kunci current atau next)', () => {
    expect(verifySignature(signForTest(body, KEY), body, [KEY])).toBe(true);
    expect(verifySignature(signForTest(body, KEY), body, ['lain', KEY])).toBe(true);
  });
  it('menolak body yang diubah, kunci salah, token kedaluwarsa, dan format rusak', () => {
    expect(verifySignature(signForTest(body, KEY), body.replace('ashar', 'isya'), [KEY])).toBe(false);
    expect(verifySignature(signForTest(body, 'kunci-lain'), body, [KEY])).toBe(false);
    const old = signForTest(body, KEY, { nowSec: 1_000_000 });
    expect(verifySignature(old, body, [KEY], 1_000_000 + 3600)).toBe(false);
    expect(verifySignature('bukan.token', body, [KEY])).toBe(false);
    expect(verifySignature(undefined, body, [KEY])).toBe(false);
  });
});

describe('validasi langganan', () => {
  const ok = { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc:XYZ', keys: { p256dh: 'BOr_abc-123', auth: 'a1B2_c3' } }, cityId: '0105', adzan: true, imsak: false };
  it('menerima langganan FCM/Mozilla/Apple/WNS', () => {
    expect(validateInput(ok)).toMatchObject({ cityId: '0105', adzan: true, imsak: false });
    for (const host of ['updates.push.services.mozilla.com', 'web.push.apple.com', 'db5p.notify.windows.com']) {
      expect(() => validateInput({ ...ok, subscription: { ...ok.subscription, endpoint: `https://${host}/x` } })).not.toThrow();
    }
  });
  it('menolak endpoint non-layanan-push, http, kunci rusak, dan ID kota salah', () => {
    expect(() => validateInput({ ...ok, subscription: { ...ok.subscription, endpoint: 'https://evil.example.com/x' } })).toThrow();
    expect(() => validateInput({ ...ok, subscription: { ...ok.subscription, endpoint: 'https://fcm.googleapis.com.evil.com/x' } })).toThrow();
    expect(() => validateInput({ ...ok, subscription: { ...ok.subscription, endpoint: 'http://fcm.googleapis.com/x' } })).toThrow();
    expect(() => validateInput({ ...ok, subscription: { ...ok.subscription, keys: { p256dh: '<script>', auth: 'x' } } })).toThrow();
    expect(() => validateInput({ ...ok, cityId: '105' })).toThrow();
  });
  it('ID langganan stabil & tidak memuat endpoint mentah', () => {
    expect(subId(ok.subscription.endpoint)).toBe(subId(ok.subscription.endpoint));
    expect(subId(ok.subscription.endpoint)).toHaveLength(24);
  });
});

describe('origin CORS', () => {
  it('mengizinkan GitHub Pages, Vercel produksi/pratinjau, localhost', () => {
    expect(allowedOrigin('https://syamaydev.github.io')).toBeTruthy();
    expect(allowedOrigin('https://imuslim-seven.vercel.app')).toBeTruthy();
    expect(allowedOrigin('https://imuslim-git-main-syamaydevs-projects.vercel.app')).toBeTruthy();
    expect(allowedOrigin('http://localhost:4173')).toBeTruthy();
    expect(allowedOrigin('https://evil.example.com')).toBeNull();
    expect(allowedOrigin('https://syamaydev.github.io.evil.com')).toBeNull();
  });
});

describe('jadwal → notifikasi', () => {
  const sched = mapSchedule(fixture, '0105', 2026, 10);
  it('waktu notifikasi = jam dinding kota (WIB) dalam UTC', () => {
    const ev = eventsFor([sched], ['2026-10-24'], { imsak: true });
    expect(ev.map((e) => e.key)).toEqual(['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya']);
    const ashar = ev.find((e) => e.key === 'ashar');
    expect(ashar.time).toBe('15:37');
    expect(new Date(ashar.at).toISOString()).toBe('2026-10-24T08:37:00.000Z'); // 15:37 WIB = 08:37 UTC
  });
  it('tanpa pelanggan imsak, imsak tidak dijadwalkan', () => {
    expect(eventsFor([sched], ['2026-10-24'], { imsak: false }).map((e) => e.key)).not.toContain('imsak');
  });
  it('isi notifikasi: judul, jam, kota, tag, dan URL relatif ke scope aplikasi', () => {
    const [ev] = eventsFor([sched], ['2026-10-24'], { imsak: false });
    const p = payloadFor(ev);
    expect(p).toMatchObject({ type: 'prayer', title: 'Waktu Subuh telah tiba', key: 'subuh', tag: '2026-10-24:subuh' });
    expect(p.body).toContain('04:59 WIB');
    expect(p.body).toContain('KAB. ACEH SELATAN');
    expect(p.url).toBe(`sholat/?adzan=subuh&at=${ev.at}`);
  });
});

describe('planCity (Redis & QStash tiruan)', () => {
  let store;
  let published;
  let qstashDown;
  beforeEach(() => {
    qstashDown = false;
    store = new Map();
    published = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init = {}) => {
        const u = String(url);
        if (u.startsWith('https://redis.test/pipeline')) {
          const cmds = JSON.parse(init.body);
          return Response.json(
            cmds.map(([cmd, key, ...args]) => {
              if (cmd === 'GET') return { result: store.get(key) ?? null };
              if (cmd === 'SET') {
                if (args.includes('NX') && store.has(key)) return { result: null };
                store.set(key, args[0]);
                return { result: 'OK' };
              }
              if (cmd === 'SCARD') return { result: store.get(key)?.size ?? 0 };
              if (cmd === 'DEL') return { result: store.delete(key) ? 1 : 0 };
              return { result: null };
            }),
          );
        }
        if (u.startsWith('https://api.myquran.com/')) return Response.json(fixture);
        if (u.startsWith('https://qstash.test/v2/batch')) {
          if (qstashDown) return new Response('down', { status: 500 });
          published.push(...JSON.parse(init.body));
          return Response.json([]);
        }
        throw new Error(`fetch tak terduga: ${u}`);
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const c = { redisUrl: 'https://redis.test', redisToken: 't', qstashUrl: 'https://qstash.test', qstashToken: 'q', publicBase: 'https://imuslim-seven.vercel.app' };

  it('menjadwalkan sisa waktu hari ini & besok tepat di menitnya, sekali saja', async () => {
    const now = Date.parse('2026-10-24T08:00:00Z'); // 15:00 WIB — Subuh & Dzuhur sudah lewat
    const first = await planCity('0105', now, { c });
    // hari ini: ashar, maghrib, isya (3) + besok: subuh..isya (5)
    expect(first.planned).toBe(8);
    expect(published).toHaveLength(8);
    const ashar = published.find((m) => m.headers['Upstash-Deduplication-Id'] === 'imuslim-0105-2026-10-24-ashar');
    expect(ashar.destination).toBe('https://imuslim-seven.vercel.app/api/push/fire/');
    expect(Number(ashar.headers['Upstash-Not-Before'])).toBe(Date.parse('2026-10-24T08:37:00Z') / 1000);
    const again = await planCity('0105', now + 60000, { c });
    expect(again.planned).toBe(0);
  });

  it('QStash gagal → penanda dilepas sehingga percobaan berikutnya menjadwalkan ulang', async () => {
    const now = Date.parse('2026-10-24T08:00:00Z');
    qstashDown = true;
    await expect(planCity('0105', now, { c })).rejects.toThrow(/QStash HTTP 500/);
    expect([...store.keys()].some((k) => k.startsWith('push:sched:'))).toBe(false);
    qstashDown = false;
    expect((await planCity('0105', now, { c })).planned).toBe(8);
  });
});
