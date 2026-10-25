import { LayoutGrid } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV, NAV_GROUPS, BOTTOM_NAV, titleForPath } from '../../app/nav.js';
import { prefetchProps } from '../../app/pages.js';
import { useAudioState } from '../../app/audio.jsx';
import { BrandSprite, Mark, Wordmark } from '../brand/Logo.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { LoadingBlock } from '../ui/Status.jsx';
import { FullscreenButton, ThemeToggle } from './AppTools.jsx';
import { AudioPlayerBar } from './AudioPlayerBar.jsx';
import { Footer } from './Footer.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { OfflineBanner } from './OfflineBanner.jsx';
import { PrayerAlarm } from './PrayerAlarm.jsx';

// Jembatan alarm adzan native — hanya ikut di build aplikasi Android.
const NativeBridge = __NATIVE__ ? lazy(() => import('../../native/NativeBridge.jsx')) : null;

function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Navigasi utama">
      <Link to="/" className="sidebar__brand" aria-label="iMuslim — beranda">
        <Mark />
        <Wordmark />
      </Link>
      {NAV_GROUPS.map((g) => (
        <div className="sidebar__group" key={g.id}>
          <span className="sidebar__label">{g.label}</span>
          {NAV.filter((n) => n.group === g.id).map(({ to, label, short, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="sidebar__link" title={label} {...prefetchProps(to)}>
              <Icon aria-hidden="true" />
              <span className="sidebar__text">
                <span className="only-wide">{label}</span>
                <span className="only-rail">{short}</span>
              </span>
            </NavLink>
          ))}
        </div>
      ))}
      <div className="sidebar__spacer" />
      <div className="sidebar__tools">
        <ThemeToggle />
        <FullscreenButton />
      </div>
    </nav>
  );
}

function Topbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const isHome = pathname === '/';
  return (
    <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="topbar__brand">
        <Link to="/" className="topbar__home" aria-label="Beranda iMuslim">
          <Mark />
        </Link>
        {isHome ? <Wordmark className="topbar__wordmark" /> : <span className="topbar__title">{titleForPath(pathname)}</span>}
      </div>
      <div className="topbar__actions">
        <ThemeToggle />
        <FullscreenButton />
      </div>
    </header>
  );
}

function BottomNav({ onMenu, menuOpen }) {
  const { pathname } = useLocation();
  const inMenu = !BOTTOM_NAV.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));
  return (
    <nav className="bottom-nav" aria-label="Navigasi bawah">
      {BOTTOM_NAV.map((path) => {
        const item = NAV.find((n) => n.to === path);
        const Icon = item.icon;
        return (
          <NavLink key={path} to={path} end={item.end} className="bottom-nav__item" {...prefetchProps(path)}>
            <Icon aria-hidden="true" />
            <span>{item.short}</span>
          </NavLink>
        );
      })}
      <button
        type="button"
        className={`bottom-nav__item ${inMenu ? 'is-active' : ''}`}
        onClick={onMenu}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
      >
        <LayoutGrid aria-hidden="true" />
        <span>Menu</span>
      </button>
    </nav>
  );
}

function MenuSheet({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} title="Semua fitur" sheet>
      <nav aria-label="Semua fitur">
        <div className="menu-grid">
          {NAV.filter((n) => n.to !== '/').map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={onClose} {...prefetchProps(to)}>
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="menu-tools">
        <ThemeToggle className="btn" withLabel />
        <FullscreenButton className="btn" withLabel />
      </div>
    </Dialog>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const audio = useAudioState();
  // Transisi halaman hanya setelah navigasi pertama di dalam aplikasi (bukan saat halaman
  // prerender pertama kali tampil) → konten awal langsung terlihat penuh.
  const [firstPath] = useState(pathname);
  const [navigated, setNavigated] = useState(false);
  if (!navigated && pathname !== firstPath) setNavigated(true);

  // Gulir ke atas saat berpindah halaman (kecuali ada anchor/ayat yang dituju).
  useEffect(() => {
    if (!window.location.hash && !window.location.search.includes('ayat=')) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className={`app ${audio.queue ? 'has-player' : ''} ${navigated ? 'is-navigated' : ''}`}>
      <BrandSprite />
      <a href="#konten" className="skip-link">
        Lewati ke konten utama
      </a>
      <Sidebar />
      <div className="app__column">
        <Topbar />
        <OfflineBanner />
        <PrayerAlarm />
        {NativeBridge && (
          <Suspense fallback={null}>
            <NativeBridge />
          </Suspense>
        )}
        <main id="konten" className="app__main" tabIndex={-1}>
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
          <Footer />
        </main>
      </div>
      <BottomNav onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <AudioPlayerBar />
    </div>
  );
}

function PageFallback() {
  return (
    <div className="page">
      <LoadingBlock label="Memuat halaman…" rows={3} />
    </div>
  );
}
