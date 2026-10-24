import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Satu-satunya pemutar audio aplikasi. Semua audio (murattal surah, per-ayat, adzan)
 * lewat sini sehingga tidak pernah ada dua audio yang berbunyi bersamaan.
 *
 * queue = { id, kind: 'quran' | 'adzan', title, owner, tracks: [{ key, src, title, subtitle }] }
 */
const ControlsContext = createContext(null);
const StateContext = createContext(null);

const IDLE = { queue: null, index: 0, status: 'idle', current: 0, duration: 0, error: '' };
const ICON = `${import.meta.env.BASE_URL}icons/icon-512.png`;

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const queueRef = useRef(null);
  const indexRef = useRef(0);
  const [state, setState] = useState(IDLE);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = 'none';
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  const loadTrack = useCallback(
    (index, autoplay = true) => {
      const queue = queueRef.current;
      const track = queue?.tracks[index];
      if (!track) return;
      indexRef.current = index;
      const audio = getAudio();
      audio.src = track.src;
      audio.currentTime = 0;
      setState((s) => ({ ...s, queue, index, status: 'loading', current: 0, duration: 0, error: '' }));
      if ('mediaSession' in navigator && typeof window.MediaMetadata === 'function') {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: track.title,
          artist: track.subtitle ?? '',
          album: queue.title ?? 'iMuslim',
          artwork: [{ src: ICON, sizes: '512x512', type: 'image/png' }],
        });
      }
      if (autoplay) {
        audio.play().catch((err) => {
          if (err?.name === 'AbortError') return; // diganti trek lain
          const blocked = err?.name === 'NotAllowedError';
          setState((s) => ({
            ...s,
            status: blocked ? 'paused' : 'error',
            error: blocked ? 'Browser memblokir pemutaran otomatis. Tekan putar untuk mendengarkan.' : 'Audio tidak dapat diputar.',
          }));
        });
      }
    },
    [getAudio],
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    queueRef.current = null;
    indexRef.current = 0;
    setState(IDLE);
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
  }, []);

  const playQueue = useCallback(
    (queue, startIndex = 0) => {
      if (!queue?.tracks?.length) return;
      const audio = getAudio();
      audio.pause();
      queueRef.current = queue;
      loadTrack(Math.min(Math.max(0, startIndex), queue.tracks.length - 1));
    },
    [getAudio, loadTrack],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !queueRef.current) return;
    if (audio.paused) {
      audio.play().catch(() => setState((s) => ({ ...s, status: 'error', error: 'Audio tidak dapat diputar.' })));
    } else {
      audio.pause();
    }
  }, []);

  const next = useCallback(() => {
    const q = queueRef.current;
    if (q && indexRef.current < q.tracks.length - 1) loadTrack(indexRef.current + 1);
  }, [loadTrack]);

  const prev = useCallback(() => {
    const q = queueRef.current;
    const audio = audioRef.current;
    if (!q) return;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (indexRef.current > 0) loadTrack(indexRef.current - 1);
  }, [loadTrack]);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(seconds)) audio.currentTime = Math.max(0, seconds);
  }, []);

  const skip = useCallback((delta) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + delta));
  }, []);

  // Event elemen audio
  useEffect(() => {
    const audio = getAudio();
    const on = (type, fn) => audio.addEventListener(type, fn);
    const off = (type, fn) => audio.removeEventListener(type, fn);
    const handlers = {
      playing: () => setState((s) => ({ ...s, status: 'playing', error: '' })),
      pause: () => setState((s) => (s.queue ? { ...s, status: s.status === 'error' ? 'error' : 'paused' } : s)),
      waiting: () => setState((s) => ({ ...s, status: 'loading' })),
      timeupdate: () => setState((s) => (Math.abs(s.current - audio.currentTime) >= 0.25 ? { ...s, current: audio.currentTime } : s)),
      loadedmetadata: () => setState((s) => ({ ...s, duration: Number.isFinite(audio.duration) ? audio.duration : 0 })),
      durationchange: () => setState((s) => ({ ...s, duration: Number.isFinite(audio.duration) ? audio.duration : 0 })),
      ended: () => {
        const q = queueRef.current;
        if (q && indexRef.current < q.tracks.length - 1) loadTrack(indexRef.current + 1);
        else setState((s) => ({ ...s, status: 'ended', current: s.duration }));
      },
      error: () => {
        if (!audio.getAttribute('src')) return;
        setState((s) => ({ ...s, status: 'error', error: 'Audio tidak tersedia atau gagal dimuat dari server.' }));
      },
    };
    Object.entries(handlers).forEach(([t, fn]) => on(t, fn));
    return () => Object.entries(handlers).forEach(([t, fn]) => off(t, fn));
  }, [getAudio, loadTrack]);

  // Kontrol layar kunci / headset
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action, fn) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        /* aksi tidak didukung */
      }
    };
    set('play', toggle);
    set('pause', toggle);
    set('nexttrack', next);
    set('previoustrack', prev);
    set('stop', stop);
    return () => ['play', 'pause', 'nexttrack', 'previoustrack', 'stop'].forEach((a) => set(a, null));
  }, [toggle, next, prev, stop]);

  const controls = useMemo(() => ({ playQueue, toggle, next, prev, stop, seek, skip }), [playQueue, toggle, next, prev, stop, seek, skip]);

  return (
    <ControlsContext.Provider value={controls}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ControlsContext.Provider>
  );
}

export function useAudioControls() {
  const ctx = useContext(ControlsContext);
  if (!ctx) throw new Error('useAudioControls harus di dalam AudioProvider');
  return ctx;
}

export function useAudioState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAudioState harus di dalam AudioProvider');
  return ctx;
}

export function currentTrack(state) {
  return state.queue ? state.queue.tracks[state.index] : null;
}
