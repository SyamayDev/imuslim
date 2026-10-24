import { useEffect } from 'react';

import { SITE_URL } from '../app/site.js';

export { SITE_URL };
const SITE_NAME = 'iMuslim';

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [, key, name] = selector.match(/\[(name|property)="([^"]+)"\]/) ?? [];
    if (key) el.setAttribute(key, name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

/** URL kanonis: GitHub Pages mengalihkan /folder → /folder/, jadi selalu pakai garis miring akhir. */
export function canonicalUrl(path) {
  const clean = path.split(/[?#]/)[0];
  return `${SITE_URL}${clean === '/' ? '/' : `${clean.replace(/\/+$/, '')}/`}`;
}

/** Judul, deskripsi, dan canonical unik per halaman. */
export function useDocumentMeta({ title, description, path }) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Teman Ibadah Harian`;
    document.title = full;
    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
    }
    setMeta('meta[property="og:title"]', 'content', full);
    if (path != null) {
      const url = canonicalUrl(path);
      setCanonical(url);
      setMeta('meta[property="og:url"]', 'content', url);
    }
  }, [title, description, path]);
}
