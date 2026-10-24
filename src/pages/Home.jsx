import { ArrowRight, BookOpen, CalendarDays, Clock, Compass, Copy, ExternalLink, HandCoins, HandHeart, Play, ScrollText, Settings, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { eventsStore, prefsStore, quranStore } from '../app/stores.js';
import { Mark } from '../components/brand/Logo.jsx';
import { ArabicText } from '../components/ui/Content.jsx';
import { Ornament } from '../components/ui/Ornament.jsx';
import { ErrorState, Skeleton } from '../components/ui/Status.jsx';
import { NextPrayerCard } from '../features/home/NextPrayerCard.jsx';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { useNow } from '../hooks/useNow.js';
import { useResource } from '../hooks/useResource.js';
import { useShare } from '../hooks/useShare.js';
import { getArbain } from '../services/api/hadits.js';
import { DAILY_AYAH_REFS, getAyah, getSurahMeta } from '../services/api/quran.js';
import { VIDEOS, youtubeUrl } from '../data/videos.js';
import { formatLongDate, greeting, localIso } from '../utils/format.js';
import { formatHijri, toHijri } from '../utils/hijri.js';
import { useStore } from '../utils/storage.js';
import { truncate } from '../utils/text.js';
import './home.css';

const FEATURES = [
  { to: '/quran', label: "Al-Qur'an", desc: '114 surah, audio 6 qari, tafsir', icon: BookOpen },
  { to: '/sholat', label: 'Jadwal Sholat', desc: 'Harian & imsakiyah per kota', icon: Clock },
  { to: '/doa', label: 'Doa & Dzikir', desc: 'Doa harian & dzikir pilihan', icon: HandHeart },
  { to: '/hadits', label: 'Hadits', desc: '9 kitab + Arbain Nawawi', icon: ScrollText },
  { to: '/kalender', label: 'Kalender', desc: 'Masehi, Hijriah & acara', icon: CalendarDays },
  { to: '/kiblat', label: 'Arah Kiblat', desc: 'Kompas & derajat kiblat', icon: Compass },
  { to: '/zakat', label: 'Zakat', desc: 'Penghasilan, maal, fitrah', icon: HandCoins },
  { to: '/pengaturan', label: 'Pengaturan', desc: 'Tema, bacaan, pengingat', icon: Settings },
];

function dayIndex(iso, length) {
  const [y, m, d] = iso.split('-').map(Number);
  const days = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return ((days % length) + length) % length;
}

export default function Home() {
  useDocumentMeta({
    title: null,
    description:
      "iMuslim: Al-Qur'an digital dengan audio, jadwal sholat & imsakiyah, doa, hadits, kalender Hijriah, arah kiblat, dan kalkulator zakat dalam satu aplikasi web yang ringan.",
    path: '/',
  });
  const prefs = useStore(prefsStore);
  const quran = useStore(quranStore);
  const events = useStore(eventsStore);
  const now = useNow(60000);
  const today = localIso(new Date(now));
  const [y, m, d] = today.split('-').map(Number);
  const hijri = toHijri(y, m, d, prefs.hijriOffset);
  const hour = new Date(now).getHours();
  const todayEvents = events[today] ?? [];

  return (
    <div className="page home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__pattern" aria-hidden="true" />
        <div className="hero__text">
          <Mark animated className="hero__mark" />
          <p className="hero__salam">Assalamu'alaikum{prefs.name ? `, ${prefs.name}` : ''}</p>
          <h1 id="hero-title" className="hero__title display">
            {greeting(hour)}. Semoga hari ini penuh berkah.
          </h1>
          <p className="hero__date">
            <span>{formatLongDate(today)}</span>
            <span className="hero__dot" aria-hidden="true">
              ·
            </span>
            <span>{formatHijri(hijri)}</span>
          </p>
        </div>
        <NextPrayerCard cityId={prefs.cityId} cityName={prefs.cityName} />
      </section>

      {(quran.lastRead || todayEvents.length > 0) && (
        <section className="continue" aria-label="Lanjutkan">
          {quran.lastRead && <LastReadCard lastRead={quran.lastRead} />}
          {todayEvents.length > 0 && (
            <Link to="/kalender" className="continue__item">
              <span className="continue__icon">
                <CalendarDays aria-hidden="true" />
              </span>
              <span className="continue__text">
                <span className="continue__label">Acara hari ini</span>
                <span className="continue__title">
                  {todayEvents
                    .map((e) => (e.time ? `${e.name} (${e.time})` : e.name))
                    .join(' · ')}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="continue__arrow" />
            </Link>
          )}
        </section>
      )}

      <section className="section" aria-labelledby="fitur-title">
        <div className="section__head">
          <h2 id="fitur-title" className="section__title">
            Fitur
          </h2>
        </div>
        <ul className="features">
          {FEATURES.map(({ to, label, desc, icon: Icon }, i) => (
            <li key={to} className="reveal" style={{ '--i': i }}>
              <Link to={to} className="feature">
                <span className="feature__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="feature__label">{label}</span>
                <span className="feature__desc">{desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="daily">
        <DailyAyah today={today} />
        <DailyHadith today={today} />
      </div>

      <section className="section" aria-labelledby="kajian-title">
        <div className="section__head">
          <h2 id="kajian-title" className="section__title">
            Rekomendasi kajian
          </h2>
          <span className="subtle" style={{ fontSize: 'var(--fs-xs)' }}>
            Pilihan dari iMuslim versi sebelumnya
          </span>
        </div>
        <ul className="videos">
          {VIDEOS.map((v) => (
            <li key={v.id}>
              <a className="video" href={youtubeUrl(v.id)} target="_blank" rel="noopener noreferrer">
                <span className="video__head">
                  <span className="video__play" aria-hidden="true">
                    <Play />
                  </span>
                  <span className="video__topic">{v.topic}</span>
                </span>
                <span className="video__title">{v.title}</span>
                <span className="video__channel">
                  {v.channel} · YouTube <ExternalLink aria-hidden="true" />
                </span>
                <span className="visually-hidden">(membuka YouTube di tab baru)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function LastReadCard({ lastRead }) {
  const meta = getSurahMeta(lastRead.surah);
  const name = lastRead.surahLatin || meta?.latin || `Surah ${lastRead.surah}`;
  const progress = meta ? Math.round((lastRead.ayah / meta.ayahCount) * 100) : 0;
  return (
    <Link to={`/quran/${lastRead.surah}?ayat=${lastRead.ayah}`} className="continue__item continue__item--quran">
      <span className="continue__icon">
        <BookOpen aria-hidden="true" />
      </span>
      <span className="continue__text">
        <span className="continue__label">Lanjutkan membaca</span>
        <span className="continue__title">
          {name} · ayat {lastRead.ayah}
          {meta ? ` dari ${meta.ayahCount}` : ''}
        </span>
        {meta && (
          <span className="continue__progress" aria-hidden="true">
            <i style={{ width: `${Math.max(3, progress)}%` }} />
          </span>
        )}
      </span>
      <ArrowRight aria-hidden="true" className="continue__arrow" />
    </Link>
  );
}

function DailyAyah({ today }) {
  const ref = DAILY_AYAH_REFS[dayIndex(today, DAILY_AYAH_REFS.length)];
  const res = useResource(`ayah:${ref.join(':')}`, ({ signal, force }) => getAyah(ref, { signal, force }));
  const { copy, share } = useShare();
  const label = `QS. ${getSurahMeta(ref[0])?.latin ?? ref[0]} [${ref[0]}]: ${ref[1]}`;

  return (
    <section className="daily__card daily__card--ayah" aria-labelledby="ayat-title">
      <div className="daily__head">
        <span className="eyebrow">Ayat hari ini</span>
        <h2 id="ayat-title" className="visually-hidden">
          Ayat hari ini
        </h2>
      </div>
      {res.status === 'loading' && (
        <div aria-busy="true" style={{ display: 'grid', gap: 12 }}>
          <Skeleton height={48} />
          <Skeleton height={18} width="80%" />
          <Skeleton height={18} width="60%" />
        </div>
      )}
      {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title="Ayat belum bisa dimuat" compact />}
      {res.status === 'success' && (
        <>
          <ArabicText size="lg" className="daily__arabic">
            {res.data.arab}
          </ArabicText>
          <Ornament />
          <blockquote className="daily__quote">
            <p>“{res.data.translation}”</p>
            <footer>
              <cite>{label}</cite>
            </footer>
          </blockquote>
          <div className="daily__actions">
            <Link to={`/quran/${ref[0]}?ayat=${ref[1]}`} className="btn btn--soft btn--sm">
              Buka di mushaf <ArrowRight aria-hidden="true" />
            </Link>
            <button type="button" className="icon-btn icon-btn--sm" aria-label="Salin ayat" onClick={() => copy(`${res.data.arab}\n\n“${res.data.translation}” (${label})`)}>
              <Copy />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label="Bagikan ayat"
              onClick={() => share({ title: label, text: `${res.data.arab}\n\n“${res.data.translation}” (${label})`, path: `/quran/${ref[0]}?ayat=${ref[1]}` })}
            >
              <Share2 />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function DailyHadith({ today }) {
  const res = useResource('arbain', ({ signal, force }) => getArbain({ signal, force }), { isEmpty: (d) => !d?.length });
  const item = res.data ? res.data[dayIndex(today, res.data.length)] : null;
  return (
    <section className="daily__card daily__card--hadith" aria-labelledby="hadits-title">
      <div className="daily__head">
        <span className="eyebrow">Hadits hari ini</span>
        <h2 id="hadits-title" className="daily__title">
          {item ? item.title || `Hadits Arbain ke-${item.number}` : 'Arbain An-Nawawi'}
        </h2>
      </div>
      {res.status === 'loading' && (
        <div aria-busy="true" style={{ display: 'grid', gap: 10 }}>
          <Skeleton height={18} />
          <Skeleton height={18} width="90%" />
          <Skeleton height={18} width="70%" />
        </div>
      )}
      {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title="Hadits belum bisa dimuat" compact />}
      {item && (
        <>
          <p className="daily__hadith">{truncate(item.translation, 360)}</p>
          <p className="daily__source">Hadits Arbain An-Nawawi no. {item.number} · sumber: api.myquran.com</p>
          <Link to={`/hadits/arbain/${item.number}`} className="btn btn--sm daily__more">
            Baca lengkap dengan teks Arab <ArrowRight aria-hidden="true" />
          </Link>
        </>
      )}
    </section>
  );
}
