// Uji end-to-end notifikasi push secara lokal, dengan Web Push SUNGGUHAN (layanan push Chrome/FCM):
//   build:  PUSH_API_URL=http://localhost:4199/api npm run build
//   jalankan: node scripts/push-e2e.mjs
// Server API lokal memakai handler asli api/push/*.js; Upstash Redis & QStash diganti tiruan
// dalam memori (QStash tiruan langsung memanggil /fire dengan tanda tangan yang sah).
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import webpush from 'web-push';

const API_PORT = 4199;
const APP_PORT = 4198;
const SIGN_KEY = 'e2e-signing-key';
const vapid = webpush.generateVAPIDKeys();
Object.assign(process.env, {
  VAPID_PUBLIC_KEY: vapid.publicKey,
  VAPID_PRIVATE_KEY: vapid.privateKey,
  VAPID_SUBJECT: 'https://imuslim-seven.vercel.app',
  KV_REST_API_URL: `http://localhost:${API_PORT}/mock-redis`,
  KV_REST_API_TOKEN: 'local',
  QSTASH_URL: `http://localhost:${API_PORT}/mock-qstash`,
  QSTASH_TOKEN: 'local',
  QSTASH_CURRENT_SIGNING_KEY: SIGN_KEY,
  PUSH_PUBLIC_BASE: `http://localhost:${API_PORT}`,
  CRON_SECRET: 'local-cron',
});
const { signForTest } = await import('../api/_lib/qstash.js');
const handlers = {
  config: await import('../api/push/config.js'),
  subscription: await import('../api/push/subscription.js'),
  test: await import('../api/push/test.js'),
  fire: await import('../api/push/fire.js'),
  plan: await import('../api/push/plan.js'),
  status: await import('../api/push/status.js'),
};

/* ---------- Redis tiruan (subset perintah yang dipakai) ---------- */
const kv = new Map();
function redisCmd([cmd, key, ...a]) {
  const set = () => kv.get(key) ?? new Set();
  switch (cmd) {
    case 'GET':
      return typeof kv.get(key) === 'string' ? kv.get(key) : null;
    case 'SET':
      if (a.includes('NX') && kv.has(key)) return null;
      kv.set(key, String(a[0]));
      return 'OK';
    case 'DEL':
      return kv.delete(key) ? 1 : 0;
    case 'SADD': {
      const s = set();
      s.add(a[0]);
      kv.set(key, s);
      return 1;
    }
    case 'SREM': {
      const s = set();
      s.delete(a[0]);
      kv.set(key, s);
      return 1;
    }
    case 'SMEMBERS':
      return [...set()];
    case 'SCARD':
      return set().size;
    case 'MGET':
      return [key, ...a].map((k) => (typeof kv.get(k) === 'string' ? kv.get(k) : null));
    case 'INCR': {
      const n = Number(kv.get(key) ?? 0) + 1;
      kv.set(key, String(n));
      return n;
    }
    case 'EXPIRE':
      return 1;
    default:
      throw new Error(`perintah redis tiruan belum ada: ${cmd}`);
  }
}

const qstashLog = [];
const fired = [];

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${API_PORT}`);
  const body = await readBody(req);
  if (process.argv.includes('--verbose') && !url.pathname.startsWith('/mock-redis')) console.log('  ·', req.method, url.pathname, body.slice(0, 120));
  const send = async (response) => {
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
  try {
    if (url.pathname === '/mock-redis/pipeline') return send(Response.json(JSON.parse(body).map((c) => ({ result: redisCmd(c) }))));
    if (url.pathname === '/mock-qstash/v2/batch') {
      const msgs = JSON.parse(body);
      qstashLog.push(...msgs);
      // "Waktu sholat tiba": panggil /fire untuk pesan PERTAMA dengan tanda tangan QStash yang sah.
      if (msgs.length && !fired.length) {
        const m = msgs[0];
        const sig = signForTest(m.body, SIGN_KEY, { url: m.destination });
        setTimeout(async () => {
          const r = await handlers.fire.POST(new Request(m.destination, { method: 'POST', body: m.body, headers: { 'Upstash-Signature': sig, 'Content-Type': 'application/json' } }));
          fired.push({ msg: JSON.parse(m.body), result: await r.json() });
        }, 300);
      }
      return send(Response.json(msgs.map((_, i) => ({ messageId: `m${qstashLog.length + i}` }))));
    }
    const m = url.pathname.match(/^\/api\/push\/(\w+)\/?$/);
    const h = m && handlers[m[1]];
    const fn = h?.[req.method];
    if (!fn) return send(new Response('not found', { status: 404 }));
    const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : body });
    return send(await fn(request));
  } catch (error) {
    console.error(error);
    return send(new Response(String(error), { status: 500 }));
  }
});
await new Promise((r) => server.listen(API_PORT, r));
const app = spawn(process.execPath, ['scripts/serve-dist.mjs', String(APP_PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1000));

const profile = await mkdtemp(join(tmpdir(), 'imuslim-push-'));
const headless = !process.argv.includes('--headed');
// Playwright mematikan koneksi latar (GCM) secara bawaan — padahal itu jalur pesan push.
const ctx = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless, locale: 'id-ID', timezoneId: 'Asia/Jakarta', ignoreDefaultArgs: ['--disable-background-networking', '--disable-component-update'] });
const origin = `http://localhost:${APP_PORT}`;
await ctx.grantPermissions(['notifications'], { origin });
await ctx.addInitScript(() => {
  if (!localStorage.getItem('imuslim:prefs'))
    localStorage.setItem('imuslim:prefs', JSON.stringify({ theme: 'light', cityId: '1301', cityName: 'Kota Jakarta', adzanEnabled: true, imsakAlert: false, adzanNotify: false }));
  localStorage.setItem('imuslim:migrated', '1');
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'LOLOS' : 'GAGAL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};
try {
  await page.goto(`${origin}/imuslim/sholat/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' }); // halaman kini dikendalikan service worker
  await page.getByRole('switch', { name: 'Notifikasi walau iMuslim ditutup' }).check();
  const status = page.locator('.push-status');
  await status.getByText('Aktif untuk Kota Jakarta').waitFor({ timeout: 90000 });
  check('langganan push tersimpan di server & status "Aktif"', true);
  const subs = [...kv.keys()].filter((k) => k.startsWith('push:sub:'));
  check('server menyimpan 1 langganan untuk kota 1301', subs.length === 1 && kv.get('push:city:1301')?.size === 1);
  const shot = process.argv.find((x) => x.startsWith('--screenshot='))?.split('=')[1];
  if (shot) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.push-tips summary').click();
    await page.locator('.sholat-adzan').screenshot({ path: shot });
  }
  check('waktu sholat dijadwalkan ke QStash', qstashLog.length >= 5, `${qstashLog.length} pesan`);
  const notBefore = qstashLog.map((q) => Number(q.headers['Upstash-Not-Before']));
  check('semua jadwal di masa depan & tepat di menit', notBefore.every((t) => t * 1000 > Date.now() - 60000 && t % 60 === 0));

  // Amati langsung di service worker: catat setiap showNotification yang dipanggil handler push.
  const sw = ctx.serviceWorkers().find((w) => w.url().includes('/imuslim/sw.js')) ?? (await ctx.waitForEvent('serviceworker'));
  sw.on('console', (m) => console.log('  [sw]', m.text()));
  await sw.evaluate(() => {
    self.__shown = [];
    const orig = self.registration.showNotification.bind(self.registration);
    self.registration.showNotification = (title, opts) => {
      self.__shown.push({ title, tag: opts?.tag, url: opts?.data?.url, type: opts?.data?.type });
      return orig(title, opts).catch((e) => {
        self.__shown.push({ error: String(e) });
        throw e;
      });
    };
  });
  let gcm = null;
  if (process.argv.includes('--gcm')) {
    gcm = await ctx.newPage();
    await gcm.goto('chrome://gcm-internals');
    await page.bringToFront();
  }
  // QStash tiruan memicu /fire → Web Push sungguhan → service worker menampilkan notifikasi
  const waitNotif = async (pred, ms = 25000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const shown = await sw.evaluate(() => self.__shown || []);
      const list = shown.map((x) => ({ title: x.title, tag: x.tag, data: { url: x.url, type: x.type }, error: x.error }));
      if (list.some((x) => x.error)) console.log('  [sw] showNotification error:', list.filter((x) => x.error));
      const hit = list.find(pred);
      if (hit) return hit;
      await page.waitForTimeout(500);
    }
    return null;
  };
  // Catatan: Chrome headless tidak menampilkan notifikasi ke layar, jadi yang diperiksa adalah
  // pemanggilan showNotification di service worker (tanpa error) — bukti handler push berjalan.
  const prayer = await waitNotif((n) => n.data?.type === 'prayer');
  check('notifikasi waktu sholat diterima service worker (Web Push asli)', Boolean(prayer), prayer ? `"${prayer.title}"` : `fire: ${JSON.stringify(fired)}`);
  check('notifikasi membawa URL adzan ke scope aplikasi', Boolean(prayer?.data?.url?.startsWith(`${origin}/imuslim/sholat/?adzan=`)), prayer?.data?.url);
  const lastRaw = [...kv.entries()].find(([k]) => k.startsWith('push:last:'))?.[1];
  const last = typeof lastRaw === 'string' ? JSON.parse(lastRaw) : null;
  check('hasil pengiriman terjadwal tercatat untuk perangkat ini', last?.result === 'ok', last ? `${last.key} → ${last.result}` : 'tidak ada catatan');
  const st = await page.evaluate(async (api) => {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    const r = await fetch(`${api}/push/status/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    return r.json();
  }, `http://localhost:${API_PORT}/api`);
  check('endpoint status: langganan tersimpan + notifikasi terakhir', st.subscribed === true && st.last?.result === 'ok', JSON.stringify(st).slice(0, 120));

  await page.getByRole('button', { name: 'Kirim notifikasi uji' }).click();
  const test = await waitNotif((n) => n.tag === 'imuslim-test');
  check('tombol "Kirim notifikasi uji" berfungsi', Boolean(test), test?.title);
  if (gcm) {
    await gcm.waitForTimeout(2000);
    const t = await gcm.evaluate(() => document.body.innerText);
    console.log(t.slice(t.indexOf('Receive Message Log'), t.indexOf('Receive Message Log') + 1500));
  }

  // Mengetuk notifikasi saat aplikasi tertutup → URL ?adzan=…&at=… → banner + adzan diputar
  const at = Date.now() - 60000;
  await page.goto(`${origin}/imuslim/sholat/?adzan=ashar&at=${at}`, { waitUntil: 'networkidle' });
  await page.getByRole('alert').filter({ hasText: 'Waktu Ashar telah tiba' }).waitFor({ timeout: 10000 });
  check('membuka dari notifikasi menampilkan banner adzan', true);
  check('parameter adzan dibersihkan dari URL', !page.url().includes('adzan='), page.url());
  // Pemutar memuat "Adzan Ashar" (diputar otomatis bila browser mengizinkan; bila diblokir,
  // banner menampilkan tombol "Putar adzan").
  await page.locator('.player__title').filter({ hasText: 'Adzan Ashar' }).waitFor({ timeout: 8000 });
  const blockedBtn = await page.getByRole('button', { name: 'Putar adzan' }).count();
  check('pemutar memuat adzan Ashar', true, blockedBtn ? 'autoplay diblokir → tombol "Putar adzan" tampil' : 'diputar otomatis');

  // Mematikan → langganan dihapus dari server
  await page.goto(`${origin}/imuslim/sholat/`, { waitUntil: 'networkidle' });
  await page.getByRole('switch', { name: 'Notifikasi walau iMuslim ditutup' }).uncheck();
  await page.waitForTimeout(1500);
  check('mematikan notifikasi menghapus langganan di server', ![...kv.keys()].some((k) => k.startsWith('push:sub:')));
} catch (error) {
  check('skenario selesai tanpa error', false, error.message.split(String.fromCharCode(10))[0]);
  console.log('  status UI:', await page.locator('.push-status').textContent().catch(() => '-'));
  console.log('  uji subscribe:', await page.evaluate(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.getSubscription();
      return `perm=${Notification.permission} sub=${s ? s.endpoint.slice(0, 60) : 'null'} state=${await reg.pushManager.permissionState({ userVisibleOnly: true })}`;
    } catch (e) {
      return `error ${e.name}: ${e.message}`;
    }
  }).catch((e) => e.message));
} finally {
  await ctx.close();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
  app.kill();
  server.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} lolos`);
process.exit(failed ? 1 : 0);
