// Student Fees Management JavaScript

class FeesManager {
    constructor() {
        this.fees = [];
        this.students = [];
        this.classes = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;
        this.filters = {
            search: '',
            class_name: '',
            status: '',
            due_date_start: '',
            due_date_end: ''
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadStudents();
            await this.loadFees();
            await this.loadStats();
            this.setupEventListeners();
            this.populateClassFilter();
            console.log('✅ Fees Manager başlatıldı');
        } catch (error) {
            console.error('❌ Fees Manager başlatma hatası:', error);
            this.showNotification('Sistem başlatılamadı: ' + error.message, 'error');
        }
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('add-fee-btn').addEventListener('click', () => this.showAddFeeModal());
        document.getElementById('bulk-assign-btn').addEventListener('click', () => this.showBulkAssignModal());
        
        // Modal close buttons
        document.getElementById('close-add-modal').addEventListener('click', () => this.hideModal('add-fee-modal'));
        document.getElementById('close-bulk-modal').addEventListener('click', () => this.hideModal('bulk-assign-modal'));
        document.getElementById('close-payment-modal').addEventListener('click', () => this.hideModal('payment-modal'));
        
        document.getElementById('cancel-add').addEventListener('click', () => this.hideModal('add-fee-modal'));
        document.getElementById('cancel-bulk').addEventListener('click', () => this.hideModal('bulk-assign-modal'));
        document.getElementById('cancel-payment').addEventListener('click', () => this.hideModal('payment-modal'));

        // Forms
        document.getElementById('add-fee-form').addEventListener('submit', (e) => this.handleAddFee(e));
        document.getElementById('bulk-assign-form').addEventListener('submit', (e) => this.handleBulkAssign(e));
        document.getElementById('payment-form').addEventListener('submit', (e) => this.handlePayment(e));

        // Filters
        document.getElementById('filter-btn').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters-btn').addEventListener('click', () => this.clearFilters());

        // Search with debounce
        document.getElementById('search').addEventListener('input', this.debounce((e) => {
            this.filters.search = e.target.value;
            this.currentPage = 1;
            this.loadFees();
        }, 500));

        // Pagination
        document.getElementById('prev-desktop').addEventListener('click', () => this.previousPage());
        document.getElementById('next-desktop').addEventListener('click', () => this.nextPage());
        document.getElementById('prev-mobile').addEventListener('click', () => this.previousPage());
        document.getElementById('next-mobile').addEventListener('click', () => this.nextPage());

        // Bulk assignment type change
        document.getElementById('assignment-type').addEventListener('change', (e) => {
            this.handleAssignmentTypeChange(e.target.value);
        });

        // Modal click outside to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('bg-opacity-50')) {
                this.hideAllModals();
            }
        });
    }

    async loadStudents() {
        try {
            const response = await fetch('/api/students');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.students = data.data;
                this.populateStudentSelects();
                
                // Extract unique classes
                this.classes = [...new Set(this.students.map(s => s.class_name))].sort();
                console.log('✅ Öğrenciler yüklendi:', this.students.length);
            } else {
                throw new Error(data.message || 'Öğrenciler yüklenemedi');
            }
        } catch (error) {
            console.error('❌ Öğrenci yükleme hatası:', error);
            this.showNotification('Öğrenciler yüklenemedi: ' + error.message, 'error');
        }
    }

    async loadFees() {
        try {
            const params = new URLSearchParams({
                limit: this.itemsPerPage,
                offset: (this.currentPage - 1) * this.itemsPerPage,
                ...this.filters
            });

            // Remove empty filters
            for (const [key, value] of params.entries()) {
                if (!value) {
                    params.delete(key);
                }
            }

            const response = await fetch(`/api/student-fees?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.fees = data.data;
                this.totalItems = data.pagination.total;
                this.renderFeesTable();
                this.updatePagination();
                console.log('✅ Aidatlar yüklendi:', this.fees.length);
            } else {
                throw new Error(data.message || 'Aidatlar yüklenemedi');
            }
        } catch (error) {
            console.error('❌ Aidat yükleme hatası:', error);
            this.showNotification('Aidatlar yüklenemedi: ' + error.message, 'error');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/student-fees/stats/summary');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.updateStatsDisplay(data.data);
                console.log('✅ İstatistikler yüklendi');
            } else {
                throw new Error(data.message || 'İstatistikler yüklenemedi');
            }
        } catch (error) {
            console.error('❌ İstatistik yükleme hatası:', error);
        }
    }

    updateStatsDisplay(stats) {
        // Pending fees
        document.getElementById('pending-count').textContent = stats.pending.count;
        document.getElementById('pending-amount').textContent = `₺${stats.pending.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

        // Paid fees
        document.getElementById('paid-count').textContent = stats.paid.count;
        document.getElementById('paid-amount').textContent = `₺${stats.paid.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

        // Overdue fees
        document.getElementById('overdue-count').textContent = stats.overdue.count;
        document.getElementById('overdue-amount').textContent = `₺${stats.overdue.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

        // Total
        document.getElementById('total-count').textContent = stats.totals.count;
        document.getElementById('total-amount').textContent = `₺${stats.totals.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    }

    populateStudentSelects() {
        const studentSelect = document.getElementById('student-select');
        studentSelect.innerHTML = '<option value="">Öğrenci seçiniz...</option>';
        
        this.students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.first_name} ${student.last_name} (${student.student_number}) - ${student.class_name}${student.section}`;
            studentSelect.appendChild(option);
        });
    }

    populateClassFilter() {
        const classFilter = document.getElementById('class-filter');
        classFilter.innerHTML = '<option value="">Tüm Sınıflar</option>';
        
        this.classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = `${className}. Sınıf`;
            classFilter.appendChild(option);
        });
    }

    renderFeesTable() {
        const tbody = document.getElementById('fees-table-body');
        tbody.innerHTML = '';

        if (this.fees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                        <i class="ri-inbox-line text-4xl mb-2 block"></i>
                        Gösterilecek aidat bulunamadı
                    </td>
                </tr>
            `;
            return;
        }

        this.fees.forEach(fee => {
            const row = this.createFeeRow(fee);
            tbody.appendChild(row);
        });
    }

    createFeeRow(fee) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusBadge = this.getStatusBadge(fee.status);
        const remainingAmount = fee.amount - (fee.paid_amount || 0);
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div>
                    <div class="text-sm font-medium text-gray-900">
                        ${fee.first_name} ${fee.last_name}
                    </div>
                    <div class="text-sm text-gray-500">
                        ${fee.student_number} - ${fee.class_name}${fee.section}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${fee.description}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                    ₺${fee.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                    ${this.formatDate(fee.due_date)}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                    ₺${(fee.paid_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div class="text-xs text-gray-500">
                    Kalan: ₺${remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                ${fee.status !== 'paid' ? `
                    <button onclick="feesManager.showPaymentModal(${fee.id})" 
                            class="text-green-600 hover:text-green-900" title="Ödeme Kaydet">
                        <i class="ri-money-dollar-circle-line"></i>
                    </button>
                ` : ''}
                <button onclick="feesManager.editFee(${fee.id})" 
                        class="text-blue-600 hover:text-blue-900" title="Düzenle">
                    <i class="ri-edit-line"></i>
                </button>
                <button onclick="feesManager.deleteFee(${fee.id})" 
                        class="text-red-600 hover:text-red-900" title="Sil">
                    <i class="ri-delete-bin-line"></i>
                </button>
                <button onclick="feesManager.viewFeeDetails(${fee.id})" 
                        class="text-gray-600 hover:text-gray-900" title="Detaylar">
                    <i class="ri-eye-line"></i>
                </button>
            </td>
        `;
        
        return row;
    }

    getStatusBadge(status) {
        const badges = {
            pending: '<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Bekleyen</span>',
            paid: '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ödenmiş</span>',
            overdue: '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Gecikmiş</span>'
        };
        return badges[status] || '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Belirsiz</span>';
    }

    updatePagination() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        const showingFrom = (this.currentPage - 1) * this.itemsPerPage + 1;
        const showingTo = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);

        document.getElementById('showing-from').textContent = showingFrom;
        document.getElementById('showing-to').textContent = showingTo;
        document.getElementById('total-items').textContent = this.totalItems;
        document.getElementById('page-info').textContent = `${this.currentPage} / ${totalPages}`;

        // Update button states
        const prevButtons = [document.getElementById('prev-desktop'), document.getElementById('prev-mobile')];
        const nextButtons = [document.getElementById('next-desktop'), document.getElementById('next-mobile')];

        prevButtons.forEach(btn => {
            btn.disabled = this.currentPage <= 1;
            btn.className = btn.disabled ? 
                btn.className.replace('hover:bg-gray-50', '') + ' opacity-50 cursor-not-allowed' :
                btn.className.replace('opacity-50 cursor-not-allowed', '') + ' hover:bg-gray-50';
        });

        nextButtons.forEach(btn => {
            btn.disabled = this.currentPage >= totalPages;
            btn.className = btn.disabled ? 
                btn.className.replace('hover:bg-gray-50', '') + ' opacity-50 cursor-not-allowed' :
                btn.className.replace('opacity-50 cursor-not-allowed', '') + ' hover:bg-gray-50';
        });
    }

    showAddFeeModal() {
        // Set default due date to next month
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        document.getElementById('fee-due-date').value = nextMonth.toISOString().split('T')[0];
        
        this.showModal('add-fee-modal');
    }

    showBulkAssignModal() {
        // Reset form
        document.getElementById('bulk-assign-form').reset();
        this.handleAssignmentTypeChange('');
        
        // Set default due date to next month
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        document.getElementById('bulk-due-date').value = nextMonth.toISOString().split('T')[0];
        
        this.populateClassCheckboxes();
        this.populateStudentCheckboxes();
        
        this.showModal('bulk-assign-modal');
    }

    handleAssignmentTypeChange(type) {
        const classSelection = document.getElementById('class-selection');
        const studentSelection = document.getElementById('student-selection');
        
        classSelection.classList.add('hidden');
        studentSelection.classList.add('hidden');
        
        if (type === 'class') {
            classSelection.classList.remove('hidden');
        } else if (type === 'selected') {
            studentSelection.classList.remove('hidden');
        }
    }

    populateClassCheckboxes() {
        const container = document.getElementById('class-checkboxes');
        container.innerHTML = '';
        
        this.classes.forEach(className => {
            const div = document.createElement('div');
            div.className = 'flex items-center';
            div.innerHTML = `
                <input type="checkbox" id="class-${className}" value="${className}" class="mr-2">
                <label for="class-${className}" class="text-sm text-gray-700">${className}. Sınıf</label>
            `;
            container.appendChild(div);
        });
    }

    populateStudentCheckboxes() {
        const container = document.getElementById('student-checkboxes');
        container.innerHTML = '';
        
        this.students.forEach(student => {
            const div = document.createElement('div');
            div.className = 'flex items-center';
            div.innerHTML = `
                <input type="checkbox" id="student-${student.id}" value="${student.id}" class="mr-2">
                <label for="student-${student.id}" class="text-sm text-gray-700">
                    ${student.first_name} ${student.last_name} - ${student.class_name}${student.section}
                </label>
            `;
            container.appendChild(div);
        });
    }

    async showPaymentModal(feeId) {
        try {
            const response = await fetch(`/api/student-fees/${feeId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                const fee = data.data;
                const remainingAmount = fee.amount - (fee.paid_amount || 0);
                
                document.getElementById('payment-fee-id').value = feeId;
                document.getElementById('payment-fee-info').textContent = 
                    `${fee.first_name} ${fee.last_name} - ${fee.description} (Kalan: ₺${remainingAmount.toFixed(2)})`;
                document.getElementById('payment-amount').max = remainingAmount.toFixed(2);
                document.getElementById('payment-amount').value = remainingAmount.toFixed(2);
                document.getElementById('payment-remaining').textContent = 
                    `Kalan tutar: ₺${remainingAmount.toFixed(2)}`;
                
                // Set today as default payment date
                document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
                
                this.showModal('payment-modal');
            } else {
                throw new Error(data.message || 'Aidat bilgisi alınamadı');
            }
        } catch (error) {
            console.error('❌ Ödeme modal hatası:', error);
            this.showNotification('Ödeme formu açılamadı: ' + error.message, 'error');
        }
    }

    async handleAddFee(event) {
        event.preventDefault();
        
        const formData = {
            student_id: parseInt(document.getElementById('student-select').value),
            description: document.getElementById('fee-description').value.trim(),
            amount: parseFloat(document.getElementById('fee-amount').value),
            due_date: document.getElementById('fee-due-date').value
        };

        try {
            const response = await fetch('/api/student-fees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Aidat başarıyla eklendi!', 'success');
                this.hideModal('add-fee-modal');
                document.getElementById('add-fee-form').reset();
                await this.loadFees();
                await this.loadStats();
            } else {
                throw new Error(data.message || 'Aidat eklenemedi');
            }
        } catch (error) {
            console.error('❌ Aidat ekleme hatası:', error);
            this.showNotification('Aidat eklenemedi: ' + error.message, 'error');
        }
    }

    async handleBulkAssign(event) {
        event.preventDefault();
        
        const assignmentType = document.getElementById('assignment-type').value;
        const description = document.getElementById('bulk-description').value.trim();
        const amount = parseFloat(document.getElementById('bulk-amount').value);
        const dueDate = document.getElementById('bulk-due-date').value;
        
        let requestData = {
            description,
            amount,
            due_date: dueDate
        };

        if (assignmentType === 'class') {
            const selectedClasses = Array.from(document.querySelectorAll('#class-checkboxes input:checked'))
                .map(input => input.value);
            if (selectedClasses.length === 0) {
                this.showNotification('En az bir sınıf seçmelisiniz', 'error');
                return;
            }
            requestData.class_names = selectedClasses;
        } else if (assignmentType === 'selected') {
            const selectedStudents = Array.from(document.querySelectorAll('#student-checkboxes input:checked'))
                .map(input => parseInt(input.value));
            if (selectedStudents.length === 0) {
                this.showNotification('En az bir öğrenci seçmelisiniz', 'error');
                return;
            }
            requestData.student_ids = selectedStudents;
        }
        // For 'all', we don't need to add anything special

        try {
            const response = await fetch('/api/student-fees/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.hideModal('bulk-assign-modal');
                document.getElementById('bulk-assign-form').reset();
                await this.loadFees();
                await this.loadStats();
            } else {
                throw new Error(data.message || 'Toplu atama yapılamadı');
            }
        } catch (error) {
            console.error('❌ Toplu atama hatası:', error);
            this.showNotification('Toplu atama yapılamadı: ' + error.message, 'error');
        }
    }

    async handlePayment(event) {
        event.preventDefault();
        
        const formData = {
            fee_id: parseInt(document.getElementById('payment-fee-id').value),
            amount: parseFloat(document.getElementById('payment-amount').value),
            payment_date: document.getElementById('payment-date').value,
            payment_method: document.getElementById('payment-method').value,
            receipt_number: document.getElementById('payment-receipt').value.trim() || null,
            notes: document.getElementById('payment-notes').value.trim() || null,
            create_transaction: true
        };

        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Ödeme başarıyla kaydedildi!', 'success');
                this.hideModal('payment-modal');
                document.getElementById('payment-form').reset();
                await this.loadFees();
                await this.loadStats();
            } else {
                throw new Error(data.message || 'Ödeme kaydedilemedi');
            }
        } catch (error) {
            console.error('❌ Ödeme kaydetme hatası:', error);
            this.showNotification('Ödeme kaydedilemedi: ' + error.message, 'error');
        }
    }

    async deleteFee(id) {
        if (!confirm('Bu aidatı silmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            const response = await fetch(`/api/student-fees/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Aidat başarıyla silindi!', 'success');
                await this.loadFees();
                await this.loadStats();
            } else {
                throw new Error(data.message || 'Aidat silinemedi');
            }
        } catch (error) {
            console.error('❌ Aidat silme hatası:', error);
            this.showNotification('Aidat silinemedi: ' + error.message, 'error');
        }
    }

    async viewFeeDetails(id) {
        try {
            const response = await fetch(`/api/student-fees/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                const fee = data.data;
                alert(`Aidat Detayları:
                
Öğrenci: ${fee.first_name} ${fee.last_name} (${fee.student_number})
Sınıf: ${fee.class_name}${fee.section}
Açıklama: ${fee.description}
Tutar: ₺${fee.amount.toFixed(2)}
Son Ödeme Tarihi: ${this.formatDate(fee.due_date)}
Durum: ${this.getStatusText(fee.status)}
Ödenmiş Tutar: ₺${(fee.paid_amount || 0).toFixed(2)}
Kalan Tutar: ₺${(fee.amount - (fee.paid_amount || 0)).toFixed(2)}
Oluşturma Tarihi: ${this.formatDateTime(fee.created_at)}`);
            } else {
                throw new Error(data.message || 'Aidat detayları alınamadı');
            }
        } catch (error) {
            console.error('❌ Aidat detay hatası:', error);
            this.showNotification('Aidat detayları alınamadı: ' + error.message, 'error');
        }
    }

    getStatusText(status) {
        const statusTexts = {
            pending: 'Bekleyen',
            paid: 'Ödenmiş',
            overdue: 'Gecikmiş'
        };
        return statusTexts[status] || 'Belirsiz';
    }

    applyFilters() {
        this.filters = {
            search: document.getElementById('search').value.trim(),
            class_name: document.getElementById('class-filter').value,
            status: document.getElementById('status-filter').value,
            due_date_start: document.getElementById('date-start').value,
            due_date_end: document.getElementById('date-end').value
        };
        
        this.currentPage = 1;
        this.loadFees();
    }

    clearFilters() {
        document.getElementById('search').value = '';
        document.getElementById('class-filter').value = '';
        document.getElementById('status-filter').value = '';
        document.getElementById('date-start').value = '';
        document.getElementById('date-end').value = '';
        
        this.filters = {
            search: '',
            class_name: '',
            status: '',
            due_date_start: '',
            due_date_end: ''
        };
        
        this.currentPage = 1;
        this.loadFees();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadFees();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.loadFees();
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    hideAllModals() {
        ['add-fee-modal', 'bulk-assign-modal', 'payment-modal'].forEach(modalId => {
            document.getElementById(modalId).classList.add('hidden');
        });
        document.body.style.overflow = 'auto';
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        
        const typeStyles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        const icons = {
            success: 'ri-check-line',
            error: 'ri-error-warning-line',
            warning: 'ri-alarm-warning-line',
            info: 'ri-information-line'
        };
        
        notification.className = `notification ${typeStyles[type]} p-4 rounded-lg shadow-lg mb-4 flex items-center`;
        notification.innerHTML = `
            <i class="${icons[type]} text-lg mr-3"></i>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <i class="ri-close-line"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('tr-TR');
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('tr-TR');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async editFee(id) {
        // TODO: Implement edit functionality
        this.showNotification('Düzenleme özelliği yakında eklenecek', 'info');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.feesManager = new FeesManager();
});