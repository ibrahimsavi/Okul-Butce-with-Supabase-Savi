const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initializeDatabase } = require('./database');

// Router'ları import et
const categoriesRouter = require('./routes/categories');
const transactionsRouter = require('./routes/transactions');
const studentsRouter = require('./routes/students');
const feesRouter = require('./routes/fees');
const paymentsRouter = require('./routes/payments');
const reportsRouter = require('./routes/reports');
const authRouter = require('./routes/auth');

// Middleware'ları import et
const { requireAuth } = require('./middleware/auth');

// Express uygulamasını oluştur
const app = express();
const PORT = parseInt(process.env.PORT) || 9876;

// Trust proxy (Cloudflare Tunnel + Coolify/Nginx arkasında çalıştığımız için gerekli)
app.set('trust proxy', true);

// Middleware'ler
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
// Note: Using MemoryStore for simplicity. For production with multiple instances,
// consider using Redis or another persistent session store.
app.use(session({
  secret: process.env.SESSION_SECRET || 'savi-butce-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Cloudflare Tunnel için gerekli
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none', // Cloudflare Tunnel için 'none' olmalı
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Public routes (login page and auth endpoints)
app.use('/api/auth', authRouter);

// Serve static files from public directory (login page is public)
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));

// Protect all other routes with authentication
app.use(requireAuth);

// Serve other static files (protected)
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

// API Router'larını bağla (protected)
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