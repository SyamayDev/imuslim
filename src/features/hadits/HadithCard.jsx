import { Bookmark, Copy, ExternalLink, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { haditsStore } from '../../app/stores.js';
import { ArabicText } from '../../components/ui/Content.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useShare } from '../../hooks/useShare.js';
import { useStore } from '../../utils/storage.js';

const LONG = 700;

export function HadithCard({ hadith, bookName, headingLevel = 2, linkToDetail = true, expanded: initiallyExpanded = false }) {
  const saved = useStore(haditsStore);
  const isSaved = saved.some((h) => h.book === hadith.book && h.number === hadith.number);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const toast = useToast();
  const { copy, share } = useShare();
  const long = hadith.translation.length > LONG || hadith.arab.length > LONG;
  const ref = `HR. ${bookName} no. ${hadith.number}`;
  const text = [hadith.title, hadith.arab, hadith.translation, `(${ref})`].filter(Boolean).join('\n\n');
  const Heading = `h${headingLevel}`;

  const toggleSave = () => {
    haditsStore.set((list) =>
      isSaved
        ? list.filter((h) => !(h.book === hadith.book && h.number === hadith.number))
        : [
            ...list,
            {
              book: hadith.book,
              bookName,
              number: hadith.number,
              title: hadith.title ?? '',
              arab: hadith.arab,
              translation: hadith.translation,
              savedAt: Date.now(),
            },
          ],
    );
    toast.show(isSaved ? 'Hadits dihapus dari tersimpan' : 'Hadits disimpan', { type: 'info', duration: 1600 });
  };

  return (
    <article className={`hadith ${long && !expanded ? 'is-clamped' : ''}`} id={`hadits-${hadith.number}`}>
      <header className="hadith__head">
        <Heading className="hadith__ref">
          <span className="hadith__no tabular">No. {hadith.number}</span>
          {hadith.title && <span className="hadith__title">{hadith.title}</span>}
        </Heading>
        <div className="hadith__actions">
          <button type="button" className={`icon-btn icon-btn--sm ${isSaved ? 'is-active' : ''}`} aria-pressed={isSaved} aria-label={`Simpan hadits nomor ${hadith.number}`} onClick={toggleSave}>
            <Bookmark fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <button type="button" className="icon-btn icon-btn--sm" aria-label={`Salin hadits nomor ${hadith.number}`} onClick={() => copy(text, 'Hadits disalin')}>
            <Copy />
          </button>
          <button type="button" className="icon-btn icon-btn--sm" aria-label={`Bagikan hadits nomor ${hadith.number}`} onClick={() => share({ title: ref, text, path: `/hadits/${hadith.book}/${hadith.number}` })}>
            <Share2 />
          </button>
          {linkToDetail && (
            <Link to={`/hadits/${hadith.book}/${hadith.number}`} className="icon-btn icon-btn--sm" aria-label={`Buka halaman hadits nomor ${hadith.number}`}>
              <ExternalLink />
            </Link>
          )}
        </div>
      </header>
      <div className="hadith__body">
        <ArabicText size="sm" className="hadith__arabic">
          {hadith.arab}
        </ArabicText>
        {hadith.translation ? <p className="hadith__translation">{hadith.translation}</p> : <p className="subtle">Terjemahan tidak tersedia dari sumber.</p>}
      </div>
      {long && (
        <button type="button" className="link-btn hadith__more" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Ringkas' : 'Baca selengkapnya'}
        </button>
      )}
    </article>
  );
}
