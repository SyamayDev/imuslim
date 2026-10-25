import { useCallback, useEffect, useRef, useState } from 'react';
import { useClientValue } from './useHydrated.js';

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined;
const recognitionSupported = () => Boolean(Recognition);

const ERRORS = {
  'not-allowed': 'Izin mikrofon ditolak. Aktifkan izin mikrofon untuk situs ini.',
  'service-not-allowed': 'Layanan pengenalan suara tidak diizinkan di browser ini.',
  'no-speech': 'Tidak ada suara terdeteksi. Coba lagi.',
  'audio-capture': 'Mikrofon tidak ditemukan.',
  network: 'Pengenalan suara membutuhkan koneksi internet.',
  aborted: '',
};

/**
 * Pencarian suara (Web Speech API, id-ID). Mikrofon hanya diminta saat pengguna
 * menekan tombol. Bila browser tidak mendukung, `supported` bernilai false dan
 * tombol tidak ditampilkan.
 */
export function useSpeechSearch(onResult) {
  const supported = useClientValue(recognitionSupported, false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const resultRef = useRef(onResult);

  useEffect(() => {
    resultRef.current = onResult;
  }, [onResult]);

  useEffect(() => () => recRef.current?.abort(), []);

  const start = useCallback(() => {
    if (!Recognition) return;
    recRef.current?.abort();
    const rec = new Recognition();
    rec.lang = 'id-ID';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setInterim(text);
      const last = event.results[event.results.length - 1];
      if (last.isFinal) resultRef.current?.(text.trim());
    };
    rec.onerror = (event) => setError(ERRORS[event.error] ?? `Pengenalan suara gagal (${event.error}).`);
    rec.onend = () => setListening(false);
    setError('');
    setInterim('');
    setListening(true);
    try {
      rec.start();
      recRef.current = rec;
    } catch {
      setListening(false);
      setError('Pengenalan suara tidak dapat dimulai.');
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported, listening, interim, error, start, stop };
}
