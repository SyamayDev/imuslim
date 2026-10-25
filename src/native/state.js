// Status aplikasi Android (alarm adzan native) untuk UI. Tidak mengimpor Capacitor, jadi aman
// dipakai di mana saja; isinya diisi NativeBridge yang hanya ada di build Android.
import { useSyncExternalStore } from 'react';

const INITIAL = {
  ready: false, // status native sudah dibaca
  syncing: false,
  error: null, // pesan bila jadwal gagal dipasang
  status: null, // hasil AdzanAlarm.getStatus() (izin, adzan berikutnya, sedang diputar, …)
  app: null, // { version, build } dari @capacitor/app
  update: null, // { versionName, versionCode, url, size } bila ada versi lebih baru
  lastSync: 0,
};

let state = INITIAL;
const listeners = new Set();

export function setNativeState(patch) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
}

export function getNativeState() {
  return state;
}

export function useNativeState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => INITIAL,
  );
}

let api = null;
export function setNativeApi(next) {
  api = next;
}
/** Aksi native: { sync, refresh, stop, test, requestNotifications, openSettings, checkUpdate }; null di web. */
export function nativeApi() {
  return api;
}
