// Cache respons publik di IndexedDB (fallback ke memori bila IndexedDB tidak tersedia,
// mis. mode privat tertentu). Setiap entri menyimpan versi skema dan waktu pengambilan
// sehingga data lama bisa ditandai "mungkin usang" di UI.
const DB_NAME = 'imuslim-cache';
const STORE = 'responses';
const DB_VERSION = 1;
export const CACHE_SCHEMA = 2; // naikkan bila bentuk data internal berubah

const memory = new Map();
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx(db, mode, fn) {
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const req = fn(store);
      t.oncomplete = () => resolve(req?.result);
      t.onerror = () => resolve(undefined);
      t.onabort = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function cacheGet(key) {
  const db = await openDb();
  const entry = db ? await tx(db, 'readonly', (s) => s.get(key)) : memory.get(key);
  if (!entry || entry.schema !== CACHE_SCHEMA || typeof entry.savedAt !== 'number') return null;
  return entry;
}

export async function cacheSet(key, data) {
  const entry = { schema: CACHE_SCHEMA, savedAt: Date.now(), data };
  memory.set(key, entry);
  const db = await openDb();
  if (db) await tx(db, 'readwrite', (s) => s.put(entry, key));
  return entry;
}

export async function cacheClear() {
  memory.clear();
  const db = await openDb();
  if (db) await tx(db, 'readwrite', (s) => s.clear());
}

// Hanya untuk pengujian.
export function __resetCacheForTests() {
  memory.clear();
  dbPromise = Promise.resolve(null);
}
