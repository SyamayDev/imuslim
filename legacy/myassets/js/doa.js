var app = new Vue({
    el: '#app',
    data: {
        allDoas: [],
        detail: { id: null, judul: 'Data Tidak Ditemukan', arab: '', latin: '(Latin tidak tersedia)', indo: '', source: 'Sumber Tidak Tersedia' },
        loading: false,
        loading2: false,
        copied: false,
        savedDoas: [],
        searchQuery: '',
        currentPage: 1,
        itemsPerPage: 12,
        showVoicePopup: false,
        voiceText: '',
        showShareOptions: false,
        shareText: ''
    },
    computed: {
        filteredDoas() {
            let filtered = this.allDoas;
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase().replace(/[\s-]/g, '');
                filtered = filtered.filter(d => {
                    const judulNormalized = d.judul.toLowerCase().replace(/[\s-]/g, '');
                    const arabNormalized = d.arab.toLowerCase().replace(/[\s-]/g, '');
                    const indoNormalized = d.indo.toLowerCase().replace(/[\s-]/g, '');
                    const sourceNormalized = d.source.toLowerCase().replace(/[\s-]/g, '');
                    return (
                        judulNormalized.includes(query) ||
                        arabNormalized.includes(query) ||
                        indoNormalized.includes(query) ||
                        sourceNormalized.includes(query)
                    );
                });
                if (query === 'hadist') filtered = filtered.filter(d => d.source.toLowerCase() === 'hadist');
                else if (query === 'quran') filtered = filtered.filter(d => d.source.toLowerCase() === 'quran');
                else if (query === 'lainnya') filtered = filtered.filter(d => d.source.toLowerCase() === 'lainnya');
            }
            return filtered;
        },
        totalPages() { return Math.ceil(this.filteredDoas.length / this.itemsPerPage); },
        paginatedDoas() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredDoas.slice(start, end);
        },
        currentIndex() { return this.filteredDoas.findIndex(d => d.id === this.detail.id); },
        hasPrev() { return this.currentIndex > 0; },
        hasNext() { return this.currentIndex >= 0 && this.currentIndex < this.filteredDoas.length - 1; }
    },
    methods: {
        refreshPage() { window.location.reload(); },
        arabicToLatin(arabicText) {
            const arabicToLatinMap = {
                'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
                'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': "'a", 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
                'ء': "'", 'آ': 'aa', 'إ': 'i', 'أ': 'a', 'ؤ': 'u', 'ئ': 'i', 'َ': 'a', 'ِ': 'i', 'ُ': 'u', 'ً': 'an', 'ٍ': 'in', 'ٌ': 'un', 'ْ': '', 'ّ': ''
            };
            let latin = '';
            for (let char of arabicText) latin += arabicToLatinMap[char] || char;
            latin = latin.replace(/[\u064B-\u065F]/g, '').trim();
            return latin.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        },
        fetchAllDoas() {
            this.loading = true;
            const promises = [];
            for (let i = 1; i <= 108; i++) {
                promises.push(
                    fetch(`https://api.myquran.com/v2/doa/${i}`)
                        .then(response => response.json())
                        .then(res => {
                            if (res && res.status === true && res.data && res.data.arab && res.data.indo) {
                                return {
                                    id: i,
                                    judul: res.data.judul || `Doa ${i}`,
                                    arab: res.data.arab,
                                    latin: this.arabicToLatin(res.data.arab),
                                    indo: res.data.indo,
                                    source: res.data.source || 'Sumber Tidak Tersedia'
                                };
                            }
                            return null;
                        })
                        .catch(err => { console.error(`Error fetching doa ${i}:`, err); return null; })
                );
            }
            Promise.all(promises).then(results => {
                this.allDoas = results.filter(doa => doa !== null);
                this.loading = false;
            }).catch(err => {
                console.error('Error fetching all doas:', err);
                this.loading = false;
                alert('Gagal memuat daftar doa. Silakan coba lagi.');
            });
        },
        getDetail(doaId) {
            this.loading2 = true;
            this.detail = { id: doaId, judul: 'Memuat...', arab: '', latin: '(Latin tidak tersedia)', indo: '', source: 'Sumber Tidak Tersedia' };
            fetch(`https://api.myquran.com/v2/doa/${doaId}`)
                .then(response => response.json())
                .then(res => {
                    if (res && res.status === true && res.data && res.data.arab && res.data.indo) {
                        this.detail = {
                            id: doaId,
                            judul: res.data.judul || 'Judul Tidak Tersedia',
                            arab: res.data.arab,
                            latin: this.arabicToLatin(res.data.arab),
                            indo: res.data.indo,
                            source: res.data.source || 'Sumber Tidak Tersedia'
                        };
                    } else {
                        this.detail = { id: doaId, judul: 'Data Tidak Ditemukan', arab: '', latin: '(Latin tidak tersedia)', indo: '', source: 'Sumber Tidak Tersedia' };
                    }
                    this.loading2 = false;
                })
                .catch(err => {
                    console.error('Error fetching doa detail:', err);
                    this.detail = { id: doaId, judul: 'Gagal Memuat Data', arab: '', latin: '(Latin tidak tersedia)', indo: '', source: 'Sumber Tidak Tersedia' };
                    this.loading2 = false;
                    alert('Gagal memuat detail doa. Silakan coba lagi.');
                });
        },
        openDetailModal(doaId) {
            const validDoa = this.allDoas.find(doa => doa.id === doaId);
            if (validDoa) {
                this.getDetail(doaId);
                const checkLoading = setInterval(() => {
                    if (!this.loading2) {
                        clearInterval(checkLoading);
                        $('#detailModal').modal('show');
                    }
                }, 100);
            } else {
                alert('ID Doa tidak valid atau data tidak tersedia.');
            }
        },
        copyDoa() {
            if (this.detail.arab) {
                let text = `${this.detail.judul}\nArab: ${this.detail.arab}\nLatin: ${this.detail.latin}\nTerjemahan: ${this.detail.indo}`;
                navigator.clipboard.writeText(text).then(() => {
                    this.copied = true;
                    setTimeout(() => this.copied = false, 1000);
                });
            } else {
                alert('Tidak ada data yang dapat disalin.');
            }
        },
        shareDoa() {
            if (this.detail.arab) {
                this.shareText = `${this.detail.judul}\n\nArab: ${this.detail.arab}\n\nLatin: ${this.detail.latin}\n\nTerjemahan: ${this.detail.indo}\n\n(Dibagikan dari Doa Digital)`;
                if (navigator.share) {
                    navigator.share({
                        title: this.detail.judul,
                        text: this.shareText
                    }).then(() => console.log('Doa berhasil dibagikan')).catch(error => console.error('Error sharing:', error));
                } else {
                    this.showShareOptions = true;
                }
            } else {
                alert('Tidak ada data yang dapat dibagikan.');
            }
        },
        copyShareText() {
            navigator.clipboard.writeText(this.shareText).then(() => alert('Teks doa telah disalin ke clipboard.')).catch(err => console.error('Gagal menyalin teks:', err));
        },
        toggleSaveDoa(doa) {
            if (doa.arab) {
                const key = doa.id;
                const index = this.savedDoas.findIndex(d => d.id === key);
                if (index >= 0) this.savedDoas.splice(index, 1);
                else this.savedDoas.push({ id: doa.id, judul: doa.judul, arab: doa.arab, latin: doa.latin, indo: doa.indo, source: doa.source });
                this.saveDoas();
            } else {
                alert('Data doa tidak valid untuk disimpan.');
            }
        },
        isDoaSaved(doa) { return this.savedDoas.some(d => d.id === doa.id); },
        showSavedDoasModal() { $('#savedDoasModal').modal('show'); },
        goToSavedDoa(doa) { $('#savedDoasModal').modal('hide'); this.openDetailModal(doa.id); },
        filterDoas() { this.currentPage = 1; },
        previousPage() { if (this.currentPage > 1) this.currentPage--; },
        nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; },
        prevDoa() { if (this.hasPrev) this.openDetailModal(this.filteredDoas[this.currentIndex - 1].id); },
        nextDoa() { if (this.hasNext) this.openDetailModal(this.filteredDoas[this.currentIndex + 1].id); },
        startVoiceSearch() {
            if (!('webkitSpeechRecognition' in window)) {
                alert('Browser Anda tidak mendukung fitur pencarian suara.');
                return;
            }
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'id-ID';
            recognition.continuous = false;
            recognition.interimResults = true;
            this.showVoicePopup = true;
            this.voiceText = 'Mendengarkan...';
            document.body.classList.remove('modal-open');
            if (document.querySelector('.modal-backdrop')) document.querySelector('.modal-backdrop').remove();
            recognition.onresult = (event) => {
                const interimTranscript = Array.from(event.results).map(result => result[0].transcript).join('');
                this.voiceText = interimTranscript || 'Mendengarkan...';
                if (event.results[0].isFinal) {
                    this.searchQuery = event.results[0][0].transcript;
                    this.filterDoas();
                    setTimeout(() => {
                        this.showVoicePopup = false;
                        document.body.classList.remove('modal-open');
                        if (document.querySelector('.modal-backdrop')) document.querySelector('.modal-backdrop').remove();
                    }, 1000);
                }
            };
            recognition.onend = () => {
                if (this.voiceText === 'Mendengarkan...') {
                    this.voiceText = 'Tidak ada suara terdeteksi';
                    setTimeout(() => {
                        this.showVoicePopup = false;
                        document.body.classList.remove('modal-open');
                        if (document.querySelector('.modal-backdrop')) document.querySelector('.modal-backdrop').remove();
                    }, 1000);
                }
            };
            recognition.onerror = (event) => {
                this.voiceText = 'Error: ' + event.error;
                setTimeout(() => {
                    this.showVoicePopup = false;
                    document.body.classList.remove('modal-open');
                    if (document.querySelector('.modal-backdrop')) document.querySelector('.modal-backdrop').remove();
                }, 1000);
                console.error('Voice recognition error:', event.error);
            };
            recognition.start();
        },
        loadSavedDoas() {
            const saved = localStorage.getItem('savedDoas');
            if (saved) this.savedDoas = JSON.parse(saved) || [];
        },
        saveDoas() { localStorage.setItem('savedDoas', JSON.stringify(this.savedDoas)); }
    },
    mounted() {
        this.loadSavedDoas();
        this.fetchAllDoas();
        $('#detailModal').on('hidden.bs.modal', () => {
            this.detail = { id: null, judul: 'Data Tidak Ditemukan', arab: '', latin: '(Latin tidak tersedia)', indo: '', source: 'Sumber Tidak Tersedia' };
            this.loading2 = false;
            this.showShareOptions = false;
        });
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
