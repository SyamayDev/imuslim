var app = new Vue({
    el: '#app',
    data: {
        allBooks: [],
        selectedBook: {},
        hadiths: [],
        loading: false,
        loading2: false,
        copiedHadiths: {},
        savedHadiths: [],
        searchQuery: '',
        currentPage: 1,
        itemsPerPage: 12,
        showVoicePopup: false,
        voiceText: '',
        currentHadithPage: 1,
        hadithsPerPage: 100,
        totalHadiths: 0,
        hadithSearchQuery: '',
        showPageSelect: false,
        showShareOptions: {},
        shareText: {}
    },
    computed: {
        filteredBooks() {
            let filtered = this.allBooks;
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase().replace(/[\s-]/g, '');
                filtered = filtered.filter(b => b.name.toLowerCase().replace(/[\s-]/g, '').includes(query));
            }
            return filtered;
        },
        totalPages() { return Math.ceil(this.filteredBooks.length / this.itemsPerPage); },
        paginatedBooks() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredBooks.slice(start, end);
        },
        totalHadithPages() { return Math.ceil(this.totalHadiths / this.hadithsPerPage); }
    },
    methods: {
        refreshPage() { window.location.reload(); },
        getBooks() {
            this.loading = true;
            this.$http.get('https://api.hadith.gading.dev/books').then(response => {
                this.allBooks = response.body.data.map(book => ({
                    id: book.id,
                    name: book.name,
                    numberOfHadith: book.available
                }));
                this.loading = false;
            }).catch(err => {
                console.error('Error fetching books:', err);
                this.loading = false;
                alert('Gagal memuat daftar kitab. Silakan coba lagi.');
            });
        },
        getHadiths(bookId, page = 1) {
            this.loading2 = true;
            const start = (page - 1) * this.hadithsPerPage + 1;
            const end = Math.min(start + this.hadithsPerPage - 1, this.selectedBook.numberOfHadith);
            const range = `${start}-${end}`;
            this.$http.get(`https://api.hadith.gading.dev/books/${bookId}?range=${range}`).then(response => {
                this.hadiths = response.body.data.hadiths.map((h, index) => ({
                    number: start + index,
                    arab: h.arab,
                    id: h.id,
                    bookId: bookId,
                    bookName: this.selectedBook.name
                }));
                this.totalHadiths = this.selectedBook.numberOfHadith;
                this.currentHadithPage = page;
                this.loading2 = false;
                this.$nextTick(() => this.initSelect2());
            }).catch(err => {
                console.error('Error fetching hadiths:', err);
                this.loading2 = false;
                alert('Gagal memuat hadits. Silakan coba lagi.');
            });
        },
        openDetailModal(bookId) {
            this.selectedBook = this.allBooks.find(b => b.id === bookId) || {};
            this.getHadiths(bookId, 1);
            $('#detailModal').modal('show');
        },
        initSelect2() {
            $('#hadithSelect').select2({
                placeholder: 'Pilih hadits...',
                allowClear: true,
                data: this.hadiths.map(h => ({ id: h.number, text: `Hadits ${h.number}: ${h.arab.substring(0, 20)}...` }))
            });
            $('#hadithSelect').on('change', () => {
                let val = $('#hadithSelect').val();
                if (val) document.getElementById(`hadith-${val}`).scrollIntoView({ behavior: "smooth", block: "start" });
            });
        },
        previousHadithPage() {
            if (this.currentHadithPage > 1) {
                this.getHadiths(this.selectedBook.id, this.currentHadithPage - 1);
            }
        },
        nextHadithPage() {
            if (this.currentHadithPage < this.totalHadithPages) {
                this.getHadiths(this.selectedBook.id, this.currentHadithPage + 1);
            }
        },
        jumpToHadithPage() {
            this.getHadiths(this.selectedBook.id, this.currentHadithPage);
        },
        togglePageSelect() {
            this.showPageSelect = true;
            this.$nextTick(() => document.querySelector('.page-number select').focus());
        },
        copyHadith(hadith) {
            let text = `Hadits ${hadith.number}\nArab: ${hadith.arab}\nTerjemahan: ${hadith.id}`;
            navigator.clipboard.writeText(text).then(() => {
                this.$set(this.copiedHadiths, hadith.number, true);
                setTimeout(() => this.$delete(this.copiedHadiths, hadith.number), 1000);
            });
        },
        shareHadith(hadith) {
            const shareText = `Hadits ${hadith.number} (${hadith.bookName})\n\nArab: ${hadith.arab}\n\nTerjemahan: ${hadith.id}\n\n(Dibagikan dari Hadist Digital)`;
            this.$set(this.shareText, hadith.number, shareText);
            if (navigator.share) {
                navigator.share({
                    title: `Hadits ${hadith.number} (${hadith.bookName})`,
                    text: shareText
                }).then(() => console.log('Hadits berhasil dibagikan')).catch(error => console.error('Error sharing:', error));
            } else {
                this.$set(this.showShareOptions, hadith.number, true);
            }
        },
        copyShareText(hadithNumber) {
            navigator.clipboard.writeText(this.shareText[hadithNumber]).then(() => alert('Teks hadits telah disalin ke clipboard.')).catch(err => console.error('Gagal menyalin teks:', err));
        },
        toggleSaveHadith(hadith) {
            const key = `${hadith.bookId}-${hadith.number}`;
            const index = this.savedHadiths.findIndex(h => `${h.bookId}-${h.number}` === key);
            if (index >= 0) this.savedHadiths.splice(index, 1);
            else this.savedHadiths.push({
                bookId: hadith.bookId,
                bookName: hadith.bookName,
                number: hadith.number,
                arab: hadith.arab,
                id: hadith.id
            });
            this.saveHadiths();
        },
        isHadithSaved(hadith) {
            return this.savedHadiths.some(h => h.bookId === hadith.bookId && h.number === hadith.number);
        },
        showSavedHadithsModal() {
            $('#savedHadithsModal').modal('show');
        },
        goToSavedHadith(hadith) {
            $('#savedHadithsModal').modal('hide');
            this.openDetailModal(hadith.bookId);
            this.$nextTick(() => {
                setTimeout(() => {
                    const page = Math.ceil(hadith.number / this.hadithsPerPage);
                    this.getHadiths(hadith.bookId, page);
                    setTimeout(() => {
                        const el = document.getElementById(`hadith-${hadith.number}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 500);
                }, 500);
            });
        },
        searchHadith() {
            const query = parseInt(this.hadithSearchQuery);
            if (isNaN(query) || query < 1 || query > this.totalHadiths) {
                alert('Masukkan nomor hadits yang valid.');
                return;
            }
            const page = Math.ceil(query / this.hadithsPerPage);
            this.getHadiths(this.selectedBook.id, page);
            this.$nextTick(() => {
                setTimeout(() => {
                    const el = document.getElementById(`hadith-${query}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 500);
            });
        },
        filterBooks() { this.currentPage = 1; },
        previousPage() { if (this.currentPage > 1) this.currentPage--; },
        nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; },
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
                    this.filterBooks();
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
        loadSavedHadiths() {
            const saved = localStorage.getItem('savedHadiths');
            if (saved) this.savedHadiths = JSON.parse(saved);
        },
        saveHadiths() { localStorage.setItem('savedHadiths', JSON.stringify(this.savedHadiths)); }
    },
    mounted() {
        this.loadSavedHadiths();
        this.getBooks();
        $('#detailModal').on('hidden.bs.modal', () => {
            this.hadiths = [];
            this.selectedBook = {};
            this.currentHadithPage = 1;
            this.totalHadiths = 0;
            this.hadithSearchQuery = '';
            this.showShareOptions = {};
            this.shareText = {};
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
