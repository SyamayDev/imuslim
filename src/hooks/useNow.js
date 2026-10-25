import { useSyncExternalStore } from 'react';

// Satu interval global per resolusi agar banyak komponen tidak membuat timer sendiri.
const clocks = new Map();

function getClock(intervalMs) {
  let clock = clocks.get(intervalMs);
  if (clock) return clock;
  const listeners = new Set();
  let now = Date.now();
  let timer = null;
  clock = {
    get: () => now,
    subscribe(listener) {
      listeners.add(listener);
      if (!timer) {
        now = Date.now();
        timer = setInterval(() => {
          now = Date.now();
          listeners.forEach((l) => l());
        }, intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
  };
  clocks.set(intervalMs, clock);
  return clock;
}

const serverNow = () => null;

/**
 * Waktu sekarang (ms) yang diperbarui tiap `intervalMs`.
 * Bernilai `null` saat prerender & hydration (HTML statis dibuat jauh sebelum dibuka),
 * jadi komponen menampilkan kerangka dulu lalu waktu sebenarnya sesaat kemudian.
 */
export function useNow(intervalMs = 1000) {
  const clock = getClock(intervalMs);
  return useSyncExternalStore(clock.subscribe, clock.get, serverNow);
}
