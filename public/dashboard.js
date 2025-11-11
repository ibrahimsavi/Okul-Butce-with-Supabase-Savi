// Dashboard JavaScript dosyası
class Dashboard {
    constructor() {
        this.categories = [];
        this.monthlyTrendChart = null;
        this.categoryBreakdownChart = null;
        
        this.initializeEventListeners();
        this.loadInitialData();
        this.setCurrentDate();
        this.initializeMobileMenu();
    }

    // Event listener'ları başlat
    initializeEventListeners() {
        const quickAddForm = document.getElementById('quickAddForm');
        quickAddForm.addEventListener('submit', (e) => this.handleQuickAdd(e));
    }

    // Mobil menu işlemleri
    initializeMobileMenu() {
        const mobileMenuButton = document.getElementById('mobileMenuButton');
        const mobileMenu = document.getElementById('mobileMenu');
        
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Güncel tarihi ayarla
    setCurrentDate() {
        const today = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        document.getElementById('currentDate').textContent = 
            today.toLocaleDateString('tr-TR', options);
    }

    // Tüm başlangıç verilerini yükle
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadCategories(),
                this.loadStatistics(),
                this.loadRecentTransactions(),
                this.loadQuickStats()
            ]);
            
            await this.initializeCharts();
        } catch (error) {
            console.error('Dashboard verileri yüklenirken hata:', error);
            this.showMessage('Dashboard verileri yüklenirken bir hata oluştu.', 'error');
        }
    }

    // Kategorileri yükle
    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.categories = data.data || [];
            
        } catch (error) {
            console.error('Kategoriler yüklenirken hata:', error);
            this.categories = [];
        }
    }

    // İstatistikleri yükle
    async loadStatistics() {
        try {
            // Bu ay için başlangıç ve bitiş tarihleri
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            const params = new URLSearchParams({
                start_date: startOfMonth.toISOString().split('T')[0],
                end_date: endOfMonth.toISOString().split('T')[0]
            });

            const response = await fetch(`/api/transactions/stats/summary?${params}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.updateStatisticsDisplay(data.data);
            
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
            this.updateStatisticsDisplay({
                gelir: { total_amount: 0, transaction_count: 0 },
                gider: { total_amount: 0, transaction_count: 0 },
                net_balance: 0
            });
        }
    }

    // İstatistik göstergesini güncelle
    updateStatisticsDisplay(stats) {
        const income = stats.gelir || { total_amount: 0, transaction_count: 0 };
        const expense = stats.gider || { total_amount: 0, transaction_count: 0 };
        const netBalance = stats.net_balance || 0;

        // Net bakiye
        const netElement = document.getElementById('netBalance');
        netElement.textContent = `₺${this.formatNumber(netBalance)}`;
        netElement.className = `text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`;

        // Bu ay gelir
        document.getElementById('monthlyIncome').textContent = `₺${this.formatNumber(income.total_amount)}`;
        document.getElementById('incomeChange').textContent = `${income.transaction_count} işlem`;

        // Bu ay gider
        document.getElementById('monthlyExpense').textContent = `₺${this.formatNumber(expense.total_amount)}`;
        document.getElementById('expenseChange').textContent = `${expense.transaction_count} işlem`;

        // Bu ay işlem sayısı
        const totalTransactions = income.transaction_count + expense.transaction_count;
        document.getElementById('monthlyTransactions').textContent = totalTransactions;
    }

    // Son işlemleri yükle
    async loadRecentTransactions() {
        try {
            const response = await fetch('/api/transactions?limit=5&offset=0');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            const transactions = data.data || [];
            
            this.renderRecentTransactions(transactions);
            
        } catch (error) {
            console.error('Son işlemler yüklenirken hata:', error);
            this.renderRecentTransactions([]);
        }
    }

    // Son işlemleri göster
    renderRecentTransactions(transactions) {
        const container = document.getElementById('recentTransactions');
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-receipt text-gray-400 text-3xl mb-3"></i>
                    <p class="text-gray-600">Henüz işlem bulunmuyor</p>
                    <p class="text-gray-500 text-sm mt-1">İlk işlemi eklemek için yukarıdaki butonları kullanın</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(transaction => {
            const typeIcon = transaction.type === 'gelir' 
                ? '<i class="fas fa-arrow-up text-green-500 text-xs"></i>' 
                : '<i class="fas fa-arrow-down text-red-500 text-xs"></i>';
            
            const formattedAmount = this.formatNumber(transaction.amount);
            const amountColor = transaction.type === 'gelir' ? 'text-green-600' : 'text-red-600';
            const amountPrefix = transaction.type === 'gelir' ? '+' : '-';
            
            const formattedDate = new Date(transaction.transaction_date).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit'
            });

            return `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors duration-150">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        ${typeIcon}
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-gray-900 truncate">${transaction.description}</p>
                            <p class="text-xs text-gray-500">${transaction.category_name || 'Kategori Yok'}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-semibold ${amountColor}">${amountPrefix}₺${formattedAmount}</p>
                        <p class="text-xs text-gray-500">${formattedDate}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Hızlı istatistikleri yükle
    async loadQuickStats() {
        try {
            // Bugün için istatistikler
            const today = new Date().toISOString().split('T')[0];
            const todayResponse = await fetch(`/api/transactions?start_date=${today}&end_date=${today}`);
            const todayData = await todayResponse.json();
            const todayTransactions = todayData.data || [];
            
            // Kategori sayısı
            document.getElementById('totalCategories').textContent = this.categories.length;
            
            // Bugün işlem sayısı
            document.getElementById('todayTransactions').textContent = todayTransactions.length;
            
            // Ortalama işlem tutarı (son 30 gün)
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            const avgResponse = await fetch(`/api/transactions?start_date=${last30Days.toISOString().split('T')[0]}`);
            const avgData = await avgResponse.json();
            const allTransactions = avgData.data || [];
            
            if (allTransactions.length > 0) {
                const totalAmount = allTransactions.reduce((sum, t) => sum + t.amount, 0);
                const avgAmount = totalAmount / allTransactions.length;
                document.getElementById('avgTransaction').textContent = `₺${this.formatNumber(avgAmount)}`;
            } else {
                document.getElementById('avgTransaction').textContent = '₺0.00';
            }
            
            // En çok kullanılan kategori
            this.findTopCategory(allTransactions);
            
        } catch (error) {
            console.error('Hızlı istatistikler yüklenirken hata:', error);
            document.getElementById('todayTransactions').textContent = '0';
            document.getElementById('avgTransaction').textContent = '₺0.00';
            document.getElementById('topCategory').textContent = '-';
        }
    }

    // En çok kullanılan kategoriyi bul
    findTopCategory(transactions) {
        if (transactions.length === 0) {
            document.getElementById('topCategory').textContent = '-';
            return;
        }

        const categoryCount = {};
        transactions.forEach(t => {
            const categoryName = t.category_name || 'Bilinmeyen';
            categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
        });

        const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('topCategory').textContent = `${topCategory[0]} (${topCategory[1]})`;
    }

    // Grafikleri başlat
    async initializeCharts() {
        await Promise.all([
            this.initializeMonthlyTrendChart(),
            this.initializeCategoryBreakdownChart()
        ]);
    }

    // Aylık trend grafiği
    async initializeMonthlyTrendChart() {
        try {
            // Son 6 ay verisi
            const monthData = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                
                const params = new URLSearchParams({
                    start_date: startOfMonth.toISOString().split('T')[0],
                    end_date: endOfMonth.toISOString().split('T')[0]
                });

                const response = await fetch(`/api/transactions/stats/summary?${params}`);
                const data = await response.json();
                
                monthData.push({
                    month: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
                    income: data.data?.gelir?.total_amount || 0,
                    expense: data.data?.gider?.total_amount || 0
                });
            }

            const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
            this.monthlyTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: monthData.map(m => m.month),
                    datasets: [
                        {
                            label: 'Gelir',
                            data: monthData.map(m => m.income),
                            borderColor: 'rgb(34, 197, 94)',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Gider',
                            data: monthData.map(m => m.expense),
                            borderColor: 'rgb(239, 68, 68)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₺' + value.toLocaleString('tr-TR');
                                }
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Aylık trend grafiği yüklenirken hata:', error);
        }
    }

    // Kategori dağılım grafiği
    async initializeCategoryBreakdownChart() {
        try {
            // Bu ay kategorilere göre toplam
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            const params = new URLSearchParams({
                start_date: startOfMonth.toISOString().split('T')[0],
                end_date: endOfMonth.toISOString().split('T')[0],
                limit: 1000 // Tüm işlemleri al
            });

            const response = await fetch(`/api/transactions?${params}`);
            const data = await response.json();
            const transactions = data.data || [];
            
            // Kategorilere göre grupla
            const categoryTotals = {};
            transactions.forEach(transaction => {
                const categoryName = transaction.category_name || 'Diğer';
                if (!categoryTotals[categoryName]) {
                    categoryTotals[categoryName] = 0;
                }
                categoryTotals[categoryName] += transaction.amount;
            });

            const labels = Object.keys(categoryTotals);
            const values = Object.values(categoryTotals);
            const colors = [
                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
            ];

            const ctx = document.getElementById('categoryBreakdownChart').getContext('2d');
            this.categoryBreakdownChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.slice(0, labels.length),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Kategori dağılım grafiği yüklenirken hata:', error);
        }
    }

    // Hızlı işlem ekleme modalını göster
    showQuickAddModal(type) {
        const modal = document.getElementById('quickAddModal');
        const title = document.getElementById('quickAddTitle');
        const typeInput = document.getElementById('quickType');
        const categorySelect = document.getElementById('quickCategory');
        
        typeInput.value = type;
        title.textContent = type === 'gelir' ? 'Hızlı Gelir Ekle' : 'Hızlı Gider Ekle';
        
        // Kategorileri filtrele ve yükle
        categorySelect.innerHTML = '<option value="">Kategori seçiniz</option>';
        const filteredCategories = this.categories.filter(cat => cat.type === type);
        
        filteredCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Form resetle
        document.getElementById('quickAddForm').reset();
        typeInput.value = type; // Reset sonrası tekrar ayarla
    }

    // Hızlı işlem ekleme modalını gizle
    hideQuickAddModal() {
        const modal = document.getElementById('quickAddModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // Hızlı işlem ekleme form gönderimi
    async handleQuickAdd(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const transactionData = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description').trim(),
            category_id: parseInt(formData.get('category_id')),
            transaction_date: new Date().toISOString().split('T')[0] // Bugün
        };

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'İşlem başarısız');
            }

            this.showMessage('İşlem başarıyla eklendi!', 'success');
            this.hideQuickAddModal();
            
            // Dashboard'u yenile
            await this.loadInitialData();

        } catch (error) {
            console.error('Hızlı işlem ekleme hatası:', error);
            this.showMessage(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    }

    // Sayı formatlama
    formatNumber(number) {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
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

// Dashboard'u başlat
const dashboard = new Dashboard();

// Global fonksiyonlar (HTML'den çağrılabilir)
window.showQuickAddModal = (type) => dashboard.showQuickAddModal(type);
window.hideQuickAddModal = () => dashboard.hideQuickAddModal();
window.dashboard = dashboard;