// Notifikasi pengingat sholat saat iMuslim DITUTUP (Web Push).
//
// Browser tidak mengizinkan situs memutar audio sendiri saat ditutup. Yang mungkin: server
// iMuslim (Vercel) mengirim notifikasi tepat waktu → HP berbunyi dengan suara notifikasi →
// pengguna mengetuknya → iMuslim terbuka & memutar adzan.
//
// Yang dikirim ke server hanya alamat langganan push browser + ID kota + pilihan adzan/imsak.
import { PUSH_API } from '../../app/site.js';

const SYNC_KEY = 'imuslim:push-sync';

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** iPhone/iPad: Web Push hanya untuk aplikasi yang dipasang ke Layar Utama (iOS 16.4+). */
export function isIosBrowserTab() {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  return ios && !standalone;
}

async function api(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`${PUSH_API}/push/${path}/`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    credentials: 'omit',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* body kosong */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Server notifikasi merespons ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

let configPromise = null;
/** { enabled, publicKey } dari server (di-cache per sesi). */
export function getPushConfig() {
  configPromise ??= api('config').catch((error) => {
    configPromise = null;
    throw error;
  });
  return configPromise;
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}

async function registration() {
  const base = import.meta.env.BASE_URL;
  const reg = await navigator.serviceWorker.getRegistration(base);
  if (reg) return reg;
  // Kunjungan pertama: service worker baru didaftarkan setelah halaman selesai dimuat.
  const ready = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
  if (!ready) throw new Error('Service worker belum aktif. Muat ulang halaman lalu coba lagi.');
  return ready;
}

/** Langganan push yang ada (tanpa membuat baru). */
export async function currentSubscription() {
  if (!pushSupported()) return null;
  try {
    const reg = await registration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Pastikan browser berlangganan dengan kunci VAPID server (buat ulang bila kuncinya berubah). */
async function ensureSubscription(publicKey) {
  const reg = await registration();
  const key = urlBase64ToUint8Array(publicKey);
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    const current = sub.options?.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
    if (current && (current.length !== key.length || current.some((b, i) => b !== key[i]))) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  return sub ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

function readSync() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY) || 'null');
  } catch {
    return null;
  }
}
function writeSync(v) {
  try {
    if (v) localStorage.setItem(SYNC_KEY, JSON.stringify(v));
    else localStorage.removeItem(SYNC_KEY);
  } catch {
    /* penyimpanan tidak tersedia */
  }
}

export function lastSync() {
  return readSync();
}

/**
 * Sinkronkan langganan server dengan pilihan pengguna.
 * want = { cityId, adzan, imsak } (aktif) atau null (matikan).
 * Mengirim ulang ke server bila pilihan berubah atau sudah lebih dari 3 hari.
 */
// Semua sinkronisasi dijalankan berurutan: tombol pengaturan & sinkron otomatis tidak boleh
// berlangganan bersamaan (bisa menghasilkan dua langganan berbeda).
let chain = Promise.resolve();
export function syncPush(want, opts) {
  const run = chain.then(() => doSync(want, opts));
  chain = run.catch(() => {});
  return run;
}

async function doSync(want, { force = false } = {}) {
  if (!pushSupported()) return { state: 'unsupported' };
  if (!want) {
    const sub = await currentSubscription();
    if (sub) {
      await api('subscription', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    writeSync(null);
    return { state: 'off' };
  }
  if (Notification.permission !== 'granted') return { state: 'no-permission' };
  const cfg = await getPushConfig();
  if (!cfg?.enabled || !cfg.publicKey) return { state: 'server-off' };
  const sub = await ensureSubscription(cfg.publicKey);
  const json = sub.toJSON();
  const sig = `${json.endpoint}|${want.cityId}|${want.adzan ? 1 : 0}|${want.imsak ? 1 : 0}`;
  const prev = readSync();
  if (!force && prev?.sig === sig && Date.now() - prev.at < 3 * 86400000) return { state: 'active', at: prev.at, cityId: want.cityId };
  await api('subscription', { method: 'POST', body: { subscription: { endpoint: json.endpoint, keys: json.keys }, cityId: want.cityId, adzan: want.adzan, imsak: want.imsak } });
  const at = Date.now();
  writeSync({ sig, at, cityId: want.cityId });
  return { state: 'active', at, cityId: want.cityId };
}

/** Kirim notifikasi uji ke perangkat ini. */
export async function sendTestPush() {
  const sub = await currentSubscription();
  if (!sub) throw new Error('Perangkat ini belum berlangganan notifikasi.');
  return api('test', { method: 'POST', body: { endpoint: sub.endpoint } });
}
