import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { currentTrack, useAudioControls, useAudioState } from '../../app/audio.jsx';

const fmt = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export function AudioPlayerBar() {
  const state = useAudioState();
  const controls = useAudioControls();
  const track = currentTrack(state);
  if (!state.queue || !track) return null;

  const playing = state.status === 'playing';
  const loading = state.status === 'loading';
  const pct = state.duration > 0 ? Math.min(100, (state.current / state.duration) * 100) : 0;
  const multi = state.queue.tracks.length > 1;

  return (
    <section className="player" aria-label="Pemutar audio">
      <button type="button" className="player__play" onClick={controls.toggle} aria-label={playing ? 'Jeda' : 'Putar'}>
        {loading ? <span className="spinner" aria-hidden="true" /> : playing ? <Pause /> : <Play />}
      </button>
      <div className="player__meta">
        <p className="player__title">{track.title}</p>
        <p className="player__sub">
          {state.status === 'error' ? (
            <span role="alert">{state.error}</span>
          ) : (
            <>
              <span>{state.error || track.subtitle}</span>
              <span className="tabular">
                <span className="visually-hidden">Posisi </span>
                {fmt(state.current)} / {fmt(state.duration)}
              </span>
            </>
          )}
        </p>
        <div className="player__bar">
          <i style={{ width: `${pct}%` }} />
          <input
            className="player__seek"
            type="range"
            min={0}
            max={Math.max(1, state.duration)}
            step={0.5}
            value={Math.min(state.current, state.duration || 0)}
            onChange={(e) => controls.seek(Number(e.target.value))}
            aria-label="Geser posisi audio"
            disabled={!state.duration}
          />
        </div>
      </div>
      <div className="player__actions">
        {multi && (
          <>
            <button type="button" className="icon-btn hide-xs" onClick={controls.prev} aria-label="Sebelumnya" disabled={state.index === 0 && state.current < 3}>
              <SkipBack />
            </button>
            <button type="button" className="icon-btn" onClick={controls.next} aria-label="Berikutnya" disabled={state.index >= state.queue.tracks.length - 1}>
              <SkipForward />
            </button>
          </>
        )}
        <button type="button" className="icon-btn" onClick={controls.stop} aria-label="Hentikan dan tutup pemutar">
          <X />
        </button>
      </div>
    </section>
  );
}
