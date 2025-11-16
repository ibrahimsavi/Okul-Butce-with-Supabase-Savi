-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    kullanici_adi VARCHAR(50) UNIQUE NOT NULL,
    sifre_hash TEXT NOT NULL,
    tam_ad VARCHAR(100) NOT NULL,
    eposta VARCHAR(100),
    aktif BOOLEAN DEFAULT true,
    son_giris TIMESTAMPTZ,
    olusturma_tarihi TIMESTAMPTZ DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_kullanici_adi ON users(kullanici_adi);

-- Insert default admin user
-- Username: admin
-- Password: admin123
-- (Password hash generated with bcrypt, 10 rounds)
INSERT INTO users (kullanici_adi, sifre_hash, tam_ad, eposta, aktif) 
VALUES (
    'admin',
    '$2b$10$SjaAvAZpalIlIVYNmz8mK.axTmua5xzflAx/NKh3tNkWYECsC4RgK',
    'Sistem Yöneticisi',
    'admin@savibudget.com',
    true
)
ON CONFLICT (kullanici_adi) DO NOTHING;

-- Note: For production, you should change the default password immediately after first login
-- To generate a new password hash, you can use the following Node.js code:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('your_password', 10);
-- console.log(hash);
