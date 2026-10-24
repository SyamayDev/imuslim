// Rumus kalkulator zakat. Nilai acuan (harga emas, harga beras) selalu dari masukan pengguna;
// tidak ada nilai nisab rupiah yang ditanam di kode.

export const ZAKAT_RATE = 0.025; // 2,5%
export const NISAB_GOLD_GRAMS = 85; // nisab zakat maal & penghasilan: setara 85 gram emas
export const FITRAH_KG_PER_PERSON = 2.5; // 1 sha' ≈ 2,5 kg beras (atau 3,5 liter)
export const FITRAH_LITER_PER_PERSON = 3.5;

const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

/** Zakat penghasilan (bulanan): nisab = 85 g emas ÷ 12, dihitung dari penghasilan bruto. */
export function zakatPenghasilan({ goldPricePerGram, monthlyIncome, otherIncome = 0 }) {
  const price = num(goldPricePerGram);
  const income = num(monthlyIncome) + num(otherIncome);
  const nisabYear = NISAB_GOLD_GRAMS * price;
  const nisabMonth = nisabYear / 12;
  const obligated = price > 0 && income > 0 && income >= nisabMonth;
  return {
    income,
    nisabYear,
    nisabMonth,
    obligated,
    zakat: obligated ? income * ZAKAT_RATE : 0,
    zakatYear: obligated ? income * ZAKAT_RATE * 12 : 0,
  };
}

/** Zakat maal: harta bersih (aset − utang jatuh tempo) ≥ nisab 85 g emas dan sudah 1 haul. */
export function zakatMaal({ goldPricePerGram, savings = 0, gold = 0, investments = 0, receivables = 0, debts = 0, haul = false }) {
  const price = num(goldPricePerGram);
  const assets = num(savings) + num(gold) + num(investments) + num(receivables);
  const net = Math.max(0, assets - num(debts));
  const nisab = NISAB_GOLD_GRAMS * price;
  const reachesNisab = price > 0 && net > 0 && net >= nisab;
  const obligated = reachesNisab && haul === true;
  return { assets, net, nisab, reachesNisab, haul: haul === true, obligated, zakat: obligated ? net * ZAKAT_RATE : 0 };
}

/** Zakat fitrah: jiwa × 2,5 kg beras × harga beras per kg. */
export function zakatFitrah({ people, ricePricePerKg }) {
  const n = Number.isInteger(people) && people > 0 ? people : 0;
  const price = num(ricePricePerKg);
  const kg = n * FITRAH_KG_PER_PERSON;
  return { people: n, kg, liters: n * FITRAH_LITER_PER_PERSON, money: kg * price };
}

/** Ambil angka dari teks berformat Indonesia ("1.250.000" → 1250000). */
export function parseRupiah(text) {
  const digits = String(text ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : 0;
}

export function formatDigits(text) {
  const digits = String(text ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
