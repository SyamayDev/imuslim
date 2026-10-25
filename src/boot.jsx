/**
 * Memasang aplikasi React. Dimuat oleh main.jsx SETELAH cat pertama: halaman prerender
 * sudah terlihat utuh dari HTML + CSS inline, lalu React dan modul halaman diunduh dan
 * melakukan hydration ("tampil dulu, interaktif kemudian").
 */
import { StrictMode, startTransition } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App.jsx';
import { preloadPath } from './app/pages.js';
import { loadSeedFromDocument } from './app/seed.js';

const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Path aplikasi tanpa base & garis miring akhir: "/", "/quran/36", … */
function appPath() {
  const { pathname } = window.location;
  const rest = BASENAME && pathname.startsWith(BASENAME) ? pathname.slice(BASENAME.length) : pathname;
  return `/${rest.replace(/^\/+|\/+$/g, '')}`;
}

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function boot(container) {
  const path = appPath();
  // Data prerender (isi doa/hadits) harus tersedia sebelum render pertama.
  loadSeedFromDocument();
  // Modul halaman aktif dimuat dulu → hydration berjalan sinkron tanpa fallback.
  await preloadPath(path);
  await yieldToMain();

  const app = (
    <StrictMode>
      <BrowserRouter basename={BASENAME || undefined}>
        <App />
      </BrowserRouter>
    </StrictMode>
  );

  // Halaman prerender di-hydrate bila HTML-nya memang untuk path ini dan tanpa query
  // (query bisa mengubah isi, mis. ?q= pencarian). Selain itu (404.html, cadangan
  // offline, alamat lama) aplikasi dirender ulang di klien.
  if (container.dataset.ssr === path && !window.location.search) {
    // Transition → React bekerja dalam potongan kecil sehingga thread utama tetap responsif.
    startTransition(() => {
      hydrateRoot(container, app);
    });
  } else {
    createRoot(container).render(app);
  }
}
