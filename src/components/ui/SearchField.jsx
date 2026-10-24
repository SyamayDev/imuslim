import { Mic, MicOff, Search, X } from 'lucide-react';
import { useSpeechSearch } from '../../hooks/useSpeechSearch.js';

export function SearchField({ value, onChange, label, placeholder, id, voice = true }) {
  const speech = useSpeechSearch((text) => onChange(text));
  const actions = (value ? 1 : 0) + (voice && speech.supported ? 1 : 0);
  return (
    <div>
      <div className={`search search--actions-${actions}`} role="search">
        <Search aria-hidden="true" />
        <label htmlFor={id} className="visually-hidden">
          {label}
        </label>
        <input
          id={id}
          className="input"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          enterKeyHint="search"
        />
        <div className="search__actions">
          {value && (
            <button type="button" className="icon-btn" onClick={() => onChange('')} aria-label="Hapus pencarian">
              <X />
            </button>
          )}
          {voice && speech.supported && (
            <button
              type="button"
              className={`icon-btn ${speech.listening ? 'is-listening' : ''}`}
              onClick={speech.listening ? speech.stop : speech.start}
              aria-label={speech.listening ? 'Hentikan pencarian suara' : 'Cari dengan suara'}
              aria-pressed={speech.listening}
            >
              {speech.listening ? <MicOff /> : <Mic />}
            </button>
          )}
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {speech.listening ? `Mendengarkan… ${speech.interim}` : ''}
      </p>
      {(speech.listening || speech.error) && (
        <p className="field__hint" style={{ marginTop: 6, paddingLeft: 14 }} aria-hidden="true">
          {speech.listening ? (speech.interim ? `“${speech.interim}”` : 'Mendengarkan… ucapkan kata kunci') : speech.error}
        </p>
      )}
    </div>
  );
}
