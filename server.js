const express = require('express');
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
const adminRouter = require('./routes/admin');

// Middleware'ları import et
const { requireAuth } = require('./middleware/auth');
const { requestSecurity, sessionOptions } = require('./middleware/security');

// Express uygulamasını oluştur
const app = express();
const PORT = parseInt(process.env.PORT) || 9876;
const options = sessionOptions(process.env);
// Only trust explicitly configured proxy IPs/CIDRs; never trust arbitrary headers.
app.set('trust proxy', process.env.TRUST_PROXY ? process.env.TRUST_PROXY.split(',').map(value => value.trim()) : false);
app.disable('x-powered-by');
app.use(requestSecurity);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
if (process.env.DATABASE_URL) {
  const PgStore = require('connect-pg-simple')(session);
  options.store = new PgStore({ conString: process.env.DATABASE_URL, schemaName: 'private', createTableIfMissing: true });
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL is required for persistent production sessions');
}
app.use(session(options));
app.get('/health', (req, res) => res.json({ ok: true }));
// These shared presentation assets contain no private data.
for (const asset of ['theme.css', 'theme.js', 'safe-html.js']) {
  app.get('/' + asset, (req, res) => res.sendFile(path.join(__dirname, 'public', asset)));
}

// Public routes (login page and auth endpoints)
app.use('/api/auth', authRouter);

// Serve static files from public directory (login page is public)
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));

// Protect all other routes with authentication
app.use(requireAuth);

// Serve other static files (protected)
app.use(express.static(path.join(__dirname, 'public')));

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
app.use('/api/admin', adminRouter);

// Hata yakalama middleware
app.use((err, req, res, next) => {
  console.error('Hata:', err.stack);
  res.status(err.status === 400 ? 400 : err.status === 413 ? 413 : 500).json({
    error: 'Sunucu hatası',
    message: 'İstek işlenemedi'
  });
});

// Sunucuyu başlat
async function startServer() {
  try {
    // Veritabanını başlat
    if (!await initializeDatabase()) throw new Error('Veritabanı bağlantısı doğrulanamadı');
    
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
if (require.main === module) startServer();

module.exports = app;
