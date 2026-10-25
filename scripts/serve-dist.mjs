// Server statis lokal yang meniru GitHub Pages untuk project site:
//  - aplikasi dilayani di base build (bawaan /imuslim/, lihat scripts/site-config.mjs)
//  - folder → index.html, file tidak ada → 404.html dengan status 404 (tanpa rewrite SPA)
//  - folder tanpa garis miring dialihkan 301 ke versi bergaris miring
// Dipakai untuk `npm run preview`, pengujian e2e, dan Lighthouse.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { resolveSite } from './site-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const BASE = resolveSite().base;
const PORT = Number(process.env.PORT || process.argv[2] || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.xml', '.txt']);

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.isFile() ? s : null;
  } catch {
    return null;
  }
}

function send(req, res, file, status, info) {
  const ext = extname(file);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream' };
  // GitHub Pages memakai cache 10 menit; aset ber-hash aman di-cache lebih lama.
  headers['Cache-Control'] = file.includes(`${join('dist', 'assets')}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=600';
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (gzip) headers['Content-Encoding'] = 'gzip';
  else headers['Content-Length'] = info.size;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') return res.end();
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (BASE !== '/' && (path === '/' || path === BASE.slice(0, -1))) {
    res.writeHead(301, { Location: BASE + url.search });
    return res.end();
  }
  if (!path.startsWith(BASE)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(`404 (di luar ${BASE})`);
  }
  const rel = normalize(path.slice(BASE.length)).replace(/^([/\\])+/, '');
  if (rel.startsWith('..')) {
    res.writeHead(400);
    return res.end();
  }
  let file = join(root, rel);
  let info = await fileExists(file);
  if (!info) {
    // Folder tanpa garis miring → redirect seperti GitHub Pages
    const asIndex = join(file, 'index.html');
    const idx = await fileExists(asIndex);
    if (idx) {
      if (!path.endsWith('/')) {
        res.writeHead(301, { Location: `${path}/${url.search}` });
        return res.end();
      }
      file = asIndex;
      info = idx;
    }
  }
  if (!info) {
    const notFound = join(root, '404.html');
    const nf = await fileExists(notFound);
    if (!nf) {
      res.writeHead(404);
      return res.end('404');
    }
    return send(req, res, notFound, 404, nf);
  }
  return send(req, res, file, 200, info);
}).listen(PORT, () => {
  console.log(`iMuslim (dist) → http://localhost:${PORT}${BASE}`);
});
