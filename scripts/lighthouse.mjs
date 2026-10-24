// Audit Lighthouse (mobile & desktop) terhadap dist/ yang dilayani seperti GitHub Pages.
// Pemakaian: npm run build && npm run lighthouse [-- /quran/ /sholat/]
// Hasil: reports/lighthouse/*.html|json dan reports/lighthouse/summary.json
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'reports/lighthouse');
const PORT = 4321;
const BASE = `http://localhost:${PORT}/muslimweb`;
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/quran/', '/quran/1/', '/sholat/', '/doa/', '/hadits/', '/kalender/', '/kiblat/', '/zakat/'];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

await mkdir(outDir, { recursive: true });
const server = spawn(process.execPath, [resolve(root, 'scripts/serve-dist.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
const summary = { measuredAt: new Date().toISOString(), lighthouse: null, chrome: null, results: [] };

try {
  for (const formFactor of ['mobile', 'desktop']) {
    for (const route of routes) {
      const url = `${BASE}${route}`;
      const config = formFactor === 'desktop' ? desktopConfig : undefined;
      const result = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: CATEGORIES }, config);
      const lhr = result.lhr;
      summary.lighthouse = lhr.lighthouseVersion;
      summary.chrome = lhr.environment?.hostUserAgent?.match(/Chrome\/[\d.]+/)?.[0] ?? null;
      const scores = Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]));
      const failing = Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable')
        .map((a) => `${a.id} (${a.displayValue ?? a.score})`);
      const metrics = {
        FCP: lhr.audits['first-contentful-paint']?.displayValue,
        LCP: lhr.audits['largest-contentful-paint']?.displayValue,
        TBT: lhr.audits['total-blocking-time']?.displayValue,
        CLS: lhr.audits['cumulative-layout-shift']?.displayValue,
      };
      const slug = `${formFactor}-${route.replace(/\//g, '_') || 'root'}`;
      const [html, json] = result.report;
      await writeFile(resolve(outDir, `${slug}.html`), html);
      await writeFile(resolve(outDir, `${slug}.json`), json);
      summary.results.push({ formFactor, route, scores, metrics, failing });
      console.log(`${formFactor.padEnd(7)} ${route.padEnd(12)} P${scores.performance} A${scores.accessibility} BP${scores['best-practices']} SEO${scores.seo}  ${Object.entries(metrics).map(([k, v]) => `${k}=${v}`).join(' ')}${failing.length ? `\n         ↳ ${failing.join(', ')}` : ''}`);
    }
  }
} finally {
  await chrome.kill();
  server.kill();
}
await writeFile(resolve(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`\nLaporan: ${outDir}`);
