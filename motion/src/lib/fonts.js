// Huruf merek di-host sendiri lewat Fontsource. Render ditahan sampai ketiga huruf benar-benar
// dimuat, sehingga tidak ada frame yang tergambar dengan huruf cadangan.
import '@fontsource/fraunces/600.css';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/amiri-quran/400.css';
import { cancelRender, continueRender, delayRender } from 'remotion';

const handle = delayRender('Memuat huruf Fraunces, Plus Jakarta Sans, Amiri Quran');

Promise.all([
  document.fonts.load('600 64px "Fraunces"'),
  document.fonts.load('400 32px "Plus Jakarta Sans Variable"'),
  document.fonts.load('700 32px "Plus Jakarta Sans Variable"'),
  document.fonts.load('400 64px "Amiri Quran"', 'بِسْمِ اللّٰهِ'),
])
  .then((sets) => {
    const missing = sets.filter((s) => s.length === 0).length;
    if (missing) throw new Error(`${missing} huruf gagal dimuat`);
    continueRender(handle);
  })
  .catch((err) => cancelRender(err));
