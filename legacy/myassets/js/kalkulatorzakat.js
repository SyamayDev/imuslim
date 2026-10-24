var app = new Vue({
    el: '#app',
    data: {
        goldPrice: '', // Kosong secara default
        formattedGoldPrice: '', // Untuk menampilkan format Rupiah
        monthlyIncome: '', // Kosong secara default
        formattedMonthlyIncome: '', // Untuk menampilkan format Rupiah
        otherIncome: '', // Kosong secara default
        formattedOtherIncome: '', // Untuk menampilkan format Rupiah
        nishabGram: 85, // Nishab dalam gram emas
        zakatRate: 0.025, // Tarif zakat 2.5%
        loadingGoldPrice: false,
        showResults: false // Kontrol visibilitas hasil
    },
    computed: {
        annualNishab() {
            const goldPriceNum = this.parseNumber(this.formattedGoldPrice);
            return this.nishabGram * goldPriceNum;
        },
        monthlyNishab() {
            return this.annualNishab / 12;
        },
        totalIncome() {
            const monthlyIncomeNum = this.parseNumber(this.formattedMonthlyIncome);
            const otherIncomeNum = this.parseNumber(this.formattedOtherIncome);
            return monthlyIncomeNum + otherIncomeNum;
        },
        isObligated() {
            return this.totalIncome >= this.monthlyNishab;
        },
        zakatAmount() {
            // Selalu hitung zakat, terlepas dari kewajiban
            return this.totalIncome * this.zakatRate;
        }
    },
    methods: {
        formatNumber(value) {
            return value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        },
        parseNumber(value) {
            if (!value) return 0;
            return parseFloat(value.replace(/\./g, '')) || 0;
        },
        formatGoldPriceInput() {
            let value = this.formattedGoldPrice.replace(/\D/g, '');
            this.formattedGoldPrice = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            this.goldPrice = this.parseNumber(this.formattedGoldPrice);
        },
        formatMonthlyIncomeInput() {
            let value = this.formattedMonthlyIncome.replace(/\D/g, '');
            this.formattedMonthlyIncome = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            this.monthlyIncome = this.parseNumber(this.formattedMonthlyIncome);
        },
        formatOtherIncomeInput() {
            let value = this.formattedOtherIncome.replace(/\D/g, '');
            this.formattedOtherIncome = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            this.otherIncome = this.parseNumber(this.formattedOtherIncome);
        },
        async fetchGoldPrice() {
            this.loadingGoldPrice = true;
            try {
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/IDR');
                const data = await response.json();
                const goldPriceInUSD = 2300; // Contoh harga emas per oz dalam USD
                const usdToIdr = data.rates.USD * 15600; // Contoh kurs USD ke IDR
                const goldPricePerGram = (goldPriceInUSD / 31.1035) * usdToIdr; // 1 oz = 31.1035 gram
                const roundedGoldPrice = Math.round(goldPricePerGram);
                this.goldPrice = roundedGoldPrice;
                this.formattedGoldPrice = this.formatNumber(roundedGoldPrice);
                alert(`Harga emas saat ini diperbarui: Rp. ${this.formattedGoldPrice} / gram`);
            } catch (error) {
                console.error('Gagal mengambil harga emas:', error);
                alert('Gagal mengambil harga emas. Masukkan nilai secara manual.');
            } finally {
                this.loadingGoldPrice = false;
            }
        },
        calculateZakat() {
            if (!this.goldPrice || this.goldPrice <= 0) {
                alert('Masukkan harga emas terlebih dahulu!');
                return;
            }
            if (!this.monthlyIncome && !this.otherIncome) {
                alert('Masukkan penghasilan atau pendapatan lain untuk menghitung zakat!');
                return;
            }
            this.showResults = true;
        }
    }
});

// Dark Mode Persistence
document.addEventListener('DOMContentLoaded', () => {
    const darkModeSwitch = document.getElementById('switchDarkMode');
    const body = document.body;
    
    // Load dark mode state from localStorage
    if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('darkMode-active');
    if (darkModeSwitch) darkModeSwitch.checked = true;
    }
    
    // Toggle dark mode
    if (darkModeSwitch) {
    darkModeSwitch.addEventListener('change', () => {
        if (darkModeSwitch.checked) {
            body.classList.add('darkMode-active');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            body.classList.remove('darkMode-active');
            localStorage.setItem('darkMode', 'disabled');
        }
    });
    }
    });
    