// İşlem yönetimi JavaScript dosyası
class TransactionManager {
    constructor() {
        this.currentEditId = null;
        this.categories = [];
        this.transactions = [];
        this.filteredTransactions = [];
        this.currentPage = 0;
        this.pageSize = 20;
        this.totalTransactions = 0;
        
        this.initializeEventListeners();
        this.loadCategories();
        this.loadTransactions();
        this.setDefaultDate();
        this.loadStatistics();
    }

    // Event listener'ları başlat
    initializeEventListeners() {
        const form = document.getElementById('transactionForm');
        const typeSelect = document.getElementById('transactionType');
        const searchInput = document.getElementById('searchInput');
        const typeFilter = document.getElementById('typeFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const startDateFilter = document.getElementById('startDateFilter');
        const endDateFilter = document.getElementById('endDateFilter');
        const deleteModal = document.getElementById('deleteModal');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        typeSelect.addEventListener('change', () => this.loadCategoriesByType());
        
        // Filtreler
        searchInput.addEventListener('input', () => this.debounce(() => this.applyFilters(), 300));
        typeFilter.addEventListener('change', () => this.applyFilters());
        categoryFilter.addEventListener('change', () => this.applyFilters());
        startDateFilter.addEventListener('change', () => this.applyFilters());
        endDateFilter.addEventListener('change', () => this.applyFilters());
        
        // Modal event listeners
        document.getElementById('cancelDeleteButton').addEventListener('click', () => this.hideDeleteModal());
        document.getElementById('confirmDeleteButton').addEventListener('click', () => this.confirmDelete());
        
        // Modal backdrop click
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                this.hideDeleteModal();
            }
        });
    }

    // Debounce utility
    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }

    // Default tarih ayarla
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transactionDate').value = today;
    }

    // API'den kategorileri yükle
    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.categories = data.data || [];
            this.populateCategoryFilter();
            
        } catch (error) {
            console.error('Kategoriler yüklenirken hata:', error);
            this.showMessage('Kategoriler yüklenirken bir hata oluştu.', 'error');
        }
    }

    // Kategori filtresini doldur
    populateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        
        // Mevcut seçenekleri temizle
        categoryFilter.innerHTML = '<option value="">Tüm Kategoriler</option>';
        
        // Kategorileri ekle
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.name} (${category.type})`;
            categoryFilter.appendChild(option);
        });
    }

    // Türe göre kategorileri yükle
    loadCategoriesByType() {
        const typeSelect = document.getElementById('transactionType');
        const categorySelect = document.getElementById('transactionCategory');
        const selectedType = typeSelect.value;

        // Kategori dropdown'unu temizle
        categorySelect.innerHTML = '<option value="">Kategori seçiniz</option>';
        
        if (!selectedType) {
            categorySelect.disabled = true;
            categorySelect.innerHTML = '<option value="">Önce işlem türünü seçin</option>';
            return;
        }

        categorySelect.disabled = false;
        
        // Seçilen türe göre kategorileri filtrele
        const filteredCategories = this.categories.filter(cat => cat.type === selectedType);
        
        if (filteredCategories.length === 0) {
            categorySelect.innerHTML = '<option value="">Bu türde kategori bulunamadı</option>';
            categorySelect.disabled = true;
            return;
        }

        filteredCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    // API'den işlemleri yükle
    async loadTransactions(resetPage = true) {
        try {
            if (resetPage) {
                this.currentPage = 0;
            }

            this.showLoadingState();
            
            const params = new URLSearchParams({
                limit: this.pageSize,
                offset: this.currentPage * this.pageSize
            });

            // Filtreler
            const searchTerm = document.getElementById('searchInput').value;
            const typeFilter = document.getElementById('typeFilter').value;
            const categoryFilter = document.getElementById('categoryFilter').value;
            const startDate = document.getElementById('startDateFilter').value;
            const endDate = document.getElementById('endDateFilter').value;

            if (searchTerm) params.append('search', searchTerm);
            if (typeFilter) params.append('type', typeFilter);
            if (categoryFilter) params.append('category_id', categoryFilter);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await fetch(`/api/transactions?${params}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.transactions = data.data || [];
            this.totalTransactions = data.pagination?.total || 0;
            
            this.renderTransactions();
            this.updatePagination();
            this.loadStatistics(); // İstatistikleri güncelle
            
        } catch (error) {
            console.error('İşlemler yüklenirken hata:', error);
            this.showMessage('İşlemler yüklenirken bir hata oluştu.', 'error');
            this.hideLoadingState();
        }
    }

    // İstatistikleri yükle
    async loadStatistics() {
        try {
            const startDate = document.getElementById('startDateFilter').value;
            const endDate = document.getElementById('endDateFilter').value;

            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await fetch(`/api/transactions/stats/summary?${params}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.updateStatisticsDisplay(data.data);
            
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
            this.showMessage('İstatistikler yüklenirken bir hata oluştu.', 'error');
        }
    }

    // İstatistik göstergesini güncelle
    updateStatisticsDisplay(stats) {
        const netBalance = stats.net_balance || 0;
        const income = stats.gelir || { total_amount: 0, transaction_count: 0 };
        const expense = stats.gider || { total_amount: 0, transaction_count: 0 };

        // Net bakiye
        const netElement = document.getElementById('netBalance');
        netElement.textContent = `₺${this.formatNumber(netBalance)}`;
        netElement.className = `text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`;

        // Gelir
        document.getElementById('totalIncome').textContent = `₺${this.formatNumber(income.total_amount)}`;
        document.getElementById('incomeCount').textContent = `${income.transaction_count} işlem`;

        // Gider
        document.getElementById('totalExpense').textContent = `₺${this.formatNumber(expense.total_amount)}`;
        document.getElementById('expenseCount').textContent = `${expense.transaction_count} işlem`;
    }

    // Sayı formatlama
    formatNumber(number) {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }

    // Filtreleri uygula
    applyFilters() {
        this.loadTransactions(true);
    }

    // İşlemleri tabloda göster
    renderTransactions() {
        const tbody = document.getElementById('transactionsTableBody');
        const loadingRow = document.getElementById('loadingRow');
        const emptyRow = document.getElementById('emptyRow');

        // Loading ve empty row'ları gizle
        loadingRow.style.display = 'none';
        emptyRow.classList.add('hidden');

        // Mevcut verileri temizle (loading ve empty hariç)
        const rows = tbody.querySelectorAll('tr:not(#loadingRow):not(#emptyRow)');
        rows.forEach(row => row.remove());

        if (this.transactions.length === 0) {
            emptyRow.classList.remove('hidden');
            document.getElementById('paginationContainer').classList.add('hidden');
            return;
        }

        // İşlemleri listele
        this.transactions.forEach(transaction => {
            const row = this.createTransactionRow(transaction);
            tbody.appendChild(row);
        });

        document.getElementById('paginationContainer').classList.remove('hidden');
    }

    // İşlem satırı oluştur
    createTransactionRow(transaction) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors duration-150';

        const typeIcon = transaction.type === 'gelir' 
            ? '<i class="fas fa-arrow-up text-green-500"></i>' 
            : '<i class="fas fa-arrow-down text-red-500"></i>';
        
        const typeBadge = transaction.type === 'gelir'
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Gelir</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Gider</span>';

        const formattedDate = new Date(transaction.transaction_date).toLocaleDateString('tr-TR');
        const formattedAmount = this.formatNumber(transaction.amount);
        const amountColor = transaction.type === 'gelir' ? 'text-green-600' : 'text-red-600';
        const amountPrefix = transaction.type === 'gelir' ? '+' : '-';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formattedDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${typeIcon}
                    <span class="ml-2">${typeBadge}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">${transaction.category_name || 'Kategori Yok'}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                ${transaction.description}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${amountColor}">
                ${amountPrefix}₺${formattedAmount}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                    <button 
                        onclick="transactionManager.editTransaction(${transaction.id})"
                        class="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50 transition-colors duration-150"
                        title="Düzenle"
                    >
                        <i class="fas fa-edit"></i>
                    </button>
                    <button 
                        onclick="transactionManager.showDeleteModal(${transaction.id}, '${transaction.description.replace(/'/g, "\\'")}', '${amountPrefix}₺${formattedAmount}', '${formattedDate}')"
                        class="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50 transition-colors duration-150"
                        title="Sil"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    // Sayfalama güncelle
    updatePagination() {
        const paginationInfo = document.getElementById('paginationInfo');
        const prevButton = document.getElementById('prevPageButton');
        const nextButton = document.getElementById('nextPageButton');

        const start = this.currentPage * this.pageSize + 1;
        const end = Math.min(start + this.pageSize - 1, this.totalTransactions);
        
        paginationInfo.textContent = `${start}-${end} / ${this.totalTransactions} işlem`;
        
        prevButton.disabled = this.currentPage === 0;
        nextButton.disabled = end >= this.totalTransactions;
    }

    // Önceki sayfa
    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.loadTransactions(false);
        }
    }

    // Sonraki sayfa
    nextPage() {
        if ((this.currentPage + 1) * this.pageSize < this.totalTransactions) {
            this.currentPage++;
            this.loadTransactions(false);
        }
    }

    // Form gönderimi işle
    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const transactionData = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description').trim(),
            category_id: parseInt(formData.get('category_id')),
            transaction_date: formData.get('transaction_date')
        };

        // Validasyon
        if (!this.validateForm(transactionData)) {
            return;
        }

        try {
            let response;
            
            if (this.currentEditId) {
                // Güncelleme
                response = await fetch(`/api/transactions/${this.currentEditId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(transactionData)
                });
            } else {
                // Yeni ekleme
                response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(transactionData)
                });
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'İşlem başarısız');
            }

            const message = this.currentEditId 
                ? 'İşlem başarıyla güncellendi!'
                : 'İşlem başarıyla eklendi!';
                
            this.showMessage(message, 'success');
            this.resetForm();
            this.loadTransactions();

        } catch (error) {
            console.error('Form gönderimi hatası:', error);
            this.showMessage(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    }

    // Form validasyonu
    validateForm(data) {
        if (!data.type) {
            this.showMessage('İşlem türü seçmelisiniz.', 'error');
            return false;
        }

        if (!data.amount || data.amount <= 0) {
            this.showMessage('Geçerli bir tutar giriniz.', 'error');
            return false;
        }

        if (!data.description || data.description.length < 2) {
            this.showMessage('Açıklama en az 2 karakter olmalıdır.', 'error');
            return false;
        }

        if (!data.category_id) {
            this.showMessage('Kategori seçmelisiniz.', 'error');
            return false;
        }

        if (!data.transaction_date) {
            this.showMessage('İşlem tarihi seçmelisiniz.', 'error');
            return false;
        }

        return true;
    }

    // İşlem düzenleme
    async editTransaction(id) {
        try {
            const response = await fetch(`/api/transactions/${id}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();
            const transaction = result.data;

            this.currentEditId = id;
            
            // Formu doldur
            document.getElementById('transactionType').value = transaction.type;
            
            // Kategorileri yükle ve seçili olanı ayarla
            this.loadCategoriesByType();
            setTimeout(() => {
                document.getElementById('transactionCategory').value = transaction.category_id;
            }, 100);
            
            document.getElementById('transactionAmount').value = transaction.amount;
            document.getElementById('transactionDescription').value = transaction.description;
            document.getElementById('transactionDate').value = transaction.transaction_date;
            
            // Form başlığını güncelle
            document.getElementById('formTitle').textContent = 'İşlem Düzenle';
            document.getElementById('submitButtonText').textContent = 'Güncelle';
            document.getElementById('cancelButton').classList.remove('hidden');
            
            // Forma scroll
            document.getElementById('transactionForm').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('İşlem düzenleme hatası:', error);
            this.showMessage('İşlem düzenlenirken bir hata oluştu.', 'error');
        }
    }

    // Düzenlemeyi iptal et
    cancelEdit() {
        this.resetForm();
    }

    // Formu sıfırla
    resetForm() {
        document.getElementById('transactionForm').reset();
        this.currentEditId = null;
        document.getElementById('formTitle').textContent = 'Yeni İşlem Ekle';
        document.getElementById('submitButtonText').textContent = 'Kaydet';
        document.getElementById('cancelButton').classList.add('hidden');
        
        // Kategori dropdown'unu resetle
        document.getElementById('transactionCategory').innerHTML = '<option value="">Önce işlem türünü seçin</option>';
        document.getElementById('transactionCategory').disabled = true;
        
        this.setDefaultDate();
    }

    // Silme modalını göster
    showDeleteModal(id, description, amount, date) {
        this.deleteId = id;
        document.getElementById('transactionToDeleteDescription').textContent = description;
        document.getElementById('transactionToDeleteAmount').textContent = amount;
        document.getElementById('transactionToDeleteDate').textContent = date;
        document.getElementById('deleteModal').classList.remove('hidden');
        document.getElementById('deleteModal').classList.add('flex');
    }

    // Silme modalını gizle
    hideDeleteModal() {
        document.getElementById('deleteModal').classList.add('hidden');
        document.getElementById('deleteModal').classList.remove('flex');
        this.deleteId = null;
    }

    // Silme işlemini onayla
    async confirmDelete() {
        if (!this.deleteId) return;

        try {
            const response = await fetch(`/api/transactions/${this.deleteId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Silme işlemi başarısız');
            }

            this.showMessage('İşlem başarıyla silindi!', 'success');
            this.hideDeleteModal();
            this.loadTransactions();

        } catch (error) {
            console.error('Silme hatası:', error);
            this.showMessage(error.message || 'Silme işlemi sırasında bir hata oluştu.', 'error');
        }
    }

    // Loading durumunu göster
    showLoadingState() {
        document.getElementById('loadingRow').style.display = '';
        document.getElementById('emptyRow').classList.add('hidden');
        
        // Mevcut verileri gizle
        const tbody = document.getElementById('transactionsTableBody');
        const rows = tbody.querySelectorAll('tr:not(#loadingRow):not(#emptyRow)');
        rows.forEach(row => row.style.display = 'none');
    }

    // Loading durumunu gizle
    hideLoadingState() {
        document.getElementById('loadingRow').style.display = 'none';
    }

    // Mesaj göster
    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        
        const messageDiv = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 
                       type === 'error' ? 'bg-red-500' : 
                       type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        messageDiv.className = `${bgColor} text-white px-4 py-3 rounded-md shadow-lg mb-2 flex items-center transform transition-transform duration-300 translate-x-full max-w-md`;
        messageDiv.innerHTML = `
            <i class="fas ${icon} mr-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(messageDiv);
        
        // Animasyon
        setTimeout(() => {
            messageDiv.classList.remove('translate-x-full');
        }, 100);
        
        // Otomatik kaldırma
        setTimeout(() => {
            messageDiv.classList.add('translate-x-full');
            setTimeout(() => {
                if (messageDiv.parentElement) {
                    messageDiv.remove();
                }
            }, 300);
        }, 5000);
    }
}

// İşlem yöneticisini başlat
const transactionManager = new TransactionManager();

// Global fonksiyonlar (HTML'den çağrılabilir)
window.cancelEdit = () => transactionManager.cancelEdit();
window.prevPage = () => transactionManager.prevPage();
window.nextPage = () => transactionManager.nextPage();
window.loadTransactions = () => transactionManager.loadTransactions();
window.transactionManager = transactionManager;