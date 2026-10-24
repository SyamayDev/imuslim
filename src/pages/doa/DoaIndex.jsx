import { ArrowRight, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { doaStore } from '../../app/stores.js';
import { PageHeader, SourceNote } from '../../components/ui/Content.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { SearchField } from '../../components/ui/SearchField.jsx';
import { DataNotice, EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Status.jsx';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { DOA_COLLECTIONS, MYQURAN_CATEGORY_LABEL } from '../../services/api/doa.js';
import { categoryLabel, useDoaList } from '../../features/doa/useDoa.js';
import { useStore } from '../../utils/storage.js';
import { normalizeSearch, stripArabicDiacritics } from '../../utils/text.js';
import './doa.css';

const PAGE_SIZE = 12;

function matches(doa, q) {
  if (!q) return true;
  const n = normalizeSearch(q);
  return (
    normalizeSearch(doa.title).includes(n) ||
    normalizeSearch(doa.translation).includes(n) ||
    normalizeSearch(doa.latin).includes(n) ||
    normalizeSearch(categoryLabel(doa)).includes(n) ||
    doa.tags.some((t) => normalizeSearch(t).includes(n)) ||
    stripArabicDiacritics(doa.arab).includes(stripArabicDiacritics(q.trim()))
  );
}

export default function DoaIndex() {
  useDocumentMeta({
    title: 'Doa & Dzikir',
    description: 'Kumpulan doa harian dan dzikir lengkap dengan teks Arab, latin, terjemahan, serta keterangan sumber.',
    path: '/doa',
  });
  const [params, setParams] = useSearchParams();
  const tab = ['equran', 'myquran', 'tersimpan'].includes(params.get('koleksi')) ? params.get('koleksi') : 'equran';
  const query = params.get('q') ?? '';
  const category = params.get('kategori') ?? '';
  const page = Math.max(1, Number(params.get('hal')) || 1);
  const saved = useStore(doaStore);
  const res = useDoaList(tab === 'tersimpan' ? null : tab);

  const update = (patch, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || (k === 'hal' && v === 1) || (k === 'koleksi' && v === 'equran')) next.delete(k);
      else next.set(k, String(v));
    }
    setParams(next, { replace });
  };

  const categories = useMemo(() => (res.data ? [...new Set(res.data.map((d) => d.category))] : []), [res.data]);
  const filtered = useMemo(() => (res.data ?? []).filter((d) => (!category || d.category === category) && matches(d, query)), [res.data, category, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="page doa">
      <PageHeader eyebrow="Doa & dzikir" title="Doa & Dzikir" description="Teks Arab, transliterasi, dan terjemahan dari sumber yang disebutkan. Cari dengan kata kunci, tema, atau potongan teks Arab." />

      <div className="segmented doa-tabs" role="tablist" aria-label="Koleksi doa">
        <button type="button" role="tab" aria-selected={tab === 'equran'} onClick={() => update({ koleksi: 'equran', kategori: '', hal: 1 })}>
          Doa & Dzikir <span className="count">equran.id</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'myquran'} onClick={() => update({ koleksi: 'myquran', kategori: '', hal: 1 })}>
          Kumpulan Doa <span className="count">myQuran</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'tersimpan'} onClick={() => update({ koleksi: 'tersimpan', kategori: '', hal: 1 })}>
          Tersimpan <span className="count">{saved.length}</span>
        </button>
      </div>

      {tab === 'tersimpan' ? (
        <SavedDoa saved={saved} />
      ) : (
        <>
          <div className="doa-filters">
            <div className="grow">
              <SearchField id="cari-doa" label="Cari doa" placeholder="Cari doa atau tema" value={query} onChange={(v) => update({ q: v, hal: 1 }, true)} />
            </div>
            {tab === 'equran' && categories.length > 0 && (
              <label className="doa-filters__select">
                <span className="visually-hidden">Kategori</span>
                <select className="select" value={category} onChange={(e) => update({ kategori: e.target.value, hal: 1 })}>
                  <option value="">Semua kategori ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {tab === 'myquran' && categories.length > 0 && (
            <div className="chips doa-chips" role="group" aria-label="Kategori">
              <button type="button" className="chip" aria-pressed={!category} onClick={() => update({ kategori: '', hal: 1 })}>
                Semua
              </button>
              {categories.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => update({ kategori: category === c ? '' : c, hal: 1 })}>
                  {MYQURAN_CATEGORY_LABEL[c] ?? c}
                </button>
              ))}
            </div>
          )}

          {res.status === 'loading' && <LoadingBlock label="Memuat daftar doa…" rows={6} />}
          {res.status === 'error' && <ErrorState error={res.error} onRetry={res.reload} title="Daftar doa belum bisa dimuat" />}
          {res.status === 'empty' && <EmptyState title="Sumber tidak mengembalikan doa" />}
          {res.status === 'success' && (
            <>
              <DataNotice meta={res.meta} error={res.error} onRetry={res.reload} />
              {visible.length === 0 ? (
                <EmptyState icon="search" title="Doa tidak ditemukan" text={`Tidak ada doa yang cocok${query ? ` dengan “${query}”` : ''}${category ? ' di kategori ini' : ''}.`} />
              ) : (
                <ul className="doa-list">
                  {visible.map((d, i) => (
                    <li key={d.id} className="reveal" style={{ '--i': i }}>
                      <Link to={`/doa/${tab}/${d.id}`} className="doa-item">
                        <span className="doa-item__cat">{categoryLabel(d)}</span>
                        <span className="doa-item__title">{d.title}</span>
                        <span className="doa-item__arabic" lang="ar" dir="rtl">
                          {d.arab}
                        </span>
                        <ArrowRight aria-hidden="true" className="doa-item__arrow" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination page={current} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} label="doa" onChange={(p) => {
                update({ hal: p });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} />
            </>
          )}
        </>
      )}

      <SourceNote>
        Sumber: <a href={DOA_COLLECTIONS.equran.url} target="_blank" rel="noopener noreferrer">equran.id/api/doa</a> (dengan transliterasi & keterangan dalil, sebagian besar dari Hisnul Muslim) dan{' '}
        <a href={DOA_COLLECTIONS.myquran.url} target="_blank" rel="noopener noreferrer">api.myquran.com</a> (koleksi versi lama; sumber tidak menyediakan transliterasi latin). Teks ditampilkan apa adanya dari sumber.
      </SourceNote>
    </div>
  );
}

function SavedDoa({ saved }) {
  if (!saved.length) return <EmptyState title="Belum ada doa tersimpan" text="Buka sebuah doa lalu tekan “Simpan” untuk menyimpannya di perangkat ini." />;
  return (
    <ul className="doa-list">
      {[...saved]
        .sort((a, b) => b.savedAt - a.savedAt)
        .map((d) => (
          <li key={`${d.collection}-${d.id}`} className="doa-saved">
            <Link to={`/doa/${d.collection}/${d.id}`} className="doa-item">
              <span className="doa-item__cat">
                {d.collection === 'myquran' ? (MYQURAN_CATEGORY_LABEL[d.category] ?? d.category) : d.category} · {DOA_COLLECTIONS[d.collection].source}
              </span>
              <span className="doa-item__title">{d.title}</span>
              <span className="doa-item__arabic" lang="ar" dir="rtl">
                {d.arab}
              </span>
            </Link>
            <button
              type="button"
              className="icon-btn icon-btn--sm doa-saved__remove"
              aria-label={`Hapus “${d.title}” dari tersimpan`}
              onClick={() => doaStore.set((list) => list.filter((x) => !(x.collection === d.collection && x.id === d.id)))}
            >
              <Trash2 />
            </button>
          </li>
        ))}
    </ul>
  );
}
