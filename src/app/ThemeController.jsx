import { useEffect } from 'react';
import { useHydrated } from '../hooks/useHydrated.js';
import { useStore } from '../utils/storage.js';
import { prefsStore } from './stores.js';
import { useResolvedTheme } from './theme.js';

/**
 * Menerapkan tema & skala teks Arab ke <html>.
 * - Tema awal sudah dipasang skrip inline di index.html sebelum cat pertama; selama
 *   hydration nilai store masih bawaan, jadi tidak ada yang ditulis (mencegah kedip).
 * - Atribut/properti hanya ditulis bila nilainya berubah agar browser tidak menghitung
 *   ulang gaya seluruh halaman tanpa perlu.
 */
export function ThemeController() {
  const hydrated = useHydrated();
  const prefs = useStore(prefsStore);
  const resolved = useResolvedTheme();

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (root.getAttribute('data-theme') !== resolved) root.setAttribute('data-theme', resolved);
    const scale = String(prefs.arabicScale);
    const currentScale = root.style.getPropertyValue('--arabic-scale');
    if (scale === '1' ? currentScale !== '' : currentScale !== scale) {
      if (scale === '1') root.style.removeProperty('--arabic-scale');
      else root.style.setProperty('--arabic-scale', scale);
    }
    const color = resolved === 'dark' ? '#0F1613' : '#F6F2E9';
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if (m.getAttribute('content') !== color) m.setAttribute('content', color);
    });
  }, [hydrated, resolved, prefs.arabicScale]);

  return null;
}
