// Daftar halaman (code-splitting per route) + helper preload/prefetch.
import { lazyPage } from './lazyPage.jsx';

export const PAGES = {
  Home: lazyPage(() => import('../pages/Home.jsx')),
  QuranIndex: lazyPage(() => import('../pages/quran/QuranIndex.jsx')),
  SurahPage: lazyPage(() => import('../pages/quran/SurahPage.jsx')),
  Sholat: lazyPage(() => import('../pages/Sholat.jsx')),
  DoaIndex: lazyPage(() => import('../pages/doa/DoaIndex.jsx')),
  DoaDetail: lazyPage(() => import('../pages/doa/DoaDetail.jsx')),
  HaditsIndex: lazyPage(() => import('../pages/hadits/HaditsIndex.jsx')),
  HaditsBook: lazyPage(() => import('../pages/hadits/HaditsBook.jsx')),
  HaditsDetail: lazyPage(() => import('../pages/hadits/HaditsDetail.jsx')),
  Kalender: lazyPage(() => import('../pages/Kalender.jsx')),
  Kiblat: lazyPage(() => import('../pages/Kiblat.jsx')),
  Zakat: lazyPage(() => import('../pages/Zakat.jsx')),
  Pengaturan: lazyPage(() => import('../pages/Pengaturan.jsx')),
  Tentang: lazyPage(() => import('../pages/Tentang.jsx')),
  NotFound: lazyPage(() => import('../pages/NotFound.jsx')),
};

/** Halaman untuk sebuah path aplikasi (tanpa base). */
export function pageForPath(path) {
  const [a, b, c] = String(path).split(/[?#]/)[0].split('/').filter(Boolean);
  switch (a) {
    case undefined:
      return PAGES.Home;
    case 'quran':
      return b ? PAGES.SurahPage : PAGES.QuranIndex;
    case 'sholat':
      return PAGES.Sholat;
    case 'doa':
      return b ? PAGES.DoaDetail : PAGES.DoaIndex;
    case 'hadits':
      return c ? PAGES.HaditsDetail : b ? PAGES.HaditsBook : PAGES.HaditsIndex;
    case 'kalender':
      return PAGES.Kalender;
    case 'kiblat':
      return PAGES.Kiblat;
    case 'zakat':
      return PAGES.Zakat;
    case 'pengaturan':
      return PAGES.Pengaturan;
    case 'tentang':
      return PAGES.Tentang;
    default:
      return PAGES.NotFound;
  }
}

/** Muat modul halaman lebih dulu (aman dipanggil berkali-kali; gagal diabaikan). */
export function preloadPath(path) {
  return pageForPath(path).preload();
}

/** Props untuk tautan: modul halaman tujuan diprefetch saat disentuh/diarahkan/difokus. */
export function prefetchProps(to) {
  const run = () => {
    preloadPath(to);
  };
  return { onPointerEnter: run, onFocus: run, onTouchStart: run };
}
