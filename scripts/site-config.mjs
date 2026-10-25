// Satu sumber kebenaran untuk base path & URL situs.
// Dipakai vite.config.js, scripts/postbuild.mjs, serve-dist, Lighthouse, dan screenshot.
//
//  - GitHub Pages (project site)  → https://syamaydev.github.io/imuslim/   base "/imuslim/"
//  - Vercel (mengatur VERCEL=1)    → https://<domain-produksi-vercel>/      base "/"
//  - BASE_PATH / SITE_URL          → menimpa keduanya (mis. domain kustom)
export const REPO = 'imuslim';
export const OWNER = 'SyamayDev';
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
export const GH_PAGES_URL = `https://syamaydev.github.io/${REPO}`;

const withSlashes = (p) => `/${String(p).replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');

export function resolveSite(env = process.env) {
  const onVercel = Boolean(env.VERCEL);
  const base = withSlashes(env.BASE_PATH || (onVercel ? '/' : `/${REPO}/`));
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  let url = env.SITE_URL;
  if (!url) url = onVercel && vercelHost ? `https://${vercelHost}` : `https://syamaydev.github.io${base}`;
  return { base, url: url.replace(/\/+$/, ''), onVercel };
}
