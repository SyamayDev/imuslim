/* iMuslim service worker
 * - Navigasi: network-first, cadangan ke shell yang tersimpan saat offline.
 * - Aset ber-hash (/assets/*): cache-first (nama file berubah tiap build).
 * - Ikon/font/manifest: stale-while-revalidate.
 * - Permintaan API pihak ketiga & audio TIDAK ditangani di sini: cache data API dikelola
 *   aplikasi (IndexedDB) agar data lama selalu ditandai "mungkin usang", bukan disamarkan.
 * BUILD_ID diganti saat build (scripts/postbuild.mjs) sehingga setiap rilis memakai cache baru.
 */
const BUILD_ID = '__BUILD_ID__';
const SCOPE = new URL(self.registration.scope).pathname; // "/muslimweb/"
const SHELL_CACHE = `imuslim-shell-${BUILD_ID}`;
const ASSET_CACHE = `imuslim-assets-${BUILD_ID}`;
const SHELL = [SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}favicon.svg`, `${SCOPE}icons/icon-192.png`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('imuslim-') && k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (url.pathname.endsWith('.mp3') || request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(SCOPE, copy));
          }
          return response;
        })
        .catch(() => caches.match(SCOPE).then((r) => r || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith(`${SCOPE}assets/`)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.match(request).then((hit) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => hit || Response.error());
        return hit || network;
      }),
    ),
  );
});
