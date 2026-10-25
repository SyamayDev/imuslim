// Menjaga langganan push di server selalu sesuai pilihan pengguna (kota, adzan, imsak),
// plus status bersama untuk UI. Dipasang sekali di AppShell (lewat PrayerAlarm).
import { useEffect, useSyncExternalStore } from 'react';
import { syncPush } from './push.js';

let status = { state: 'idle' };
const listeners = new Set();
const SERVER = { state: 'idle' };

export function setPushStatus(next) {
  status = next;
  listeners.forEach((l) => l());
}

export function usePushStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => SERVER,
  );
}

/** Pilihan pengguna → keinginan langganan (null = matikan). */
export function pushWant(prefs) {
  return prefs.adzanNotify && prefs.cityId && (prefs.adzanEnabled || prefs.imsakAlert) ? { cityId: prefs.cityId, adzan: prefs.adzanEnabled, imsak: prefs.imsakAlert } : null;
}

/** Sinkronkan sekarang (dipanggil juga langsung dari tombol pengaturan dengan force). */
export async function runPushSync(want, opts) {
  setPushStatus({ ...status, state: 'syncing' });
  try {
    const r = await syncPush(want, opts);
    setPushStatus(r);
    return r;
  } catch (error) {
    const r = { state: 'error', error: error?.message || 'Gagal menghubungi server notifikasi.' };
    setPushStatus(r);
    return r;
  }
}

export function usePushSync(prefs) {
  const want = pushWant(prefs);
  const key = want ? `${want.cityId}|${want.adzan}|${want.imsak}` : 'off';
  useEffect(() => {
    if (!import.meta.env.PROD) return undefined; // service worker hanya ada di build produksi
    const t = setTimeout(() => {
      runPushSync(key === 'off' ? null : { cityId: key.split('|')[0], adzan: key.split('|')[1] === 'true', imsak: key.split('|')[2] === 'true' });
    }, 1200);
    return () => clearTimeout(t);
  }, [key]);
}
