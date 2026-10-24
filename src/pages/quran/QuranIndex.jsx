import { ArrowRight, BookmarkCheck, BookOpen, Star, Trash2, X } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { quranStore } from '../../app/stores.js';
import { PageHeader, SourceNote } from '../../components/ui/Content.jsx';
import { StarNumber } from '../../components/ui/Ornament.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { SearchField } from '../../components/ui/SearchField.jsx';
import { EmptyState } from '../../components/ui/Status.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { getSurahMeta, SURAH_INDEX, SURAH_INDEX_META } from '../../services/api/quran.js';
import { formatShortDate } from '../../utils/format.js';
import { useStore } from '../../utils/storage.js';
import { normalizeSearch, stripArabicDiacritics } from '../../utils/text.js';
import { toggleFavorite } from '../../features/quran/actions.js';
import './quran.css';

const PAGE_SIZE = 30;

function matchSurah(s, q) {
  if (!q) return true;
  const nq = normalizeSearch(q);
  if (/^\d+$/.test(nq)) return String(s.number) === nq || String(s.number).startsWith(nq);
  return (
    normalizeSearch(s.latin).includes(nq) ||
    normalizeSearch(s.meaning).includes(nq) ||
    stripArabicDiacritics(s.name).includes(stripArabicDiacritics(q.trim()))
  );
}

export default function QuranIndex() {
  useDocumentMeta({
    title: "Al-Qur'an Digital",
    description: "Baca 114 surah Al-Qur'an dengan teks Arab, transliterasi latin, terjemahan Kemenag, tafsir, dan audio murattal 6 qari.",
    path: '/quran',
  });
  const [params, setParams] = useSearchParams();
  const tab = ['semua', 'favorit', 'bookmark'].includes(params.get('tab')) ? params.get('tab') : 'semua';
  const query = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('hal')) || 1);
  const quran = useStore(quranStore);

  const update = (patch, { replace = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === undefined || (k === 'hal' && v === 1) || (k === 'tab' && v === 'semua')) next.delete(k);
      else next.set(k, String(v));
    }
    setParams(next, { replace });
  };

  const list = useMemo(() => {
    const base = tab === 'favorit' ? SURAH_INDEX.filter((s) => quran.favorites.includes(s.number)) : SURAH_INDEX;
    return base.filter((s) => matchSurah(s, query));
  }, [tab, query, quran.favorites]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Pintasan "2:255" atau "2 255" → langsung ke ayat.
  const jump = query.trim().match(/^(\d{1,3})\s*[:.\s]\s*(\d{1,3})$/);
  const jumpMeta = jump ? getSurahMeta(Number(jump[1])) : null;
  const jumpAyah = jump ? Number(jump[2]) : 0;

  return (
    <div className="page quran-index">
      <PageHeader
        eyebrow="Al-Qur'anul Karim"
        title="Al-Qur'an Digital"
        description="114 surah dengan teks Arab, latin, terjemahan, tafsir, dan murattal. Ketik nama surah, artinya, nomor, atau rujukan seperti 2:255."
      />

      {quran.lastRead && <LastReadBanner lastRead={quran.lastRead} />}

      <div className="quran-tools">
        <div className="segmented" role="tablist" aria-label="Tampilan daftar">
          {[
            ['semua', 'Semua surah', 114],
            ['favorit', 'Favorit', quran.favorites.length],
            ['bookmark', 'Ayat tersimpan', quran.bookmarks.length],
          ].map(([id, label, count]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => update({ tab: id, hal: 1 })}>
              {label} <span className="count">{count}</span>
            </button>
          ))}
        </div>
        {tab !== 'bookmark' && (
          <div className="quran-tools__search">
            <SearchField id="cari-surah" label="Cari surah" placeholder="Cari surah atau 2:255" value={query} onChange={(v) => update({ q: v, hal: 1 }, { replace: true })} />
          </div>
        )}
      </div>

      {jumpMeta && jumpAyah >= 1 && jumpAyah <= jumpMeta.ayahCount && (
        <Link className="jump-card" to={`/quran/${jumpMeta.number}?ayat=${jumpAyah}`}>
          <BookOpen aria-hidden="true" />
          <span>
            Buka <strong>QS. {jumpMeta.latin}</strong> ayat {jumpAyah}
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}

      {tab === 'bookmark' ? (
        <BookmarkList bookmarks={quran.bookmarks} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={query ? 'search' : 'inbox'}
          title={query ? 'Surah tidak ditemukan' : 'Belum ada surah favorit'}
          text={query ? `Tidak ada surah yang cocok dengan “${query}”.` : 'Tekan ikon bintang pada surah untuk menyimpannya di sini.'}
        />
      ) : (
        <ol className="surah-grid" aria-label="Daftar surah">
          {visible.map((s, i) => (
            <SurahRow key={s.number} surah={s} favorite={quran.favorites.includes(s.number)} index={i} />
          ))}
        </ol>
      )}

      {tab !== 'bookmark' && (
        <Pagination page={current} totalPages={totalPages} totalItems={list.length} pageSize={PAGE_SIZE} label="surah" onChange={(p) => {
          update({ hal: p });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />
      )}

      <SourceNote>
        Daftar surah dari <a href="https://equran.id" target="_blank" rel="noopener noreferrer">equran.id</a> (terjemahan Kemenag RI), diverifikasi{' '}
        {formatShortDate(SURAH_INDEX_META.fetchedAt.slice(0, 10))}. Teks ayat & audio dimuat langsung dari API saat surah dibuka.
      </SourceNote>
    </div>
  );
}

function SurahRow({ surah, favorite, index }) {
  return (
    <li className="surah-row reveal" style={{ '--i': index }}>
      <Link to={`/quran/${surah.number}`} className="surah-row__link">
        <StarNumber value={surah.number} />
        <span className="surah-row__text">
          <span className="surah-row__latin">{surah.latin}</span>
          <span className="surah-row__meta">
            {surah.meaning} · {surah.place} · {surah.ayahCount} ayat
          </span>
        </span>
        <span className="surah-row__arabic" lang="ar" dir="rtl">
          {surah.name}
        </span>
      </Link>
      <button
        type="button"
        className={`icon-btn icon-btn--sm surah-row__fav ${favorite ? 'is-active' : ''}`}
        aria-pressed={favorite}
        aria-label={`${favorite ? 'Hapus' : 'Tambahkan'} ${surah.latin} ${favorite ? 'dari' : 'ke'} favorit`}
        onClick={() => toggleFavorite(surah.number)}
      >
        <Star fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </li>
  );
}

function LastReadBanner({ lastRead }) {
  const meta = getSurahMeta(lastRead.surah);
  return (
    <div className="last-read">
      <Link to={`/quran/${lastRead.surah}?ayat=${lastRead.ayah}`} className="last-read__link">
        <span className="last-read__icon">
          <BookmarkCheck aria-hidden="true" />
        </span>
        <span>
          <span className="last-read__label">Terakhir dibaca</span>
          <span className="last-read__title">
            QS. {lastRead.surahLatin || meta?.latin} · ayat {lastRead.ayah}
          </span>
        </span>
        <span className="last-read__cta">
          Lanjutkan <ArrowRight aria-hidden="true" />
        </span>
      </Link>
      <button type="button" className="icon-btn icon-btn--sm" aria-label="Hapus penanda terakhir dibaca" onClick={() => quranStore.set((q) => ({ ...q, lastRead: null }))}>
        <X />
      </button>
    </div>
  );
}

function BookmarkList({ bookmarks }) {
  if (!bookmarks.length) {
    return <EmptyState title="Belum ada ayat tersimpan" text="Saat membaca surah, tekan ikon penanda pada ayat untuk menyimpannya di sini." />;
  }
  const sorted = [...bookmarks].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
  return (
    <ul className="bookmark-list">
      {sorted.map((b) => {
        const meta = getSurahMeta(b.surah);
        return (
          <li key={`${b.surah}:${b.ayah}`}>
            <Link to={`/quran/${b.surah}?ayat=${b.ayah}`} className="row-link">
              <StarNumber value={b.surah} />
              <span className="grow">
                <strong>QS. {meta?.latin ?? b.surahLatin}</strong> · ayat {b.ayah}
                <span className="subtle" style={{ display: 'block', fontSize: 'var(--fs-xs)' }}>
                  {meta?.meaning}
                </span>
              </span>
              <ArrowRight aria-hidden="true" width={18} />
            </Link>
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label={`Hapus QS. ${meta?.latin} ayat ${b.ayah} dari tersimpan`}
              onClick={() => quranStore.set((q) => ({ ...q, bookmarks: q.bookmarks.filter((x) => !(x.surah === b.surah && x.ayah === b.ayah)) }))}
            >
              <Trash2 />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
