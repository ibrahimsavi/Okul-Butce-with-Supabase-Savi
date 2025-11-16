# Savi Bütçe v.1 - Hızlı Başlangıç

## 📦 Gereksinimler

- Node.js 20+
- Supabase hesabı
- Git

## 🚀 Kurulum

### 1. Projeyi İndirin

```bash
git clone https://github.com/ibrahimsavi/savi-budget-supabase.git
cd savi-budget-supabase
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Environment Variables Ayarlayın

`.env.example` dosyasını kopyalayıp `.env` oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
PORT=9876
NODE_ENV=development
SESSION_SECRET=your-random-secret-key
```

**Session Secret Oluşturmak:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Supabase Veritabanını Hazırlayın

Supabase Dashboard → SQL Editor'de şu dosyaları sırayla çalıştırın:

1. **`supabase/reset_schema.sql`** - Ana tabloları oluşturur
2. **`supabase/add_users_table.sql`** - Kullanıcı tablosu ve admin hesabı

### 5. Sunucuyu Başlatın

```bash
npm start
```

Sunucu başladığında:
- URL: http://localhost:9876
- Health: http://localhost:9876/health

### 6. Giriş Yapın

- Kullanıcı Adı: **admin**
- Şifre: **admin123**

⚠️ **İlk girişte mutlaka şifrenizi değiştirin!** (Ana sayfa → Şifre Değiştir)

## 🐳 Docker ile Çalıştırma

```bash
# Build
docker build -t savi-budget .

# Run
docker run -d \
  -p 9876:9876 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_KEY=your_key \
  -e SESSION_SECRET=your_secret \
  -e NODE_ENV=production \
  -e PORT=9876 \
  --name savi-budget \
  savi-budget
```

## ☁️ Coolify Deployment

Detaylı bilgi için: [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)

Kısaca:
1. GitHub repo'yu Coolify'a bağlayın
2. Dockerfile seçin
3. Environment variables ekleyin
4. Port: 9876
5. Deploy!

## 📚 Özellikler

- ✅ Kullanıcı girişi ve oturum yönetimi
- ✅ Gelir/Gider takibi
- ✅ Öğrenci yönetimi
- ✅ Aidat yönetimi
- ✅ Ödeme takibi
- ✅ Excel rapor çıktısı
- ✅ Modern ve responsive arayüz
- ✅ Supabase PostgreSQL veritabanı

## 🔒 Güvenlik

- Bcrypt şifre hashleme
- Session-based authentication
- HTTP-only cookies
- HTTPS desteği
- Protected API routes

## 📖 Daha Fazla Bilgi

- [AUTH_SETUP.md](./AUTH_SETUP.md) - Authentication detayları
- [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md) - Deployment rehberi
- [README.md](./README.md) - Proje dokümantasyonu

## 🆘 Destek

Sorun yaşarsanız:
1. `npm start` çıktısını kontrol edin
2. Browser console'u kontrol edin
3. Supabase logs'a bakın
4. GitHub Issues açın

## 📝 Lisans

ISC License
