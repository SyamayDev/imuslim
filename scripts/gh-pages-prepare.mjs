// Dijalankan sebelum dist/ dipublikasikan ke branch gh-pages (workflow & `npm run deploy`).
// Branch gh-pages hanya berisi hasil build, jadi Vercel tidak perlu (dan tidak bisa)
// membangunnya: vercel.json di root branch itu mematikan deployment Vercel untuknya.
import { access, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
try {
  await access(resolve(dist, 'index.html'));
} catch {
  throw new Error('dist/index.html tidak ada — jalankan `npm run build` terlebih dahulu.');
}
await writeFile(resolve(dist, 'vercel.json'), `${JSON.stringify({ git: { deploymentEnabled: false } }, null, 2)}\n`);
await writeFile(resolve(dist, '.nojekyll'), '');
console.log('gh-pages: dist/ siap dipublikasikan (vercel.json + .nojekyll).');
