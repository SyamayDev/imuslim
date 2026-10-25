/* iMuslim service worker
 * - Push: notifikasi waktu sholat dari server walau iMuslim ditutup; mengetuknya membuka
 *   iMuslim dan memutar adzan (service worker sendiri tidak bisa memutar audio).
 * - Navigasi: network-first; HTML prerender disimpan per URL (maks. 40) untuk offline.
 * - Aset ber-hash (/assets/*): cache-first (nama file berubah tiap build).
 * - Ikon/font/manifest: stale-while-revalidate.
 * - Permintaan API pihak ketiga & audio TIDAK ditangani di sini: cache data API dikelola
 *   aplikasi (IndexedDB) agar data lama selalu ditandai "mungkin usang", bukan disamarkan.
 * BUILD_ID diganti saat build (scripts/postbuild.mjs) sehingga setiap rilis memakai cache baru.
 */
const BUILD_ID = '__BUILD_ID__';
const SCOPE = new URL(self.registration.scope).pathname; // "/imuslim/" (GitHub Pages) atau "/" (Vercel)
const SHELL_CACHE = `imuslim-shell-${BUILD_ID}`;
const ASSET_CACHE = `imuslim-assets-${BUILD_ID}`;
const PAGE_CACHE = `imuslim-pages-${BUILD_ID}`;
const PAGE_LIMIT = 40;
const SHELL = [SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}favicon.svg`, `${SCOPE}icons/icon-192.png`];

/** Hapus entri tertua bila cache melebihi batas. */
async function trimCache(cache, limit) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((k) => cache.delete(k)));
}

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
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('imuslim-') && ![SHELL_CACHE, ASSET_CACHE, PAGE_CACHE].includes(k)).map((k) => caches.delete(k))))
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
    // Setiap halaman diprerender, jadi HTML disimpan per URL (maks. PAGE_LIMIT terakhir).
    // Offline: halaman yang sama bila pernah dibuka, selain itu beranda — aplikasi lalu
    // merender route yang benar di klien.
    const key = new URL(url.pathname, url.origin).href;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(PAGE_CACHE).then((c) => c.put(key, copy).then(() => trimCache(c, PAGE_LIMIT))));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(key)
            .then((r) => r || caches.match(SCOPE))
            .then((r) => r || Response.error()),
        ),
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

/* ---------- Notifikasi push (pengingat waktu sholat) ---------- */
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'iMuslim', body: event.data ? event.data.text() : '' };
  }
  const prayer = data.type === 'prayer';
  const options = {
    body: data.body || '',
    icon: `${SCOPE}icons/icon-192.png`,
    badge: `${SCOPE}icons/badge-96.png`,
    tag: data.tag || 'imuslim',
    renotify: true,
    requireInteraction: prayer,
    vibrate: prayer ? [500, 250, 500, 250, 900] : [200],
    timestamp: data.at || Date.now(),
    data: { url: new URL(data.url || '', self.registration.scope).href, key: data.key || null, at: data.at || null, type: data.type || 'info' },
    actions: prayer ? [{ action: 'play', title: data.key === 'imsak' ? 'Putar pengumuman' : 'Putar adzan' }, { action: 'dismiss', title: 'Tutup' }] : [],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'iMuslim', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const { url, key, at, type } = event.notification.data || {};
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const mine = all.filter((c) => c.url.startsWith(self.registration.scope));
      const client = mine.find((c) => c.focused) || mine[0];
      if (client) {
        // iMuslim sudah terbuka: fokuskan & minta halaman memutar adzan.
        await client.focus();
        if (type === 'prayer') client.postMessage({ type: 'imuslim:adzan', key, at });
        return;
      }
      // Tertutup: buka iMuslim dengan parameter adzan; halaman memutar audionya saat dimuat.
      if (url) await self.clients.openWindow(url);
    })(),
  );
});
