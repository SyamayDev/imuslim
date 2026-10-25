import { lazy, useState } from 'react';

/**
 * Halaman yang dipecah per route dengan preload.
 *
 * - Modul sudah dimuat (prerender di server, hydration setelah `preload()`, atau prefetch saat
 *   tautan disentuh): komponen dirender langsung — sinkron, tanpa fallback, sehingga HTML
 *   prerender dan render pertama di browser identik.
 * - Modul belum dimuat: memakai React.lazy bawaan, yang menangani suspend & error dengan benar
 *   (fallback lalu halaman, atau ErrorBoundary bila gagal).
 * - Pilihan di atas dikunci per instance (useState) agar halaman tidak pernah di-mount ulang.
 * - Gagal dimuat (offline/jaringan putus) tidak dicoba ulang tanpa henti; percobaan baru lewat
 *   `preload()` (tautan disentuh/difokus), saat halaman dibuka lagi setelah > 4 detik, atau
 *   tombol "Muat ulang".
 */
export function lazyPage(loader) {
  let Loaded = null;
  let attempt = null; // { promise, Lazy, failedAt }

  const load = (retryFailed = false) => {
    if (Loaded) return Promise.resolve(Loaded);
    const stale = attempt?.failedAt && (retryFailed || Date.now() - attempt.failedAt > 4000);
    if (!attempt || stale) {
      const current = { failedAt: 0 };
      current.promise = loader().then(
        (mod) => {
          Loaded = mod.default;
          return mod;
        },
        (error) => {
          current.failedAt = Date.now();
          throw error;
        },
      );
      current.Lazy = lazy(() => current.promise);
      attempt = current;
    }
    return attempt.promise;
  };

  function Page(props) {
    const [View] = useState(() => {
      if (Loaded) return Loaded;
      load();
      return attempt.Lazy;
    });
    return <View {...props} />;
  }
  Page.preload = () =>
    load(true).then(
      () => {},
      () => {},
    );
  return Page;
}
