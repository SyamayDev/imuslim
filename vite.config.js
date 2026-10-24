import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// GitHub Pages (project site) melayani aplikasi di https://syamaydev.github.io/muslimweb/
// sehingga seluruh aset dan route harus berada di bawah base /muslimweb/.
export const BASE = '/muslimweb/';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2020',
    manifest: true, // dipakai scripts/postbuild.mjs untuk preload per route
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 400,
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
});
