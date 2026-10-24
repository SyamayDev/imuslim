import { ArrowRight, BookMarked, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { haditsStore } from '../../app/stores.js';
import { PageHeader, SourceNote } from '../../components/ui/Content.jsx';
import { DataNotice, EmptyState, ErrorState, Skeleton } from '../../components/ui/Status.jsx';
import { useBooks } from '../../features/hadits/useHadits.js';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { ARBAIN_BOOK } from '../../services/api/hadits.js';
import { useStore } from '../../utils/storage.js';
import { truncate } from '../../utils/text.js';
import './hadits.css';

export default function HaditsIndex() {
  useDocumentMeta({
    title: 'Hadits 9 Kitab & Arbain',
    description: 'Baca hadits dari 9 kitab dan Arbain An-Nawawi dengan teks Arab dan terjemahan Indonesia.',
    path: '/hadits',
  });
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'tersimpan' ? 'tersimpan' : 'kitab';
  const saved = useStore(haditsStore);
  const books = useBooks();

  return (
    <div className="page hadits">
      <PageHeader
        eyebrow="Hadits"
        title="Hadits 9 Kitab & Arbain"
        description="Pilih kitab untuk membaca hadits beserta terjemahannya, atau lompat langsung ke nomor hadits tertentu."
      />
      <div className="segmented" role="tablist" aria-label="Tampilan" style={{ marginBottom: 'var(--space-5)' }}>
        <button type="button" role="tab" aria-selected={tab === 'kitab'} onClick={() => setParams({}, { replace: true })}>
          Kitab
        </button>
        <button type="button" role="tab" aria-selected={tab === 'tersimpan'} onClick={() => setParams({ tab: 'tersimpan' }, { replace: true })}>
          Tersimpan <span className="count">{saved.length}</span>
        </button>
      </div>

      {tab === 'tersimpan' ? (
        <SavedHadits saved={saved} />
      ) : (
        <>
          <Link to="/hadits/arbain" className="arbain-card">
            <span className="arbain-card__icon">
              <BookMarked aria-hidden="true" />
            </span>
            <span className="arbain-card__text">
              <span className="eyebrow">Koleksi pilihan</span>
              <span className="arbain-card__title">{ARBAIN_BOOK.name}</span>
              <span className="muted">42 hadits pokok ajaran Islam yang dihimpun Imam An-Nawawi, lengkap dengan judul tema.</span>
            </span>
            <ArrowRight aria-hidden="true" className="arbain-card__arrow" />
          </Link>

          <h2 className="section__title" style={{ margin: 'var(--space-7) 0 var(--space-4)' }}>
            9 kitab hadits
          </h2>
          {books.status === 'loading' && (
            <div className="book-grid" aria-busy="true">
              {Array.from({ length: 9 }, (_, i) => (
                <Skeleton key={i} height={96} radius={16} />
              ))}
            </div>
          )}
          {books.status === 'error' && <ErrorState error={books.error} onRetry={books.reload} title="Daftar kitab belum bisa dimuat" />}
          {books.status === 'success' && (
            <>
              <DataNotice meta={books.meta} error={books.error} onRetry={books.reload} fallbackLabel="api.myquran.com" />
              <ul className="book-grid">
                {books.data.map((b, i) => (
                  <li key={b.slug} className="reveal" style={{ '--i': i }}>
                    <Link to={`/hadits/${b.slug}`} className="book">
                      <span className="book__initial" aria-hidden="true">
                        {b.name.charAt(0)}
                      </span>
                      <span className="book__name">HR. {b.name}</span>
                      <span className="book__count tabular">{b.total.toLocaleString('id-ID')} hadits</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <SourceNote>
        Sumber utama: <a href="https://hadis-api-id.vercel.app/hadith" target="_blank" rel="noopener noreferrer">hadis-api-id.vercel.app</a>, cadangan:{' '}
        <a href="https://api.myquran.com/v2/hadits/perawi" target="_blank" rel="noopener noreferrer">api.myquran.com</a> (dataset 9 kitab yang sama). Arbain An-Nawawi dari api.myquran.com.
        Penomoran mengikuti sumber dan bisa berbeda dengan penomoran edisi lain. Sumber tidak menyertakan derajat (status) hadits, sehingga iMuslim tidak menampilkannya. API lama (api.hadith.gading.dev)
        gagal TLS saat diuji 24 Oktober 2026.
      </SourceNote>
    </div>
  );
}

function SavedHadits({ saved }) {
  if (!saved.length) return <EmptyState title="Belum ada hadits tersimpan" text="Tekan ikon penanda pada hadits untuk menyimpannya di perangkat ini." />;
  return (
    <ul className="saved-hadits">
      {[...saved]
        .sort((a, b) => b.savedAt - a.savedAt)
        .map((h) => (
          <li key={`${h.book}-${h.number}`}>
            <Link to={`/hadits/${h.book}/${h.number}`} className="saved-hadits__link">
              <span className="saved-hadits__ref">
                HR. {h.bookName || h.book} · no. {h.number}
                {h.title ? ` · ${h.title}` : ''}
              </span>
              <span className="saved-hadits__text">{truncate(h.translation || h.arab, 200)}</span>
            </Link>
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label={`Hapus hadits ${h.bookName} nomor ${h.number} dari tersimpan`}
              onClick={() => haditsStore.set((list) => list.filter((x) => !(x.book === h.book && x.number === h.number)))}
            >
              <Trash2 />
            </button>
          </li>
        ))}
    </ul>
  );
}
