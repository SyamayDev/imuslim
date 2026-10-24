// Registrasi service worker (hanya build produksi). Juga membersihkan registrasi lama
// di bawah /muslimweb/ yang bukan milik versi ini, sehingga aset usang tidak tertahan.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL; // "/muslimweb/"
  const swUrl = `${base}sw.js`;

  window.addEventListener('load', async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => {
            const scope = new URL(r.scope).pathname;
            const script = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? '';
            return scope.startsWith(base) && script && new URL(script).pathname !== swUrl;
          })
          .map((r) => r.unregister()),
      );
      const reg = await navigator.serviceWorker.register(swUrl, { scope: base });
      // Periksa pembaruan saat tab kembali aktif.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch (error) {
      console.warn('Service worker tidak dapat didaftarkan:', error);
    }
  });
}
