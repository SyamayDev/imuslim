// Situs lama memakai alamat seperti /muslimweb/quran/index.html. GitHub Pages melayani file
// index.html tersebut apa adanya, sehingga path harus dibersihkan SEBELUM router dibuat;
// jika tidak, "index.html" akan dibaca sebagai parameter (mis. nomor surah).
if (typeof window !== 'undefined') {
  const { pathname, search, hash } = window.location;
  if (/\/index\.html$/i.test(pathname)) {
    const clean = pathname.replace(/index\.html$/i, '');
    window.history.replaceState(window.history.state, '', `${clean}${search}${hash}`);
  }
}
