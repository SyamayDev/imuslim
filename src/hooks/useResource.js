import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { isAbortError } from '../services/api/errors.js';

/**
 * Hook pemuatan data dengan state eksplisit:
 *  status: 'idle' | 'loading' | 'success' | 'empty' | 'error'
 *  stale : true bila data berasal dari cache lama karena sumber gagal
 *  fallbackUsed: true bila data dari sumber cadangan
 *
 * `loader({ signal, force })` harus mengembalikan objek { data, stale, fetchedAt, ... }
 * seperti `cachedRequest`.
 */
export function useResource(key, loader, { enabled = true, isEmpty, keepPrevious = false } = {}) {
  const [nonce, setNonce] = useState(0);
  // Kunci request yang harus melewati cache segar (diisi oleh tombol "Coba lagi"/"Muat ulang").
  const [forceKey, setForceKey] = useState(null);
  const requestKey = enabled && key != null ? `${key}#${nonce}` : null;
  const force = requestKey !== null && forceKey === requestKey;
  const [state, setState] = useState({ requestKey: null, status: 'idle', data: undefined, error: null, meta: null });

  const run = useEffectEvent((signal, forced) => loader({ signal, force: forced }));
  const checkEmpty = useEffectEvent((data) => (isEmpty ? isEmpty(data) : data == null));

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    let active = true;
    Promise.resolve()
      .then(() => run(controller.signal, force))
      .then((result) => {
        if (!active) return;
        const data = result?.data;
        setState({
          requestKey,
          status: checkEmpty(data) ? 'empty' : 'success',
          data,
          error: result?.stale || result?.fallbackUsed ? (result.error ?? null) : null,
          meta: {
            stale: Boolean(result?.stale),
            fallbackUsed: Boolean(result?.fallbackUsed),
            fetchedAt: result?.fetchedAt ?? null,
            fromCache: Boolean(result?.fromCache),
          },
        });
      })
      .catch((error) => {
        if (!active || isAbortError(error)) return;
        setState({ requestKey, status: 'error', data: undefined, error, meta: null });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey, force]);

  const reload = useCallback(() => {
    const next = nonce + 1;
    setForceKey(`${key}#${next}`);
    setNonce(next);
  }, [key, nonce]);

  const isCurrent = requestKey !== null && state.requestKey === requestKey;
  if (!requestKey) return { status: 'idle', data: undefined, error: null, meta: null, reload };
  if (!isCurrent) {
    return {
      status: 'loading',
      data: keepPrevious ? state.data : undefined,
      error: null,
      meta: keepPrevious ? state.meta : null,
      reload,
    };
  }
  return { status: state.status, data: state.data, error: state.error, meta: state.meta, reload };
}
