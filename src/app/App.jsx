import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.jsx';
import { ToastProvider } from '../components/ui/Toast.jsx';
import { AudioProvider } from './audio.jsx';
import { PAGES } from './pages.js';
import { ThemeController } from './ThemeController.jsx';

const { Home, QuranIndex, SurahPage, Sholat, DoaIndex, DoaDetail, HaditsIndex, HaditsBook, HaditsDetail, Kalender, Kiblat, Zakat, Pengaturan, Tentang, NotFound } = PAGES;

/** Alamat lama (situs HTML statis sebelumnya) dialihkan ke route baru, query/hash dipertahankan. */
function LegacyRedirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

/**
 * Pohon aplikasi tanpa router: dibungkus BrowserRouter di klien (src/main.jsx)
 * dan StaticRouter saat prerender (src/entry-server.jsx).
 */
/** Menandai <html data-ready> setelah React mengambil alih (hydration/render pertama selesai). */
function ReadyMarker() {
  useEffect(() => {
    document.documentElement.dataset.ready = '';
  }, []);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <AudioProvider>
        <ThemeController />
        <ReadyMarker />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="quran" element={<QuranIndex />} />
            <Route path="quran/:nomor" element={<SurahPage />} />
            <Route path="sholat" element={<Sholat />} />
            <Route path="doa" element={<DoaIndex />} />
            <Route path="doa/:koleksi/:id" element={<DoaDetail />} />
            <Route path="hadits" element={<HaditsIndex />} />
            <Route path="hadits/:kitab" element={<HaditsBook />} />
            <Route path="hadits/:kitab/:nomor" element={<HaditsDetail />} />
            <Route path="kalender" element={<Kalender />} />
            <Route path="kiblat" element={<Kiblat />} />
            <Route path="zakat" element={<Zakat />} />
            <Route path="pengaturan" element={<Pengaturan />} />
            <Route path="tentang" element={<Tentang />} />
            {/* Alamat versi lama */}
            <Route path="jadwalsholatdanimsakiah" element={<LegacyRedirect to="/sholat" />} />
            <Route path="hadist" element={<LegacyRedirect to="/hadits" />} />
            <Route path="kalkulatorzakat" element={<LegacyRedirect to="/zakat" />} />
            <Route path="setting" element={<LegacyRedirect to="/pengaturan" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AudioProvider>
    </ToastProvider>
  );
}
