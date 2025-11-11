// Raporlar JavaScript dosyası
class ReportsManager {
    constructor() {
        this.monthlyTrendChart = null;
        this.categoryDistributionChart = null;
        this.currentStartDate = null;
        this.currentEndDate = null;
        
        this.initializeEventListeners();
        this.setDefaultDates();
        this.loadInitialData();
        this.initializeMobileMenu();
    }

    // Event listener'ları başlat
    initializeEventListeners() {
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const reportType = document.getElementById('reportType');

        startDate.addEventListener('change', () => this.onDateChange());
        endDate.addEventListener('change', () => this.onDateChange());
        reportType.addEventListener('change', () => this.onReportTypeChange());
    }

    // Mobil menu işlemleri
    initializeMobileMenu() {
        const mobileMenuButton = document.getElementById('mobileMenuButton');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }

    // Varsayılan tarihleri ayarla (son 30 gün)
    setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
        
        this.currentStartDate = thirtyDaysAgo.toISOString().split('T')[0];
        this.currentEndDate = today.toISOString().split('T')[0];
    }

    // Tarih değişiminde
    onDateChange() {
        this.currentStartDate = document.getElementById('startDate').value;
        this.currentEndDate = document.getElementById('endDate').value;
    }

    // Rapor türü değişiminde
    onReportTypeChange() {
        const reportType = document.getElementById('reportType').value;
        this.showReportSections(reportType);
    }

    // Rapor bölümlerini göster/gizle
    showReportSections(type) {
        const sections = {
            'financialReport': ['all', 'financial'].includes(type),
            'studentReport': ['all', 'students'].includes(type),
            'feeReport': ['all', 'fees'].includes(type)
        };

        Object.keys(sections).forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.style.display = sections[sectionId] ? 'block' : 'none';
            }
        });
    }

    // İlk veri yükleme
    async loadInitialData() {
        await this.generateReports();
    }

    // Raporları oluştur
    async generateReports() {
        try {
            this.showLoadingModal();
            
            // Paralel olarak tüm verileri yükle
            const [summaryData, monthlyData, categoryData, studentData, feeData] = await Promise.all([
                this.loadSummaryData(),
                this.loadMonthlyTrendData(),
                this.loadCategoryData(),
                this.loadStudentData(),
                this.loadFeeData()
            ]);

            // UI'yi güncelle
            this.updateSummaryStats(summaryData);
            this.updateMonthlyTrendChart(monthlyData);
            this.updateCategoryChart(categoryData);
            this.updateFinancialReport(categoryData);
            this.updateStudentReport(studentData);
            this.updateFeeReport(feeData);

            this.hideLoadingModal();
            this.showMessage('Raporlar başarıyla oluşturuldu!', 'success');

        } catch (error) {
            console.error('Rapor oluşturma hatası:', error);
            this.hideLoadingModal();
            this.showMessage('Raporlar oluşturulurken bir hata oluştu.', 'error');
        }
    }

    // Özet verileri yükle
    async loadSummaryData() {
        const response = await fetch(`/api/transactions/stats/summary?start_date=${this.currentStartDate}&end_date=${this.currentEndDate}`);
        if (!response.ok) throw new Error('Özet veriler alınamadı');
        const data = await response.json();
        return data.data;
    }

    // Aylık trend verileri yükle
    async loadMonthlyTrendData() {
        try {
            const response = await fetch(`/api/transactions?start_date=${this.currentStartDate}&end_date=${this.currentEndDate}&limit=1000`);
            if (!response.ok) throw new Error('İşlem verileri alınamadı');
            const data = await response.json();
            
            return this.processMonthlyData(data.data || []);
        } catch (error) {
            console.error('Aylık trend veri hatası:', error);
            return { labels: [], income: [], expense: [] };
        }
    }

    // Aylık verileri işle
    processMonthlyData(transactions) {
        const monthlyData = {};
        
        transactions.forEach(transaction => {
            const month = transaction.transaction_date.substring(0, 7); // YYYY-MM
            
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0 };
            }
            
            if (transaction.type === 'gelir') {
                monthlyData[month].income += parseFloat(transaction.amount);
            } else {
                monthlyData[month].expense += parseFloat(transaction.amount);
            }
        });

        const labels = Object.keys(monthlyData).sort();
        const income = labels.map(month => monthlyData[month].income);
        const expense = labels.map(month => monthlyData[month].expense);

        return { labels, income, expense };
    }

    // Kategori verileri yükle
    async loadCategoryData() {
        try {
            const [categoriesResponse, transactionsResponse] = await Promise.all([
                fetch('/api/categories'),
                fetch(`/api/transactions?start_date=${this.currentStartDate}&end_date=${this.currentEndDate}&limit=1000`)
            ]);

            if (!categoriesResponse.ok || !transactionsResponse.ok) {
                throw new Error('Kategori verileri alınamadı');
            }

            const categoriesData = await categoriesResponse.json();
            const transactionsData = await transactionsResponse.json();

            return this.processCategoryData(categoriesData.data, transactionsData.data || []);
        } catch (error) {
            console.error('Kategori veri hatası:', error);
            return [];
        }
    }

    // Kategori verilerini işle
    processCategoryData(categories, transactions) {
        const categoryStats = {};
        let totalAmount = 0;

        // Kategorileri başlat
        categories.forEach(category => {
            categoryStats[category.id] = {
                name: category.name,
                type: category.type,
                amount: 0,
                count: 0
            };
        });

        // İşlemleri kategorilere göre grupla
        transactions.forEach(transaction => {
            const categoryId = transaction.category_id;
            if (categoryStats[categoryId]) {
                categoryStats[categoryId].amount += parseFloat(transaction.amount);
                categoryStats[categoryId].count++;
                totalAmount += parseFloat(transaction.amount);
            }
        });

        // Yüzdeleri hesapla
        const result = Object.values(categoryStats).map(stat => ({
            ...stat,
            percentage: totalAmount > 0 ? ((stat.amount / totalAmount) * 100).toFixed(1) : 0
        }));

        return result.filter(stat => stat.amount > 0);
    }

    // Öğrenci verileri yükle
    async loadStudentData() {
        try {
            const [studentsResponse, feesResponse] = await Promise.all([
                fetch('/api/students'),
                fetch('/api/student-fees')
            ]);

            if (!studentsResponse.ok || !feesResponse.ok) {
                throw new Error('Öğrenci verileri alınamadı');
            }

            const studentsData = await studentsResponse.json();
            const feesData = await feesResponse.json();

            return this.processStudentData(studentsData.data || [], feesData.data || []);
        } catch (error) {
            console.error('Öğrenci veri hatası:', error);
            return { total: 0, paid: 0, debt: 0 };
        }
    }

    // Öğrenci verilerini işle
    processStudentData(students, fees) {
        const studentPaymentStatus = {};
        
        // Öğrenci durumlarını başlat
        students.forEach(student => {
            studentPaymentStatus[student.id] = { hasPaid: false, hasDebt: false };
        });

        // Aidat durumlarını kontrol et
        fees.forEach(fee => {
            const studentId = fee.student_id;
            if (studentPaymentStatus[studentId]) {
                if (fee.status === 'paid') {
                    studentPaymentStatus[studentId].hasPaid = true;
                } else if (fee.status === 'pending' || fee.status === 'overdue') {
                    studentPaymentStatus[studentId].hasDebt = true;
                }
            }
        });

        const total = students.length;
        const paid = Object.values(studentPaymentStatus).filter(status => status.hasPaid && !status.hasDebt).length;
        const debt = Object.values(studentPaymentStatus).filter(status => status.hasDebt).length;

        return { total, paid, debt };
    }

    // Aidat verileri yükle
    async loadFeeData() {
        try {
            const response = await fetch('/api/student-fees');
            if (!response.ok) throw new Error('Aidat verileri alınamadı');
            const data = await response.json();
            
            return this.processFeeData(data.data || []);
        } catch (error) {
            console.error('Aidat veri hatası:', error);
            return { pending: 0, paid: 0, overdue: 0, rate: 0 };
        }
    }

    // Aidat verilerini işle
    processFeeData(fees) {
        const stats = {
            pending: 0,
            paid: 0,
            overdue: 0
        };

        fees.forEach(fee => {
            stats[fee.status] += parseFloat(fee.amount);
        });

        const total = stats.pending + stats.paid + stats.overdue;
        const rate = total > 0 ? ((stats.paid / total) * 100).toFixed(1) : 0;

        return { ...stats, rate };
    }

    // Özet istatistikleri güncelle
    updateSummaryStats(data) {
        document.getElementById('totalIncome').textContent = `₺${this.formatNumber(data.gelir?.total_amount || 0)}`;
        document.getElementById('totalExpense').textContent = `₺${this.formatNumber(data.gider?.total_amount || 0)}`;
        document.getElementById('netBalance').textContent = `₺${this.formatNumber(data.net_balance || 0)}`;
        
        const totalTransactions = (data.gelir?.transaction_count || 0) + (data.gider?.transaction_count || 0);
        document.getElementById('totalTransactions').textContent = totalTransactions.toString();
    }

    // Aylık trend grafiğini güncelle
    updateMonthlyTrendChart(data) {
        const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
        
        if (this.monthlyTrendChart) {
            this.monthlyTrendChart.destroy();
        }

        const labels = data.labels.map(label => {
            const [year, month] = label.split('-');
            return new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
        });

        this.monthlyTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Gelir',
                        data: data.income,
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Gider',
                        data: data.expense,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
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
    }

    // Kategori dağılım grafiğini güncelle
    updateCategoryChart(data) {
        const ctx = document.getElementById('categoryDistributionChart').getContext('2d');
        
        if (this.categoryDistributionChart) {
            this.categoryDistributionChart.destroy();
        }

        const labels = data.map(item => item.name);
        const amounts = data.map(item => item.amount);
        const colors = data.map(item => item.type === 'gelir' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)');

        this.categoryDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: amounts,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                return `${label}: ₺${value.toLocaleString('tr-TR')}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Mali raporu güncelle
    updateFinancialReport(data) {
        const tbody = document.getElementById('financialReportBody');
        tbody.innerHTML = '';

        data.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const typeBadge = item.type === 'gelir'
                ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Gelir</span>'
                : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Gider</span>';

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${typeBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₺${this.formatNumber(item.amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${item.count}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">%${item.percentage}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    // Öğrenci raporunu güncelle
    updateStudentReport(data) {
        document.getElementById('totalStudents').textContent = data.total.toString();
        document.getElementById('paidStudents').textContent = data.paid.toString();
        document.getElementById('debtStudents').textContent = data.debt.toString();
    }

    // Aidat raporunu güncelle
    updateFeeReport(data) {
        document.getElementById('pendingFees').textContent = `₺${this.formatNumber(data.pending)}`;
        document.getElementById('paidFees').textContent = `₺${this.formatNumber(data.paid)}`;
        document.getElementById('overdueFees').textContent = `₺${this.formatNumber(data.overdue)}`;
        document.getElementById('collectionRate').textContent = `%${data.rate}`;
    }

    // Rapor export işlemi
    async exportReport(type) {
        try {
            this.showMessage('Rapor hazırlanıyor...', 'info');
            
            let url = '';
            switch(type) {
                case 'financial':
                    url = `/api/reports/financial?start_date=${this.currentStartDate}&end_date=${this.currentEndDate}`;
                    break;
                case 'students':
                    url = '/api/reports/students';
                    break;
                case 'fees':
                    url = '/api/reports/fees';
                    break;
                default:
                    throw new Error('Geçersiz rapor türü');
            }

            // Excel dosyasını indir
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Rapor indirilemedi');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${type}_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            this.showMessage(`${type.toUpperCase()} raporu Excel olarak indirildi!`, 'success');
            
        } catch (error) {
            console.error('Export hatası:', error);
            this.showMessage('Rapor indirme işlemi başarısız: ' + error.message, 'error');
        }
    }

    // Loading modal göster
    showLoadingModal() {
        document.getElementById('loadingModal').classList.remove('hidden');
        document.getElementById('loadingModal').classList.add('flex');
    }

    // Loading modal gizle
    hideLoadingModal() {
        document.getElementById('loadingModal').classList.add('hidden');
        document.getElementById('loadingModal').classList.remove('flex');
    }

    // Sayı formatlama
    formatNumber(number) {
        return parseFloat(number).toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
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

// Rapor yöneticisini başlat
const reportsManager = new ReportsManager();

// Global fonksiyonlar (HTML'den çağrılabilir)
window.generateReports = () => reportsManager.generateReports();
window.exportReport = (type) => reportsManager.exportReport(type);
window.reportsManager = reportsManager;