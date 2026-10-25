// Validator kecil tanpa dependensi (aman dipakai di entry yang harus tetap ringan).
export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const str = (v, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');
export const int = (v, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
