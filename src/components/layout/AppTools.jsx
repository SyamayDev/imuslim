import { Maximize, Minimize, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { setTheme, useResolvedTheme } from '../../app/theme.js';
import { useFullscreen } from '../../hooks/useFullscreen.js';
import { useToast } from '../ui/Toast.jsx';

/**
 * Dua keadaan saja: terang ↔ gelap. Awalnya mengikuti perangkat; setelah ditekan,
 * pilihan pengguna disimpan dan dipakai seterusnya.
 */
export function ThemeToggle({ className = 'icon-btn', withLabel = false }) {
  const current = useResolvedTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang';
  // Animasi ikon hanya setelah ditekan, bukan saat halaman dimuat.
  const [swapped, setSwapped] = useState(false);
  return (
    <button
      type="button"
      className={`${className} theme-toggle ${swapped ? 'is-swapped' : ''}`}
      onClick={() => {
        setSwapped(true);
        setTheme(next);
      }}
      aria-label={withLabel ? undefined : label}
      title={label}
    >
      {/* Ikon dipilih lewat CSS dari <html data-theme> → benar sejak cat pertama (sebelum JS). */}
      <span key={current} className="theme-toggle__icon" aria-hidden="true">
        <Moon className="theme-toggle__moon" />
        <Sun className="theme-toggle__sun" />
      </span>
      {withLabel && <span>{next === 'dark' ? 'Mode gelap' : 'Mode terang'}</span>}
    </button>
  );
}

export function FullscreenButton({ className = 'icon-btn', withLabel = false }) {
  const fs = useFullscreen();
  const toast = useToast();
  if (!fs.supported) return null;
  const label = fs.isFullscreen ? 'Keluar dari layar penuh' : 'Masuk layar penuh';
  return (
    <button
      type="button"
      className={className}
      aria-label={withLabel ? undefined : label}
      title={label}
      onClick={async () => {
        try {
          await fs.toggle();
        } catch {
          toast.show('Browser menolak mode layar penuh.', { type: 'error' });
        }
      }}
    >
      {fs.isFullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
      {withLabel && <span>{label}</span>}
    </button>
  );
}
