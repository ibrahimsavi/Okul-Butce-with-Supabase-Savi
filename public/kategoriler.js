// Kategori yönetimi JavaScript dosyası
class CategoryManager {
    constructor() {
        this.currentEditId = null;
        this.categories = [];
        this.filteredCategories = [];
        this.initializeEventListeners();
        this.loadCategories();
    }

    // Event listener'ları başlat
    initializeEventListeners() {
        const form = document.getElementById('categoryForm');
        const searchInput = document.getElementById('searchInput');
        const typeFilter = document.getElementById('typeFilter');
        const deleteModal = document.getElementById('deleteModal');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        searchInput.addEventListener('input', () => this.filterCategories());
        typeFilter.addEventListener('change', () => this.filterCategories());
        
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

    // API'den kategorileri yükle
    async loadCategories() {
        try {
            this.showLoadingState();
            const response = await fetch('/api/categories');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.categories = data.data || [];
            this.filteredCategories = [...this.categories];
            
            this.renderCategories();
            this.updateStatistics();
            
        } catch (error) {
            console.error('Kategoriler yüklenirken hata:', error);
            this.showMessage('Kategoriler yüklenirken bir hata oluştu.', 'error');
            this.hideLoadingState();
        }
    }

    // Kategorileri tabloda göster
    renderCategories() {
        const tbody = document.getElementById('categoriesTableBody');
        const loadingRow = document.getElementById('loadingRow');
        const emptyRow = document.getElementById('emptyRow');

        // Loading ve empty row'ları gizle
        loadingRow.style.display = 'none';
        emptyRow.classList.add('hidden');

        // Mevcut verileri temizle (loading ve empty hariç)
        const rows = tbody.querySelectorAll('tr:not(#loadingRow):not(#emptyRow)');
        rows.forEach(row => row.remove());

        if (this.filteredCategories.length === 0) {
            emptyRow.classList.remove('hidden');
            return;
        }

        // Kategorileri listele
        this.filteredCategories.forEach((category, index) => {
            const row = this.createCategoryRow(category, index + 1);
            tbody.appendChild(row);
        });
    }

    // Kategori satırı oluştur
    createCategoryRow(category, index) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors duration-150';

        const typeIcon = category.type === 'gelir' 
            ? '<i class="fas fa-arrow-up text-green-500"></i>' 
            : '<i class="fas fa-arrow-down text-red-500"></i>';
        
        const typeBadge = category.type === 'gelir'
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Gelir</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Gider</span>';

        const formattedDate = new Date(category.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const description = category.description 
            ? `<span class="text-gray-600">${category.description}</span>`
            : '<span class="text-gray-400 italic">Açıklama yok</span>';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${index}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${typeIcon}
                    <span class="ml-2 text-sm font-medium text-gray-900">${category.name}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${typeBadge}
            </td>
            <td class="px-6 py-4 text-sm max-w-xs truncate">
                ${description}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formattedDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                    <button 
                        onclick="categoryManager.editCategory(${category.id})"
                        class="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50 transition-colors duration-150"
                        title="Düzenle"
                    >
                        <i class="fas fa-edit"></i>
                    </button>
                    <button 
                        onclick="categoryManager.showDeleteModal(${category.id}, '${category.name.replace(/'/g, "\\'")}')"
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

    // Form gönderimi işle
    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const categoryData = {
            name: formData.get('name').trim(),
            type: formData.get('type'),
            description: formData.get('description').trim()
        };

        // Validasyon
        if (!this.validateForm(categoryData)) {
            return;
        }

        try {
            let response;
            
            if (this.currentEditId) {
                // Güncelleme
                response = await fetch(`/api/categories/${this.currentEditId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(categoryData)
                });
            } else {
                // Yeni ekleme
                response = await fetch('/api/categories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(categoryData)
                });
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'İşlem başarısız');
            }

            const message = this.currentEditId 
                ? 'Kategori başarıyla güncellendi!'
                : 'Kategori başarıyla eklendi!';
                
            this.showMessage(message, 'success');
            this.resetForm();
            this.loadCategories();

        } catch (error) {
            console.error('Form gönderimi hatası:', error);
            this.showMessage(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    }

    // Form validasyonu
    validateForm(data) {
        if (!data.name || data.name.length < 2) {
            this.showMessage('Kategori adı en az 2 karakter olmalıdır.', 'error');
            return false;
        }

        if (data.name.length > 50) {
            this.showMessage('Kategori adı en fazla 50 karakter olabilir.', 'error');
            return false;
        }

        if (!data.type) {
            this.showMessage('Kategori türü seçmelisiniz.', 'error');
            return false;
        }

        if (!['gelir', 'gider'].includes(data.type)) {
            this.showMessage('Geçersiz kategori türü.', 'error');
            return false;
        }

        if (data.description && data.description.length > 255) {
            this.showMessage('Açıklama en fazla 255 karakter olabilir.', 'error');
            return false;
        }

        // Aynı isimde kategori kontrolü
        const existingCategory = this.categories.find(cat => 
            cat.name.toLowerCase() === data.name.toLowerCase() && 
            cat.id !== this.currentEditId
        );

        if (existingCategory) {
            this.showMessage('Bu isimde bir kategori zaten mevcut.', 'error');
            return false;
        }

        return true;
    }

    // Kategori düzenleme
    editCategory(id) {
        const category = this.categories.find(cat => cat.id === id);
        if (!category) {
            this.showMessage('Kategori bulunamadı.', 'error');
            return;
        }

        this.currentEditId = id;
        
        // Formu doldur
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryType').value = category.type;
        document.getElementById('categoryDescription').value = category.description || '';
        
        // Buton metnini güncelle
        document.getElementById('submitButtonText').textContent = 'Güncelle';
        document.getElementById('cancelButton').classList.remove('hidden');
        
        // Forma scroll
        document.getElementById('categoryForm').scrollIntoView({ behavior: 'smooth' });
    }

    // Düzenlemeyi iptal et
    cancelEdit() {
        this.resetForm();
    }

    // Formu sıfırla
    resetForm() {
        document.getElementById('categoryForm').reset();
        this.currentEditId = null;
        document.getElementById('submitButtonText').textContent = 'Kaydet';
        document.getElementById('cancelButton').classList.add('hidden');
    }

    // Silme modalını göster
    showDeleteModal(id, name) {
        this.deleteId = id;
        document.getElementById('categoryToDelete').textContent = name;
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
            const response = await fetch(`/api/categories/${this.deleteId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Silme işlemi başarısız');
            }

            this.showMessage('Kategori başarıyla silindi!', 'success');
            this.hideDeleteModal();
            this.loadCategories();

        } catch (error) {
            console.error('Silme hatası:', error);
            this.showMessage(error.message || 'Silme işlemi sırasında bir hata oluştu.', 'error');
        }
    }

    // Kategorileri filtrele
    filterCategories() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;

        this.filteredCategories = this.categories.filter(category => {
            const nameMatch = category.name.toLowerCase().includes(searchTerm);
            const descMatch = (category.description || '').toLowerCase().includes(searchTerm);
            const textMatch = nameMatch || descMatch;
            
            const typeMatch = !typeFilter || category.type === typeFilter;
            
            return textMatch && typeMatch;
        });

        this.renderCategories();
    }

    // İstatistikleri güncelle
    updateStatistics() {
        const total = this.categories.length;
        const income = this.categories.filter(cat => cat.type === 'gelir').length;
        const expense = this.categories.filter(cat => cat.type === 'gider').length;

        document.getElementById('totalCategories').textContent = total;
        document.getElementById('incomeCategories').textContent = income;
        document.getElementById('expenseCategories').textContent = expense;
    }

    // Loading durumunu göster
    showLoadingState() {
        document.getElementById('loadingRow').style.display = '';
        document.getElementById('emptyRow').classList.add('hidden');
        
        // Mevcut verileri gizle
        const tbody = document.getElementById('categoriesTableBody');
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
        
        messageDiv.className = `${bgColor} text-white px-4 py-3 rounded-md shadow-lg mb-2 flex items-center transform transition-transform duration-300 translate-x-full`;
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
                messageDiv.remove();
            }, 300);
        }, 5000);
    }
}

// Kategori yöneticisini başlat
const categoryManager = new CategoryManager();

// Global fonksiyonlar (HTML'den çağrılabilir)
window.cancelEdit = () => categoryManager.cancelEdit();
window.loadCategories = () => categoryManager.loadCategories();
window.categoryManager = categoryManager;