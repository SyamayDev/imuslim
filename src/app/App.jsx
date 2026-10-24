import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.jsx';
import { ToastProvider } from '../components/ui/Toast.jsx';
import { AudioProvider } from './audio.jsx';
import { ThemeController } from './ThemeController.jsx';

// Code-splitting per halaman.
const Home = lazy(() => import('../pages/Home.jsx'));
const QuranIndex = lazy(() => import('../pages/quran/QuranIndex.jsx'));
const SurahPage = lazy(() => import('../pages/quran/SurahPage.jsx'));
const Sholat = lazy(() => import('../pages/Sholat.jsx'));
const DoaIndex = lazy(() => import('../pages/doa/DoaIndex.jsx'));
const DoaDetail = lazy(() => import('../pages/doa/DoaDetail.jsx'));
const HaditsIndex = lazy(() => import('../pages/hadits/HaditsIndex.jsx'));
const HaditsBook = lazy(() => import('../pages/hadits/HaditsBook.jsx'));
const HaditsDetail = lazy(() => import('../pages/hadits/HaditsDetail.jsx'));
const Kalender = lazy(() => import('../pages/Kalender.jsx'));
const Kiblat = lazy(() => import('../pages/Kiblat.jsx'));
const Zakat = lazy(() => import('../pages/Zakat.jsx'));
const Pengaturan = lazy(() => import('../pages/Pengaturan.jsx'));
const Tentang = lazy(() => import('../pages/Tentang.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

/** Alamat lama (situs HTML statis sebelumnya) dialihkan ke route baru, query/hash dipertahankan. */
function LegacyRedirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <ToastProvider>
      <AudioProvider>
        <ThemeController />
        <BrowserRouter basename={BASENAME}>
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
        </BrowserRouter>
      </AudioProvider>
    </ToastProvider>
  );
}
