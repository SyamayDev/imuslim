import { ArrowLeft, ArrowRight, Bookmark, Copy, Share2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { doaStore } from '../../app/stores.js';
import { ArabicText, Paragraphs } from '../../components/ui/Content.jsx';
import { Ornament } from '../../components/ui/Ornament.jsx';
import { DataNotice, EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Status.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { useShare } from '../../hooks/useShare.js';
import { DOA_COLLECTIONS } from '../../services/api/doa.js';
import { useStore } from '../../utils/storage.js';
import { categoryLabel, useDoaList } from '../../features/doa/useDoa.js';
import './doa.css';

export default function DoaDetail() {
  const { koleksi, id } = useParams();
  const collection = DOA_COLLECTIONS[koleksi] ? koleksi : null;
  const res = useDoaList(collection);
  const num = Number(id);
  const doa = res.data?.find((d) => d.id === num) ?? null;
  const index = res.data && doa ? res.data.indexOf(doa) : -1;
  const prev = index > 0 ? res.data[index - 1] : null;
  const next = index >= 0 && index < res.data.length - 1 ? res.data[index + 1] : null;
  useDocumentMeta({
    title: doa ? doa.title : 'Doa',
    description: doa ? `${doa.title} — teks Arab${doa.latin ? ', latin,' : ''} dan terjemahan. Sumber: ${DOA_COLLECTIONS[koleksi].source}.` : 'Detail doa iMuslim.',
    path: collection ? `/doa/${koleksi}/${id}` : null,
  });

  const back = (
    <Link to={collection === 'myquran' ? '/doa?koleksi=myquran' : '/doa'} className="back-link">
      <ArrowLeft aria-hidden="true" /> Daftar doa
    </Link>
  );

  if (!collection) {
    return (
      <div className="page">
        {back}
        <EmptyState title="Koleksi doa tidak dikenal" />
      </div>
    );
  }

  return (
    <div className="page page--reading doa-detail">
      {back}
      {res.status === 'loading' && <LoadingBlock label="Memuat doa…" rows={3} />}
      {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title="Doa belum bisa dimuat" />}
      {res.status === 'success' && !doa && <EmptyState title="Doa tidak ditemukan" text={`Tidak ada doa nomor ${id} di koleksi ${DOA_COLLECTIONS[koleksi].label}.`} />}
      {doa && (
        <>
          <DataNotice meta={res.meta} error={res.error} onRetry={res.reload} />
          <DoaBody doa={doa} />
          <nav className="prevnext" aria-label="Doa sebelum & sesudah">
            {prev ? (
              <Link to={`/doa/${koleksi}/${prev.id}`} className="prevnext__link">
                <ArrowLeft aria-hidden="true" />
                <span>
                  <small>Sebelumnya</small>
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/doa/${koleksi}/${next.id}`} className="prevnext__link prevnext__link--next">
                <span>
                  <small>Berikutnya</small>
                  {next.title}
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}

function DoaBody({ doa }) {
  const saved = useStore(doaStore);
  const isSaved = saved.some((d) => d.collection === doa.collection && d.id === doa.id);
  const toast = useToast();
  const { copy, share } = useShare();
  const text = [doa.title, doa.arab, doa.latin, doa.translation && `Artinya: ${doa.translation}`, `Sumber: ${DOA_COLLECTIONS[doa.collection].source}`].filter(Boolean).join('\n\n');

  const toggleSave = () => {
    doaStore.set((list) =>
      isSaved
        ? list.filter((d) => !(d.collection === doa.collection && d.id === doa.id))
        : [...list, { collection: doa.collection, id: doa.id, title: doa.title, category: doa.category, arab: doa.arab, translation: doa.translation, savedAt: Date.now() }],
    );
    toast.show(isSaved ? 'Doa dihapus dari tersimpan' : 'Doa disimpan', { type: 'info', duration: 1600 });
  };

  return (
    <article className="doa-card">
      <header className="doa-card__head">
        <span className="eyebrow">{categoryLabel(doa)}</span>
        <h1 className="doa-card__title">{doa.title}</h1>
      </header>
      <ArabicText size="lg" className="doa-card__arabic">
        {doa.arab}
      </ArabicText>
      <Ornament />
      {doa.latin ? <p className="doa-card__latin">{doa.latin}</p> : <p className="doa-card__missing">Transliterasi latin tidak disediakan oleh sumber ini.</p>}
      {doa.translation && (
        <div className="doa-card__translation">
          <span className="doa-card__label">Artinya</span>
          <p>{doa.translation}</p>
        </div>
      )}
      <div className="doa-card__actions">
        <button type="button" className={`btn ${isSaved ? 'btn--soft' : ''}`} aria-pressed={isSaved} onClick={toggleSave}>
          <Bookmark aria-hidden="true" fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Tersimpan' : 'Simpan'}
        </button>
        <button type="button" className="btn" onClick={() => copy(text, 'Doa disalin')}>
          <Copy aria-hidden="true" /> Salin
        </button>
        <button type="button" className="btn" onClick={() => share({ title: doa.title, text, path: `/doa/${doa.collection}/${doa.id}` })}>
          <Share2 aria-hidden="true" /> Bagikan
        </button>
      </div>
      {doa.about && (
        <section className="doa-card__about" aria-label="Keterangan dan sumber">
          <span className="doa-card__label">Keterangan & dalil</span>
          <Paragraphs text={doa.about} />
        </section>
      )}
      {doa.tags.length > 0 && (
        <ul className="chips" aria-label="Tag">
          {doa.tags.map((t) => (
            <li key={t} className="badge">
              #{t}
            </li>
          ))}
        </ul>
      )}
      <p className="source-note">Sumber data: {DOA_COLLECTIONS[doa.collection].source} · nomor {doa.id}</p>
    </article>
  );
}
