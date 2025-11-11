// Öğrenci yönetimi JavaScript dosyası
class StudentManager {
    constructor() {
        this.currentEditId = null;
        this.students = [];
        this.currentPage = 0;
        this.pageSize = 30;
        this.totalStudents = 0;
        
        this.initializeEventListeners();
        this.loadStudents();
        this.loadStatistics();
    }

    // Event listener'ları başlat
    initializeEventListeners() {
        const form = document.getElementById('studentForm');
        const searchInput = document.getElementById('searchInput');
        const classFilter = document.getElementById('classFilter');
        const sectionFilter = document.getElementById('sectionFilter');
        const deleteModal = document.getElementById('deleteModal');
        const importForm = document.getElementById('importForm');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Import form
        if (importForm) {
            importForm.addEventListener('submit', (e) => this.handleImport(e));
        }
        
        // Filtreler
        searchInput.addEventListener('input', () => this.debounce(() => this.applyFilters(), 300));
        classFilter.addEventListener('input', () => this.debounce(() => this.applyFilters(), 300));
        sectionFilter.addEventListener('input', () => this.debounce(() => this.applyFilters(), 300));
        
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

    // API'den öğrencileri yükle
    async loadStudents(resetPage = true) {
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
            const classFilter = document.getElementById('classFilter').value;
            const sectionFilter = document.getElementById('sectionFilter').value;

            if (searchTerm) params.append('search', searchTerm);
            if (classFilter) params.append('class_name', classFilter);
            if (sectionFilter) params.append('section', sectionFilter);

            const response = await fetch(`/api/students?${params}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.students = data.data || [];
            this.totalStudents = data.pagination?.total || 0;
            
            this.renderStudents();
            this.updateFilteredCount();
            
        } catch (error) {
            console.error('Öğrenciler yüklenirken hata:', error);
            this.showMessage('Öğrenciler yüklenirken bir hata oluştu.', 'error');
            this.hideLoadingState();
        }
    }

    // İstatistikleri yükle
    async loadStatistics() {
        try {
            const response = await fetch('/api/students/stats/classes');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.updateStatisticsDisplay(data.data);
            
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
            this.updateStatisticsDisplay({
                total_students: 0,
                total_classes: 0
            });
        }
    }

    // İstatistik göstergesini güncelle
    updateStatisticsDisplay(stats) {
        document.getElementById('totalStudents').textContent = stats.total_students || 0;
        document.getElementById('totalClasses').textContent = stats.total_classes || 0;
    }

    // Filtrelenen öğrenci sayısını güncelle
    updateFilteredCount() {
        document.getElementById('filteredCount').textContent = this.students.length;
    }

    // Filtreleri uygula
    applyFilters() {
        this.loadStudents(true);
    }

    // Öğrencileri tabloda göster
    renderStudents() {
        const tbody = document.getElementById('studentsTableBody');
        const loadingRow = document.getElementById('loadingRow');
        const emptyRow = document.getElementById('emptyRow');

        // Loading ve empty row'ları gizle
        loadingRow.style.display = 'none';
        emptyRow.classList.add('hidden');

        // Mevcut verileri temizle (loading ve empty hariç)
        const rows = tbody.querySelectorAll('tr:not(#loadingRow):not(#emptyRow)');
        rows.forEach(row => row.remove());

        if (this.students.length === 0) {
            emptyRow.classList.remove('hidden');
            return;
        }

        // Öğrencileri listele
        this.students.forEach(student => {
            const row = this.createStudentRow(student);
            tbody.appendChild(row);
        });
    }

    // Öğrenci satırı oluştur
    createStudentRow(student) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors duration-150';

        const formattedDate = new Date(student.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        const classSection = student.section 
            ? `${student.class_name} / ${student.section}` 
            : student.class_name;

        const parentInfo = student.parent_name || student.parent_phone 
            ? `${student.parent_name || 'İsimsiz'}\n${student.parent_phone || ''}`.trim()
            : 'Bilgi yok';

        row.innerHTML = `
            <td class="px-4 py-3">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-user text-blue-600 text-sm"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900">${student.first_name} ${student.last_name}</p>
                        ${student.student_number ? `<p class="text-xs text-gray-500">#${student.student_number}</p>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                ${student.student_number || '-'}
            </td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ${classSection}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">
                ${parentInfo.split('\n').map(line => `<div>${line}</div>`).join('')}
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
                ${formattedDate}
            </td>
            <td class="px-4 py-3 text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                    <button 
                        onclick="studentManager.editStudent(${student.id})"
                        class="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50 transition-colors duration-150"
                        title="Düzenle"
                    >
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button 
                        onclick="studentManager.showDeleteModal(${student.id}, '${student.first_name} ${student.last_name}')"
                        class="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50 transition-colors duration-150"
                        title="Sil"
                    >
                        <i class="fas fa-trash text-sm"></i>
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
        const studentData = {
            first_name: formData.get('first_name').trim(),
            last_name: formData.get('last_name').trim(),
            student_number: formData.get('student_number') ? formData.get('student_number').trim() : null,
            class_name: formData.get('class_name').trim(),
            section: formData.get('section') ? formData.get('section').trim() : null,
            parent_name: formData.get('parent_name') ? formData.get('parent_name').trim() : null,
            parent_phone: formData.get('parent_phone') ? formData.get('parent_phone').trim() : null
        };

        // Validasyon
        if (!this.validateForm(studentData)) {
            return;
        }

        try {
            let response;
            
            if (this.currentEditId) {
                // Güncelleme
                response = await fetch(`/api/students/${this.currentEditId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(studentData)
                });
            } else {
                // Yeni ekleme
                response = await fetch('/api/students', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(studentData)
                });
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'İşlem başarısız');
            }

            const message = this.currentEditId 
                ? 'Öğrenci başarıyla güncellendi!'
                : 'Öğrenci başarıyla eklendi!';
                
            this.showMessage(message, 'success');
            this.resetForm();
            this.loadStudents();
            this.loadStatistics();

        } catch (error) {
            console.error('Form gönderimi hatası:', error);
            this.showMessage(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    }

    // Form validasyonu
    validateForm(data) {
        if (!data.first_name || data.first_name.length < 2) {
            this.showMessage('Öğrenci adı en az 2 karakter olmalıdır.', 'error');
            return false;
        }

        if (!data.last_name || data.last_name.length < 2) {
            this.showMessage('Öğrenci soyadı en az 2 karakter olmalıdır.', 'error');
            return false;
        }

        if (!data.class_name) {
            this.showMessage('Sınıf bilgisi gereklidir.', 'error');
            return false;
        }

        if (data.first_name.length > 50 || data.last_name.length > 50) {
            this.showMessage('Ad ve soyad en fazla 50 karakter olabilir.', 'error');
            return false;
        }

        if (data.class_name.length > 20) {
            this.showMessage('Sınıf bilgisi en fazla 20 karakter olabilir.', 'error');
            return false;
        }

        if (data.student_number && data.student_number.length > 20) {
            this.showMessage('Öğrenci numarası en fazla 20 karakter olabilir.', 'error');
            return false;
        }

        if (data.parent_phone && data.parent_phone.length > 0) {
            const phoneRegex = /^[0-9+\s\-\(\)]{7,20}$/;
            if (!phoneRegex.test(data.parent_phone)) {
                this.showMessage('Geçerli bir telefon numarası giriniz.', 'error');
                return false;
            }
        }

        return true;
    }

    // Öğrenci düzenleme
    async editStudent(id) {
        try {
            const response = await fetch(`/api/students/${id}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();
            const student = result.data;

            this.currentEditId = id;
            
            // Formu doldur
            document.getElementById('firstName').value = student.first_name;
            document.getElementById('lastName').value = student.last_name;
            document.getElementById('studentNumber').value = student.student_number || '';
            document.getElementById('className').value = student.class_name;
            document.getElementById('section').value = student.section || '';
            document.getElementById('parentName').value = student.parent_name || '';
            document.getElementById('parentPhone').value = student.parent_phone || '';
            
            // Form başlığını güncelle
            document.getElementById('formTitle').textContent = 'Öğrenci Düzenle';
            document.getElementById('submitButtonText').textContent = 'Güncelle';
            document.getElementById('cancelButton').classList.remove('hidden');
            
            // Forma scroll
            document.getElementById('studentForm').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Öğrenci düzenleme hatası:', error);
            this.showMessage('Öğrenci düzenlenirken bir hata oluştu.', 'error');
        }
    }

    // Düzenlemeyi iptal et
    cancelEdit() {
        this.resetForm();
    }

    // Formu sıfırla
    resetForm() {
        document.getElementById('studentForm').reset();
        this.currentEditId = null;
        document.getElementById('formTitle').textContent = 'Yeni Öğrenci Ekle';
        document.getElementById('submitButtonText').textContent = 'Kaydet';
        document.getElementById('cancelButton').classList.add('hidden');
    }

    // Silme modalını göster
    showDeleteModal(id, name) {
        this.deleteId = id;
        document.getElementById('studentToDelete').textContent = name;
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
            const response = await fetch(`/api/students/${this.deleteId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Silme işlemi başarısız');
            }

            this.showMessage('Öğrenci başarıyla silindi!', 'success');
            this.hideDeleteModal();
            this.loadStudents();
            this.loadStatistics();

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
        const tbody = document.getElementById('studentsTableBody');
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

    // Excel şablonu indirme
    async downloadTemplate() {
        try {
            const response = await fetch('/api/reports/student-template');
            if (!response.ok) {
                throw new Error('Şablon indirilemedi');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ogrenci_sablonu.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showMessage('Excel şablonu indirildi!', 'success');
        } catch (error) {
            console.error('Şablon indirme hatası:', error);
            this.showMessage('Şablon indirilemedi: ' + error.message, 'error');
        }
    }

    // Import modal göster
    showImportModal() {
        document.getElementById('importModal').classList.remove('hidden');
        document.getElementById('importModal').classList.add('flex');
    }

    // Import modal gizle
    hideImportModal() {
        document.getElementById('importModal').classList.add('hidden');
        document.getElementById('importModal').classList.remove('flex');
        document.getElementById('importForm').reset();
    }

    // Excel import işlemi
    async handleImport(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('studentFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showMessage('Lütfen bir Excel dosyası seçin.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('studentFile', file);

        const importButton = document.getElementById('importButton');
        const buttonText = document.getElementById('importButtonText');
        const originalText = buttonText.textContent;

        try {
            importButton.disabled = true;
            buttonText.textContent = 'Yükleniyor...';

            const response = await fetch('/api/reports/import-students', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Import işlemi başarısız');
            }

            let message = `${result.data.successCount} öğrenci başarıyla eklendi!`;
            if (result.data.errorCount > 0) {
                message += ` ${result.data.errorCount} satırda hata oluştu.`;
                if (result.data.errors && result.data.errors.length > 0) {
                    console.warn('Import hataları:', result.data.errors);
                }
            }

            this.showMessage(message, result.data.errorCount > 0 ? 'warning' : 'success');
            this.hideImportModal();
            this.loadStudents(); // Listeyi yenile

        } catch (error) {
            console.error('Import hatası:', error);
            this.showMessage('Import işlemi sırasında hata: ' + error.message, 'error');
        } finally {
            importButton.disabled = false;
            buttonText.textContent = originalText;
        }
    }
}

// Öğrenci yöneticisini başlat
const studentManager = new StudentManager();

// Global fonksiyonlar (HTML'den çağrılabilir)
window.cancelEdit = () => studentManager.cancelEdit();
window.loadStudents = () => studentManager.loadStudents();
window.downloadTemplate = () => studentManager.downloadTemplate();
window.showImportModal = () => studentManager.showImportModal();
window.hideImportModal = () => studentManager.hideImportModal();
window.studentManager = studentManager;