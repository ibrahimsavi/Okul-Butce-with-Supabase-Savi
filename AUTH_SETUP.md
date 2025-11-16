# Kullanıcı Girişi Sistemi - Kurulum Özeti

## ✅ Yapılan Değişiklikler

### 1. Yeni Bağımlılıklar Eklendi
- `express-session` - Oturum yönetimi
- `bcryptjs` - Şifre hashleme
- `cookie-parser` - Cookie yönetimi

### 2. Yeni Dosyalar Oluşturuldu

#### Backend
- `routes/auth.js` - Login/logout endpoints
- `middleware/auth.js` - Authentication middleware (overwrite edildi, önceki dosya yerine)
- `supabase/add_users_table.sql` - Users tablosu ve admin kullanıcı

#### Frontend
- `public/login.html` - Modern login sayfası

#### Deployment
- `COOLIFY_DEPLOYMENT.md` - Coolify deployment rehberi
- Güncellenmiş `Dockerfile` - Health check eklendi
- Güncellenmiş `.env.example` - SESSION_SECRET eklendi

### 3. Güncellenen Dosyalar
- `server.js` - Session middleware ve auth routes eklendi
- `public/index.html` - Çıkış butonu eklendi
- `README.md` - Kurulum ve kullanım bilgileri güncellendi
- `.env` - SESSION_SECRET eklendi

## 🔐 Varsayılan Giriş Bilgileri

**Kullanıcı Adı:** `admin`  
**Şifre:** `admin123`

⚠️ **ÖNEMLİ:** İlk girişten sonra mutlaka şifrenizi değiştirin! 
- Ana sayfada "Şifre Değiştir" linkine tıklayın
- Veya `/sifre-degistir.html` sayfasına gidin

## 📝 Supabase SQL Çalıştırma

Supabase Dashboard'a gidin ve SQL Editor'de şu dosyayı çalıştırın:

```sql
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
INSERT INTO users (kullanici_adi, sifre_hash, tam_ad, eposta, aktif) 
VALUES (
    'admin',
    '$2b$10$SjaAvAZpalIlIVYNmz8mK.axTmua5xzflAx/NKh3tNkWYECsC4RgK',
    'Sistem Yöneticisi',
    'admin@savibudget.com',
    true
)
ON CONFLICT (kullanici_adi) DO NOTHING;
```

Bu SQL kodu `supabase/add_users_table.sql` dosyasında da bulunuyor.

## 🧪 Test Adımları

1. **SQL'i Çalıştırın:**
   - Supabase Dashboard → SQL Editor'a gidin
   - Yukarıdaki SQL'i yapıştırıp çalıştırın
   - "Success. No rows returned" mesajını görmelisiniz

2. **Sunucuyu Başlatın:**
   ```bash
   npm start
   ```

3. **Login Sayfasına Gidin:**
   - Tarayıcıda `http://localhost:3000` adresine gidin
   - Otomatik olarak `/login.html`'e yönlendirileceksiniz

4. **Giriş Yapın:**
   - Kullanıcı adı: `admin`
   - Şifre: `admin123`
   - "Giriş Yap" butonuna tıklayın

5. **Ana Sayfaya Yönlendirileceksiniz:**
   - Sağ üstte "Çıkış" butonu görünmeli
   - Tüm sayfalar artık korunuyor

## 🔒 Güvenlik Özellikleri

- ✅ Bcrypt ile şifre hashleme (10 rounds)
- ✅ Session-based authentication
- ✅ HTTP-only cookies
- ✅ Protected routes (tüm API ve sayfalar)
- ✅ Public login page
- ✅ Session timeout (24 saat)
- ✅ HTTPS cookie support (production)

## 👥 Yeni Kullanıcı Ekleme

### Yöntem 1: SQL ile

```sql
-- Önce Node.js ile şifre hash'i oluşturun:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yeni_sifre', 10).then(h => console.log(h));"

INSERT INTO users (kullanici_adi, sifre_hash, tam_ad, eposta, aktif) 
VALUES (
    'kullanici_adi',
    'bcrypt_hash_buraya_yapistirin',
    'Kullanıcı Adı Soyadı',
    'email@example.com',
    true
);
```

### Yöntem 2: Node.js Script

```javascript
const bcrypt = require('bcryptjs');
const { supabase } = require('./database');

async function createUser(username, password, fullName, email) {
    const hash = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
        .from('users')
        .insert({
            kullanici_adi: username,
            sifre_hash: hash,
            tam_ad: fullName,
            eposta: email,
            aktif: true
        });
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('User created successfully!');
    }
}

// Kullanım:
createUser('yenikullanici', 'sifre123', 'Yeni Kullanıcı', 'yeni@example.com');
```

## 🚀 Coolify Deployment

Detaylı bilgi için `COOLIFY_DEPLOYMENT.md` dosyasına bakın.

Kısaca:
1. GitHub repo'nuzu Coolify'a bağlayın
2. Environment variables'ları ayarlayın (özellikle SESSION_SECRET!)
3. Port: 3000
4. Deploy!

## 🔧 Sorun Giderme

### "Kullanıcı adı veya şifre hatalı" Hatası
- SQL dosyasını çalıştırdığınızdan emin olun
- Supabase'de `users` tablosunun var olduğunu kontrol edin:
  ```sql
  SELECT * FROM users;
  ```

### Login sayfası görünmüyor
- Server'ın çalıştığından emin olun
- Browser console'da hata kontrolü yapın
- `http://localhost:3000/login.html` direkt deneyin

### Session kaybolması
- SESSION_SECRET'ın .env dosyasında olduğundan emin olun
- Cookie'lerin aktif olduğunu kontrol edin

### Çıkış çalışmıyor
- Browser console'da hata kontrol edin
- `/api/auth/logout` endpoint'ine POST isteği gönderildiğinden emin olun

## 📚 API Endpoints

### Public (Authentication gerektirmez)
- `POST /api/auth/login` - Login
- `GET /api/auth/session` - Check session
- `GET /health` - Health check

### Protected (Authentication gerektirir)
- `POST /api/auth/logout` - Logout
- `GET /api/categories` - List categories
- `GET /api/students` - List students
- `GET /api/transactions` - List transactions
- `GET /api/student-fees` - List fees
- `GET /api/payments` - List payments
- `GET /api/reports/*` - All reports
- ... ve diğer tüm API endpoints

## 🎉 Tamamlandı!

Artık projenizde:
- ✅ Güvenli kullanıcı girişi var
- ✅ Oturum yönetimi aktif
- ✅ Tüm sayfalar korunuyor
- ✅ Coolify'da deploy edilmeye hazır
- ✅ Production ready

Sorularınız için README.md dosyasına veya COOLIFY_DEPLOYMENT.md'ye bakın.
