import { useSyncExternalStore } from 'react';

function subscribeOnline(cb) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// ---- Prompt instalasi PWA (Chromium). Ditangkap sedini mungkin. ----
let deferredPrompt = null;
const installListeners = new Set();
const notifyInstall = () => installListeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notifyInstall();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyInstall();
  });
}

export function useInstallPrompt() {
  const available = useSyncExternalStore(
    (cb) => {
      installListeners.add(cb);
      return () => installListeners.delete(cb);
    },
    () => deferredPrompt !== null,
    () => false,
  );
  const installed = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
  const prompt = async () => {
    if (!deferredPrompt) return 'unavailable';
    const e = deferredPrompt;
    deferredPrompt = null;
    notifyInstall();
    await e.prompt();
    const choice = await e.userChoice;
    return choice?.outcome ?? 'dismissed';
  };
  return { available, installed: Boolean(installed), prompt };
}
