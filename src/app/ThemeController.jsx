import { useEffect } from 'react';
import { prefsStore } from './stores.js';
import { useResolvedTheme } from './theme.js';
import { useStore } from '../utils/storage.js';

/** Menerapkan tema & skala teks Arab ke <html>. */
export function ThemeController() {
  const prefs = useStore(prefsStore);
  const resolved = useResolvedTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.style.setProperty('--arabic-scale', String(prefs.arabicScale));
    const color = resolved === 'dark' ? '#0F1613' : '#F6F2E9';
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
  }, [resolved, prefs.arabicScale]);

  return null;
}
