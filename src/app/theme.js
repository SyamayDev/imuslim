import { useMediaQuery } from '../hooks/useBrowser.js';
import { useStore } from '../utils/storage.js';
import { prefsStore } from './stores.js';

/**
 * Tema yang sedang berlaku. Selama pengguna belum memilih (prefs.theme === 'system'),
 * tema mengikuti perangkat; setelah memilih terang/gelap, pilihan itu yang dipakai.
 */
export function useResolvedTheme() {
  const prefs = useStore(prefsStore);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme;
}

export function setTheme(theme) {
  prefsStore.set((p) => ({ ...p, theme }));
}
