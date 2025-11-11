const { initializeDatabase } = require('./database.js');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Test database
async function startServer() {
    console.log('🚀 Savi Bütçe v.1 - Supabase Edition başlatılıyor...');
    
    const dbReady = await initializeDatabase();
    if (!dbReady) {
        console.log('💡 Lütfen Supabase Dashboard\'da tabloları oluşturun ve tekrar deneyin.');
        return;
    }

    // Routes
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/api/health', (req, res) => {
        res.json({ 
            status: 'OK', 
            database: 'Supabase PostgreSQL',
            timestamp: new Date().toISOString()
        });
    });

    app.listen(PORT, () => {
        console.log(`✅ Server http://localhost:${PORT} adresinde çalışıyor`);
        console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
    });
}

startServer().catch(console.error);