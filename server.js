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
const adminRouter = require('./routes/admin');

// Middleware'ları import et
const { requireAuth } = require('./middleware/auth');

// Express uygulamasını oluştur
const app = express();
const PORT = parseInt(process.env.PORT) || 9876;
const SESSION_COOKIE_SECURE = (process.env.SESSION_COOKIE_SECURE || 'false').toLowerCase() === 'true';
const SESSION_COOKIE_SAMESITE = process.env.SESSION_COOKIE_SAMESITE || 'lax';

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

// Cloudflare Tunnel x-forwarded-proto düzeltmesi
// Cloudflare Tunnel origin'e HTTP üzerinden bağlanır, bu yüzden x-forwarded-proto 'http' gelir.
// CF-Visitor header'ından gerçek protocol'ü alıp düzeltiyoruz.
app.use((req, res, next) => {
  // CF-Visitor header'ı Cloudflare tarafından eklenir: {"scheme":"https"}
  const cfVisitor = req.headers['cf-visitor'];
  if (cfVisitor) {
    try {
      const visitor = JSON.parse(cfVisitor);
      if (visitor.scheme === 'https') {
        req.headers['x-forwarded-proto'] = 'https';
      }
    } catch (e) {
      // JSON parse hatası, devam et
    }
  }
  // CF-Connecting-IP varsa Cloudflare arkasındayız, proto'yu https yap
  else if (req.headers['cf-connecting-ip']) {
    req.headers['x-forwarded-proto'] = 'https';
  }
  next();
});

// Session configuration
// Note: Using MemoryStore for simplicity. For production with multiple instances,
// consider using Redis or another persistent session store.
app.use(session({
  secret: process.env.SESSION_SECRET || 'savi-butce-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Cloudflare Tunnel için gerekli
  cookie: {
    secure: SESSION_COOKIE_SECURE,
    httpOnly: true,
    sameSite: SESSION_COOKIE_SAMESITE,
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
app.use('/api/admin', adminRouter);

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