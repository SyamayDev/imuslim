import { useCallback, useSyncExternalStore } from 'react';
import { useClientValue } from './useHydrated.js';

const doc = typeof document !== 'undefined' ? document : null;

function currentElement() {
  return doc ? (doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null) : null;
}

export function fullscreenSupported() {
  if (!doc) return false;
  const el = doc.documentElement;
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false;
  return Boolean(enabled && (el.requestFullscreen || el.webkitRequestFullscreen));
}

function subscribe(listener) {
  if (!doc) return () => {};
  doc.addEventListener('fullscreenchange', listener);
  doc.addEventListener('webkitfullscreenchange', listener);
  return () => {
    doc.removeEventListener('fullscreenchange', listener);
    doc.removeEventListener('webkitfullscreenchange', listener);
  };
}

const getSnapshot = () => currentElement() !== null;
const getServerSnapshot = () => false;

/**
 * Mode layar penuh untuk seluruh aplikasi (document.documentElement).
 * Tidak pernah aktif otomatis; hanya lewat tindakan pengguna.
 */
export function useFullscreen() {
  const isFullscreen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const supported = useClientValue(fullscreenSupported, false);

  const enter = useCallback(async () => {
    const el = document.documentElement;
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (!request) throw new Error('unsupported');
    await request({ navigationUI: 'hide' });
  }, []);

  const exit = useCallback(async () => {
    const leave = document.exitFullscreen?.bind(document) ?? document.webkitExitFullscreen?.bind(document);
    if (leave && currentElement()) await leave();
  }, []);

  const toggle = useCallback(() => (currentElement() ? exit() : enter()), [enter, exit]);

  return { supported, isFullscreen, enter, exit, toggle };
}
