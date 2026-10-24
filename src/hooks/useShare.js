import { useCallback } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import { SITE_URL } from './useDocumentMeta.js';

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* lanjut ke cara lama */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** URL produksi iMuslim untuk path aplikasi (mis. "/quran/1?ayat=5"). */
export function shareUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function useShare() {
  const toast = useToast();

  const copy = useCallback(
    async (text, message = 'Teks disalin ke papan klip') => {
      const ok = await copyText(text);
      toast.show(ok ? message : 'Gagal menyalin. Salin teks secara manual.', { type: ok ? 'success' : 'error' });
      return ok;
    },
    [toast],
  );

  /**
   * Bagikan via Web Share API bila tersedia; bila tidak, salin teks + tautan.
   * Pembatalan oleh pengguna tidak dianggap error.
   */
  const share = useCallback(
    async ({ title, text, path }) => {
      const url = path ? shareUrl(path) : undefined;
      const payload = { title, text, url };
      if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
        try {
          await navigator.share(payload);
          return true;
        } catch (e) {
          if (e?.name === 'AbortError') return false;
        }
      }
      return copy([text, url].filter(Boolean).join('\n\n'), 'Teks & tautan disalin — tempel untuk membagikan');
    },
    [copy],
  );

  return { copy, share };
}
