/**
 * Entry sengaja sangat kecil. Halaman sudah diprerender, jadi browser bisa mengecat konten
 * utuh hanya dari HTML + CSS inline. React (boot.jsx) baru diunduh setelah cat pertama
 * sehingga tidak berebut jaringan dengan HTML/font di ponsel yang lambat.
 */
// Migrasi data versi lama & perapian URL harus berjalan sebelum aplikasi membaca store/route.
import './app/normalize-url.js';
import './app/migrate-legacy.js';

import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/fraunces/600.css';
// Hanya subset Arab: spasi/angka di teks Arab tidak memicu unduhan subset Latin.
import '@fontsource/amiri-quran/arabic-400.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/ornaments.css';

import { registerServiceWorker } from './app/sw-register.js';

const container = document.getElementById('root');

/** Modul halaman (didaftar oleh scripts/postbuild.mjs) diprefetch bersamaan dengan React. */
function preloadRouteModules() {
  const list = document.querySelector('meta[name="imuslim:modules"]')?.content;
  for (const href of list ? list.split(' ') : []) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = href;
    link.crossOrigin = '';
    document.head.appendChild(link);
  }
}

function start() {
  preloadRouteModules();
  import('./boot.jsx').then(({ boot }) => boot(container));
}

/** Jalankan setelah First Contentful Paint (atau segera bila sudah lewat / tidak didukung). */
function afterFirstPaint(run) {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    run();
  };
  try {
    const observer = new PerformanceObserver((list) => {
      if (list.getEntriesByName('first-contentful-paint').length) {
        observer.disconnect();
        once();
      }
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    once();
  }
  // Jaring pengaman (mis. tab dibuka di latar belakang sehingga belum ada cat).
  setTimeout(once, 2000);
}

if (container.dataset.ssr) afterFirstPaint(start);
else start(); // mode dev / 404.html / alamat lama: tidak ada HTML prerender untuk dicat

registerServiceWorker();
