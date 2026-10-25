import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };
import { REPO_URL, resolveSite } from './scripts/site-config.mjs';

// GitHub Pages melayani aplikasi di /imuslim/, Vercel (VERCEL=1 saat build) di root "/".
// BASE_PATH / SITE_URL dapat menimpa keduanya. Lihat scripts/site-config.mjs.
export default defineConfig(({ mode, isSsrBuild }) => {
  const site = resolveSite({ ...process.env, ...loadEnv(mode, process.cwd(), '') });
  return {
    base: site.base,
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __SITE_URL__: JSON.stringify(site.url),
      __REPO_URL__: JSON.stringify(REPO_URL),
    },
    build: {
      target: 'es2020',
      // Manifest dipakai scripts/postbuild.mjs untuk preload modul per route.
      manifest: !isSsrBuild,
      // Satu stylesheet untuk seluruh aplikasi: di-inline ke setiap halaman prerender
      // sehingga cat pertama tidak menunggu request CSS apa pun.
      cssCodeSplit: false,
      sourcemap: false,
      copyPublicDir: !isSsrBuild,
      assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
      modulePreload: { polyfill: false },
      chunkSizeWarningLimit: 400,
      reportCompressedSize: false,
    },
    ssr: {
      // Bundel semua dependensi ke entry server agar prerender tidak bergantung pada
      // format paket (ESM/CJS) di node_modules.
      noExternal: true,
    },
    server: {
      port: 5173,
      open: false,
    },
    preview: {
      port: 4173,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      css: false,
      restoreMocks: true,
    },
  };
});
