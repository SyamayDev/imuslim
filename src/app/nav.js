import { BookOpen, CalendarDays, Clock, Compass, HandCoins, HandHeart, House, Info, ScrollText, Settings } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Beranda', short: 'Beranda', icon: House, group: 'ibadah', end: true },
  { to: '/quran', label: "Al-Qur'an", short: "Qur'an", icon: BookOpen, group: 'ibadah' },
  { to: '/sholat', label: 'Jadwal Sholat', short: 'Sholat', icon: Clock, group: 'ibadah' },
  { to: '/doa', label: 'Doa & Dzikir', short: 'Doa', icon: HandHeart, group: 'ibadah' },
  { to: '/hadits', label: 'Hadits', short: 'Hadits', icon: ScrollText, group: 'ibadah' },
  { to: '/kalender', label: 'Kalender Hijriah', short: 'Kalender', icon: CalendarDays, group: 'alat' },
  { to: '/kiblat', label: 'Arah Kiblat', short: 'Kiblat', icon: Compass, group: 'alat' },
  { to: '/zakat', label: 'Kalkulator Zakat', short: 'Zakat', icon: HandCoins, group: 'alat' },
  { to: '/pengaturan', label: 'Pengaturan', short: 'Pengaturan', icon: Settings, group: 'lainnya' },
  { to: '/tentang', label: 'Tentang & Sumber', short: 'Tentang', icon: Info, group: 'lainnya' },
];

export const NAV_GROUPS = [
  { id: 'ibadah', label: 'Ibadah' },
  { id: 'alat', label: 'Alat' },
  { id: 'lainnya', label: 'Lainnya' },
];

// Navigasi bawah seluler: 4 fitur inti + tombol Menu.
export const BOTTOM_NAV = ['/', '/quran', '/sholat', '/doa'];

export function titleForPath(pathname) {
  const match = NAV.filter((n) => n.to !== '/').find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`));
  return match?.label ?? 'iMuslim';
}
