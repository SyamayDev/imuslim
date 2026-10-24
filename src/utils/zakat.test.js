import { formatDigits, parseRupiah, zakatFitrah, zakatMaal, zakatPenghasilan } from './zakat.js';

describe('zakat penghasilan', () => {
  it('wajib bila penghasilan ≥ nisab bulanan (85 g / 12)', () => {
    const r = zakatPenghasilan({ goldPricePerGram: 1_200_000, monthlyIncome: 9_000_000, otherIncome: 1_000_000 });
    expect(r.nisabYear).toBe(102_000_000);
    expect(r.nisabMonth).toBe(8_500_000);
    expect(r.income).toBe(10_000_000);
    expect(r.obligated).toBe(true);
    expect(r.zakat).toBe(250_000);
    expect(r.zakatYear).toBe(3_000_000);
  });
  it('tidak wajib bila di bawah nisab — zakat 0', () => {
    const r = zakatPenghasilan({ goldPricePerGram: 1_200_000, monthlyIncome: 5_000_000 });
    expect(r.obligated).toBe(false);
    expect(r.zakat).toBe(0);
  });
  it('tanpa harga emas tidak pernah dinyatakan wajib', () => {
    expect(zakatPenghasilan({ goldPricePerGram: 0, monthlyIncome: 50_000_000 }).obligated).toBe(false);
  });
});

describe('zakat maal', () => {
  const base = { goldPricePerGram: 1_000_000, savings: 80_000_000, gold: 10_000_000, investments: 5_000_000, receivables: 0, debts: 5_000_000 };
  it('harta bersih dikurangi utang & wajib bila nisab + haul', () => {
    const r = zakatMaal({ ...base, haul: true });
    expect(r.net).toBe(90_000_000);
    expect(r.nisab).toBe(85_000_000);
    expect(r.obligated).toBe(true);
    expect(r.zakat).toBe(2_250_000);
  });
  it('mencapai nisab tetapi belum haul → belum wajib', () => {
    const r = zakatMaal({ ...base, haul: false });
    expect(r.reachesNisab).toBe(true);
    expect(r.obligated).toBe(false);
    expect(r.zakat).toBe(0);
  });
  it('utang melebihi aset tidak menghasilkan nilai negatif', () => {
    expect(zakatMaal({ goldPricePerGram: 1, savings: 10, debts: 100, haul: true }).net).toBe(0);
  });
});

describe('zakat fitrah', () => {
  it('2,5 kg per jiwa × harga beras', () => {
    expect(zakatFitrah({ people: 4, ricePricePerKg: 15_000 })).toEqual({ people: 4, kg: 10, liters: 14, money: 150_000 });
  });
  it('jumlah jiwa tidak valid → 0', () => {
    expect(zakatFitrah({ people: -1, ricePricePerKg: 15_000 }).kg).toBe(0);
  });
});

describe('format angka rupiah', () => {
  it('parse & format', () => {
    expect(parseRupiah('1.250.000')).toBe(1_250_000);
    expect(parseRupiah('Rp 12a3')).toBe(123);
    expect(parseRupiah('')).toBe(0);
    expect(formatDigits('1250000')).toBe('1.250.000');
    expect(formatDigits('0007')).toBe('7');
    expect(formatDigits('abc')).toBe('');
  });
});
