// Diisi saat build dari scripts/site-config.mjs (GitHub Pages /imuslim/ atau Vercel).
export const SITE_URL = __SITE_URL__;
export const REPO_URL = __REPO_URL__;
// Basis API notifikasi push (Vercel Functions), lihat scripts/site-config.mjs.
export const PUSH_API = __PUSH_API__;
// Aplikasi Android: pakai konstanta build __NATIVE__ LANGSUNG di tempat pemakaian (bukan lewat
// impor) agar cabang native benar-benar terbuang dari build web.
// Situs produksi (sumber APK & info versinya, juga bagi aplikasi Android).
export const PROD_URL = 'https://imuslim-seven.vercel.app';
