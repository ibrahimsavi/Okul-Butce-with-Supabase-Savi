const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database');

// Router'ları import et
const categoriesRouter = require('./routes/categories');
const transactionsRouter = require('./routes/transactions');
const studentsRouter = require('./routes/students');
const feesRouter = require('./routes/fees');
const paymentsRouter = require('./routes/payments');
const reportsRouter = require('./routes/reports');

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Kök yol: statik index.html'i gönder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Basit health endpoint (container orkestrasyonu için)
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'gelir-gider-api', timestamp: new Date().toISOString() });
});

// API sağlık kontrolü
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gelir-gider-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Router'larını bağla
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/student-fees', feesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reports', reportsRouter);

// Hata yakalama middleware
app.use((err, req, res, next) => {
  console.error('Hata:', err.stack);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: err.message
  });
});

// Sunucuyu başlat
async function startServer() {
  try {
    // Veritabanını başlat
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
      console.log(`📊 API Sağlık kontrolü: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Sunucu başlatma hatası:', error);
    process.exit(1);
  }
}

// Sunucuyu başlat
startServer();

module.exports = app;