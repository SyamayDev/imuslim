import { useSyncExternalStore } from 'react';

function safeRead(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeWrite(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
}

/**
 * Store kecil berbasis localStorage dengan validasi saat dibaca.
 * Data rusak/berbentuk lain tidak membuat aplikasi crash: validator membersihkannya
 * atau nilai bawaan dipakai.
 */
export function createStore(key, { defaultValue, validate }) {
  let value;
  let loaded = false;
  const listeners = new Set();

  const read = () => {
    const raw = safeRead(key);
    if (raw == null) return defaultValue;
    try {
      const cleaned = validate(JSON.parse(raw));
      return cleaned === undefined ? defaultValue : cleaned;
    } catch {
      return defaultValue;
    }
  };
  const get = () => {
    if (!loaded) {
      value = read();
      loaded = true;
    }
    return value;
  };
  const notify = () => listeners.forEach((l) => l());
  const set = (next) => {
    const resolved = typeof next === 'function' ? next(get()) : next;
    const cleaned = validate(resolved);
    value = cleaned === undefined ? defaultValue : cleaned;
    loaded = true;
    safeWrite(key, JSON.stringify(value));
    notify();
  };
  // Sinkron antar-tab: perubahan dari tab lain diterima lewat event "storage".
  const onStorage = (e) => {
    if (e.key === key || e.key === null) {
      value = read();
      loaded = true;
      notify();
    }
  };
  const subscribe = (listener) => {
    listeners.add(listener);
    if (listeners.size === 1 && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    };
  };
  const reload = () => {
    value = read();
    loaded = true;
    notify();
  };
  return { key, get, set, subscribe, reload, reset: () => set(defaultValue), defaultValue };
}

/**
 * Nilai store yang selalu sinkron. Saat prerender & hydration dipakai nilai bawaan
 * (HTML statis tidak tahu isi localStorage pengguna); sesaat setelah hydration React
 * otomatis merender ulang dengan nilai sebenarnya.
 */
export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, () => store.defaultValue);
}

// ---------- Validator kecil ----------
export { int, isObj, str } from './validate.js';
