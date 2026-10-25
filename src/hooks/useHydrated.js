import { useSyncExternalStore } from 'react';

const subscribeNever = () => () => {};

/**
 * Nilai yang hanya bisa diketahui di browser (dukungan API, preferensi tampilan, dsb.).
 * Saat prerender & hydration dipakai `serverValue` agar HTML statis dan render pertama
 * di browser identik; setelah itu React merender ulang dengan nilai sebenarnya.
 * `getValue` harus mengembalikan nilai primitif/stabil.
 */
export function useClientValue(getValue, serverValue) {
  return useSyncExternalStore(subscribeNever, getValue, () => serverValue);
}

const isTrue = () => true;

/** `false` saat prerender & hydration, `true` setelahnya. */
export function useHydrated() {
  return useClientValue(isTrue, false);
}
