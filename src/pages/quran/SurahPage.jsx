import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  ChevronDown,
  Copy,
  Pause,
  Play,
  Share2,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { currentTrack, useAudioControls, useAudioState } from '../../app/audio.jsx';
import { prefsStore, quranStore } from '../../app/stores.js';
import { ArabicText, Paragraphs, RichText } from '../../components/ui/Content.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StarNumber } from '../../components/ui/Ornament.jsx';
import { DataNotice, EmptyState, ErrorState, LoadingBlock, Skeleton } from '../../components/ui/Status.jsx';
import { SwitchRow } from '../../components/ui/Switch.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { useResource } from '../../hooks/useResource.js';
import { useShare } from '../../hooks/useShare.js';
import { getSurah, getSurahMeta, getTafsir, isValidSurahNumber, QARI } from '../../services/api/quran.js';
import { useStore } from '../../utils/storage.js';
import { toggleFavorite } from '../../features/quran/actions.js';
import './quran.css';

const BASMALAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ';

export default function SurahPage() {
  const { nomor } = useParams();
  const n = Number(nomor);
  const valid = isValidSurahNumber(n);
  const meta = valid ? getSurahMeta(n) : null;
  useDocumentMeta({
    title: meta ? `Surah ${meta.latin} (${meta.meaning})` : 'Surah tidak ditemukan',
    description: meta
      ? `Baca Surah ${meta.latin} (${meta.name}) — ${meta.meaning}, ${meta.ayahCount} ayat, ${meta.place}. Teks Arab, latin, terjemahan, tafsir, dan audio murattal.`
      : 'Nomor surah tidak valid.',
    path: valid ? `/quran/${n}` : null,
  });

  if (!valid) {
    return (
      <div className="page">
        <EmptyState
          title="Surah tidak ditemukan"
          text={`Nomor surah “${nomor}” tidak valid. Al-Qur'an terdiri dari 114 surah.`}
          action={
            <Link to="/quran" className="btn btn--primary">
              Ke daftar surah
            </Link>
          }
        />
      </div>
    );
  }
  return <SurahReader key={n} n={n} meta={meta} />;
}

function SurahReader({ n, meta }) {
  const prefs = useStore(prefsStore);
  const quran = useStore(quranStore);
  const [params] = useSearchParams();
  const targetAyah = Number(params.get('ayat')) || null;
  const res = useResource(`surah:${n}`, ({ signal, force }) => getSurah(n, { signal, force }));
  const audio = useAudioControls();
  const audioState = useAudioState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [follow, setFollow] = useState(true);
  const [highlight, setHighlight] = useState(targetAyah);
  const owner = `quran:${n}`;
  const surah = res.data;
  const qari = prefs.qari;

  // Hentikan audio surah lain saat berpindah surah (mencegah audio bertumpuk).
  const stopOtherSurah = useEffectEvent(() => {
    const q = audioState.queue;
    if (q && q.kind === 'quran' && q.owner !== owner) audio.stop();
  });
  useEffect(() => {
    stopOtherSurah();
  }, [owner]);

  // Gulir ke ayat tujuan (?ayat=N) setelah data siap.
  useEffect(() => {
    if (res.status !== 'success' || !targetAyah) return;
    const el = document.getElementById(`ayat-${targetAyah}`);
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      const t = setTimeout(() => setHighlight(null), 2600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [res.status, targetAyah]);

  const playing = audioState.queue?.owner === owner ? currentTrack(audioState) : null;
  const playingAyah = playing && playing.key.startsWith(`${n}:`) && !playing.key.endsWith(':full') ? Number(playing.key.split(':')[1]) : null;
  const playingFull = playing?.key === `${n}:full`;
  const isPlaying = audioState.status === 'playing' || audioState.status === 'loading';

  // Ikuti bacaan: gulir ke ayat yang sedang diputar.
  const lastScrolled = useRef(null);
  useEffect(() => {
    if (!follow || !playingAyah || lastScrolled.current === playingAyah) return;
    lastScrolled.current = playingAyah;
    document.getElementById(`ayat-${playingAyah}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [playingAyah, follow]);

  const ayahTracks = useMemo(() => {
    if (!surah) return [];
    return surah.ayahs
      .map((a) => {
        const src = a.audio[qari] ?? Object.values(a.audio)[0];
        return src ? { key: `${n}:${a.number}`, src, title: `${surah.latin} · Ayat ${a.number}`, subtitle: QARI[a.audio[qari] ? qari : Object.keys(a.audio)[0]] } : null;
      })
      .filter(Boolean);
  }, [surah, qari, n]);

  const fullSrc = surah ? (surah.audioFull[qari] ?? Object.values(surah.audioFull)[0]) : null;

  const playFromAyah = (ayahNumber) => {
    if (playingAyah === ayahNumber) return audio.toggle();
    const idx = ayahTracks.findIndex((t) => t.key === `${n}:${ayahNumber}`);
    if (idx < 0) return undefined;
    lastScrolled.current = ayahNumber;
    return audio.playQueue({ id: `${owner}:ayat:${qari}`, kind: 'quran', owner, title: `QS. ${surah.latin}`, tracks: ayahTracks }, idx);
  };
  const playFull = () => {
    if (playingFull) return audio.toggle();
    if (!fullSrc) return undefined;
    return audio.playQueue({
      id: `${owner}:full:${qari}`,
      kind: 'quran',
      owner,
      title: `QS. ${surah.latin}`,
      tracks: [{ key: `${n}:full`, src: fullSrc, title: `Surah ${surah.latin} (lengkap)`, subtitle: QARI[surah.audioFull[qari] ? qari : Object.keys(surah.audioFull)[0]] }],
    });
  };

  const favorite = quran.favorites.includes(n);
  const prev = n > 1 ? getSurahMeta(n - 1) : null;
  const next = n < 114 ? getSurahMeta(n + 1) : null;

  return (
    <div className="page page--reading surah">
      <header className="surah-head">
        <Link to="/quran" className="back-link">
          <ArrowLeft aria-hidden="true" /> Daftar surah
        </Link>
        <div className="surah-head__card">
          <p className="eyebrow">
            Surah ke-{n} · {meta.place} · {meta.ayahCount} ayat
          </p>
          <p className="surah-head__arabic" lang="ar" dir="rtl">
            {meta.name}
          </p>
          <h1 className="surah-head__title">{meta.latin}</h1>
          <p className="surah-head__meaning">“{meta.meaning}”</p>
          <div className="surah-head__actions">
            <button type="button" className="btn btn--primary" onClick={playFull} disabled={!fullSrc}>
              {playingFull && isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {playingFull && isPlaying ? 'Jeda murattal' : 'Putar satu surah'}
            </button>
            <button
              type="button"
              className={`icon-btn icon-btn--outline ${favorite ? 'is-active' : ''}`}
              aria-pressed={favorite}
              aria-label={favorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
              onClick={() => toggleFavorite(n)}
            >
              <Star fill={favorite ? 'currentColor' : 'none'} />
            </button>
            <button type="button" className="icon-btn icon-btn--outline" aria-label="Pengaturan tampilan bacaan" onClick={() => setSettingsOpen(true)}>
              <SlidersHorizontal />
            </button>
          </div>
        </div>
      </header>

      {res.status === 'loading' && <SurahSkeleton />}
      {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title={`Surah ${meta.latin} belum bisa dimuat`} />}

      {surah && (
        <>
          <DataNotice meta={res.meta} error={res.error} onRetry={res.reload} fallbackLabel="alquran.cloud — tanpa transliterasi latin & tafsir" />

          <div className="surah-bar" role="toolbar" aria-label="Navigasi bacaan">
            <label className="surah-bar__jump">
              <span>Ke ayat</span>
              <select
                className="select"
                value=""
                onChange={(e) => {
                  const a = Number(e.target.value);
                  if (a) document.getElementById(`ayat-${a}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }}
              >
                <option value="">Pilih…</option>
                {surah.ayahs.map((a) => (
                  <option key={a.number} value={a.number}>
                    {a.number}
                  </option>
                ))}
              </select>
            </label>
            <label className="surah-bar__qari">
              <span>Qari</span>
              <select className="select" value={qari} onChange={(e) => prefsStore.set((p) => ({ ...p, qari: e.target.value }))}>
                {Object.entries(QARI)
                  .filter(([id]) => Object.keys(surah.audioFull).includes(id) || surah.ayahs[0]?.audio[id])
                  .map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {surah.description && (
            <details className="surah-info">
              <summary>
                Tentang surah ini <ChevronDown aria-hidden="true" />
              </summary>
              <RichText html={surah.description} className="surah-info__text" />
            </details>
          )}

          {n !== 1 && n !== 9 && (
            <ArabicText size="lg" className="basmalah">
              {BASMALAH}
            </ArabicText>
          )}
          {n === 9 && <p className="surah-note">Surah At-Taubah tidak diawali basmalah.</p>}

          <ol className="ayah-list">
            {surah.ayahs.map((a) => (
              <AyahItem
                key={a.number}
                surah={surah}
                ayah={a}
                prefs={prefs}
                bookmarked={quran.bookmarks.some((b) => b.surah === n && b.ayah === a.number)}
                isLastRead={quran.lastRead?.surah === n && quran.lastRead?.ayah === a.number}
                active={playingAyah === a.number}
                activePlaying={playingAyah === a.number && isPlaying}
                highlighted={highlight === a.number}
                hasAudio={ayahTracks.some((t) => t.key === `${n}:${a.number}`)}
                onPlay={() => playFromAyah(a.number)}
              />
            ))}
          </ol>

          <label className="follow-toggle">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> Ikuti ayat yang sedang diputar
          </label>

          <p className="source-note">
            Teks Arab, latin, terjemahan & tafsir: {surah.source === 'equran.id' ? 'equran.id (Kemenag RI)' : 'alquran.cloud (cadangan)'} · Audio:{' '}
            {surah.source === 'equran.id' ? 'cdn.equran.id' : 'cdn.islamic.network'}.
          </p>
        </>
      )}

      <nav className="prevnext" aria-label="Surah sebelum & sesudah">
        {prev ? (
          <Link to={`/quran/${prev.number}`} className="prevnext__link">
            <ArrowLeft aria-hidden="true" />
            <span>
              <small>Sebelumnya</small>
              {prev.number}. {prev.latin}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/quran/${next.number}`} className="prevnext__link prevnext__link--next">
            <span>
              <small>Berikutnya</small>
              {next.number}. {next.latin}
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </nav>

      <ReadingSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} prefs={prefs} />
    </div>
  );
}

function AyahItem({ surah, ayah, prefs, bookmarked, isLastRead, active, activePlaying, highlighted, hasAudio, onPlay }) {
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const { copy, share } = useShare();
  const toast = useToast();
  const ref = `QS. ${surah.latin} [${surah.number}]: ${ayah.number}`;
  const text = [ayah.arab, prefs.showLatin && ayah.latin, prefs.showTranslation && ayah.translation && `“${ayah.translation}”`, `(${ref})`].filter(Boolean).join('\n\n');

  const toggleBookmark = () => {
    quranStore.set((q) => {
      const exists = q.bookmarks.some((b) => b.surah === surah.number && b.ayah === ayah.number);
      return {
        ...q,
        bookmarks: exists
          ? q.bookmarks.filter((b) => !(b.surah === surah.number && b.ayah === ayah.number))
          : [...q.bookmarks, { surah: surah.number, ayah: ayah.number, surahLatin: surah.latin, savedAt: Date.now() }],
      };
    });
    toast.show(bookmarked ? 'Ayat dihapus dari tersimpan' : 'Ayat disimpan', { type: 'info', duration: 1600 });
  };
  const markLastRead = () => {
    quranStore.set((q) => ({ ...q, lastRead: { surah: surah.number, ayah: ayah.number, surahLatin: surah.latin, at: Date.now() } }));
    toast.show(`Ditandai terakhir dibaca: ayat ${ayah.number}`, { type: 'info', duration: 1800 });
  };

  return (
    <li
      id={`ayat-${ayah.number}`}
      className={`ayah ${active ? 'is-active' : ''} ${highlighted ? 'is-highlighted' : ''}`}
      aria-current={active ? 'true' : undefined}
    >
      <div className="ayah__bar">
        <StarNumber value={ayah.number} label={`Ayat ${ayah.number}`} />
        {isLastRead && <span className="badge badge--gold">Terakhir dibaca</span>}
        {active && (
          <span className={`eq ${activePlaying ? '' : 'is-paused'}`} aria-hidden="true" style={{ color: 'var(--brand-ink)' }}>
            <i />
            <i />
            <i />
          </span>
        )}
        <div className="ayah__actions">
          <button type="button" className={`icon-btn icon-btn--sm ${active ? 'is-active' : ''}`} onClick={onPlay} disabled={!hasAudio} aria-label={activePlaying ? `Jeda ayat ${ayah.number}` : `Putar mulai ayat ${ayah.number}`} title={hasAudio ? undefined : 'Audio ayat tidak tersedia'}>
            {activePlaying ? <Pause /> : <Play />}
          </button>
          {surah.source === 'equran.id' && (
            <button type="button" className={`icon-btn icon-btn--sm ${tafsirOpen ? 'is-active' : ''}`} aria-expanded={tafsirOpen} aria-controls={`tafsir-${ayah.number}`} aria-label={`Tafsir ayat ${ayah.number}`} onClick={() => setTafsirOpen((v) => !v)}>
              <BookOpenText />
            </button>
          )}
          <button type="button" className={`icon-btn icon-btn--sm ${isLastRead ? 'is-active' : ''}`} aria-label={`Tandai ayat ${ayah.number} sebagai terakhir dibaca`} onClick={markLastRead}>
            <BookmarkCheck />
          </button>
          <button type="button" className={`icon-btn icon-btn--sm ${bookmarked ? 'is-active' : ''}`} aria-pressed={bookmarked} aria-label={`Simpan ayat ${ayah.number}`} onClick={toggleBookmark}>
            <Bookmark fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
          <button type="button" className="icon-btn icon-btn--sm" aria-label={`Salin ayat ${ayah.number}`} onClick={() => copy(text, `Ayat ${ayah.number} disalin`)}>
            <Copy />
          </button>
          <button type="button" className="icon-btn icon-btn--sm" aria-label={`Bagikan ayat ${ayah.number}`} onClick={() => share({ title: ref, text, path: `/quran/${surah.number}?ayat=${ayah.number}` })}>
            <Share2 />
          </button>
        </div>
      </div>
      <ArabicText className="ayah__arabic">{ayah.arab}</ArabicText>
      {prefs.showLatin && ayah.latin && <p className="ayah__latin">{ayah.latin}</p>}
      {prefs.showTranslation && ayah.translation && <p className="ayah__translation">{ayah.translation}</p>}
      {tafsirOpen && <TafsirPanel surah={surah.number} ayah={ayah.number} />}
    </li>
  );
}

function TafsirPanel({ surah, ayah }) {
  const res = useResource(`tafsir:${surah}`, ({ signal, force }) => getTafsir(surah, { signal, force }));
  return (
    <section id={`tafsir-${ayah}`} className="tafsir" aria-label={`Tafsir ayat ${ayah}`}>
      <p className="tafsir__label">Tafsir Kemenag · ayat {ayah}</p>
      {res.status === 'loading' && (
        <div style={{ display: 'grid', gap: 8 }} aria-busy="true">
          <Skeleton height={14} />
          <Skeleton height={14} width="92%" />
          <Skeleton height={14} width="80%" />
        </div>
      )}
      {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title="Tafsir belum bisa dimuat" compact />}
      {res.status === 'success' &&
        (res.data[ayah] ? <Paragraphs text={res.data[ayah]} className="tafsir__text" /> : <p className="muted">Tafsir untuk ayat ini tidak tersedia dari sumber.</p>)}
    </section>
  );
}

function ReadingSettings({ open, onClose, prefs }) {
  const set = (patch) => prefsStore.set((p) => ({ ...p, ...patch }));
  return (
    <Dialog open={open} onClose={onClose} title="Tampilan bacaan" description="Berlaku untuk Al-Qur'an, doa, dan hadits." sheet>
      <div className="field">
        <label htmlFor="arabic-scale" className="field__label">
          Ukuran teks Arab · {Math.round(prefs.arabicScale * 100)}%
        </label>
        <input
          id="arabic-scale"
          className="range"
          type="range"
          min="0.8"
          max="1.8"
          step="0.05"
          value={prefs.arabicScale}
          onChange={(e) => set({ arabicScale: Number(e.target.value) })}
        />
        <ArabicText className="settings-preview">{BASMALAH}</ArabicText>
      </div>
      <SwitchRow label="Tampilkan transliterasi latin" checked={prefs.showLatin} onChange={(v) => set({ showLatin: v })} />
      <SwitchRow label="Tampilkan terjemahan" checked={prefs.showTranslation} onChange={(v) => set({ showTranslation: v })} />
    </Dialog>
  );
}

function SurahSkeleton() {
  return (
    <LoadingBlock label="Memuat ayat…">
      <div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'grid', gap: 12 }}>
            <Skeleton height={36} width="40%" />
            <Skeleton height={44} />
            <Skeleton height={16} width="85%" />
            <Skeleton height={16} width="70%" />
          </div>
        ))}
      </div>
    </LoadingBlock>
  );
}
