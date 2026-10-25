import { defineConfig, devices } from '@playwright/test';
import { resolveSite } from './scripts/site-config.mjs';

// E2E dijalankan terhadap hasil build (dist/) yang dilayani seperti GitHub Pages
// (base /imuslim/, 404.html tanpa rewrite SPA). Jalankan `npm run build` terlebih dahulu.
// Bawaan memakai Google Chrome yang terpasang (channel 'chrome').
const PORT = 4173;
const BASE = resolveSite().base;
// PW_CHANNEL=bundled → pakai Chromium bawaan Playwright (setelah `npx playwright install chromium`).
const channel = process.env.PW_CHANNEL === 'bundled' ? undefined : (process.env.PW_CHANNEL ?? 'chrome');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    channel,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1280, height: 860 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
  ],
  webServer: {
    command: `node scripts/serve-dist.mjs ${PORT}`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
