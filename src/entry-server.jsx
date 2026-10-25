/**
 * Renderer saat build, dipakai scripts/postbuild.mjs. API prerender React 19 menunggu
 * seluruh halaman lazy selesai sehingga setiap route terbit sebagai HTML utuh
 * (cat pertama cepat, mudah dirayapi mesin pencari), lalu di-hydrate di browser.
 *
 * Data dari API (ayat, jadwal, doa, hadits) dan data lokal pengguna (localStorage, jam
 * perangkat) TIDAK dirender di sini: komponen menampilkan kerangka yang sama persis pada
 * render pertama di browser, lalu mengisinya setelah hydration.
 */
import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router-dom';
import App from './app/App.jsx';
import { preloadPath } from './app/pages.js';

const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export async function render(path) {
  await preloadPath(path);
  const errors = [];
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <StaticRouter location={`${BASENAME}${path}`} basename={BASENAME || undefined}>
        <App />
      </StaticRouter>
    </StrictMode>,
    {
      // HTML polos tanpa skrip "reveal" Suspense: siap dicat tanpa JavaScript.
      progressiveChunkSize: Number.POSITIVE_INFINITY,
      onError(error) {
        errors.push(error);
      },
    },
  );
  let html = '';
  for await (const chunk of prelude) html += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
  if (errors.length) throw new Error(`Prerender ${path} gagal: ${errors.map((e) => e?.stack || e).join('\n')}`);
  return html;
}
