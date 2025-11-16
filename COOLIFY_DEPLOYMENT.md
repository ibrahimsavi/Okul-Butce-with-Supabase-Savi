# Coolify deployment için gerekli dosyalar

## Ortam Değişkenleri (.env)

Coolify'da projenizi deploy ederken aşağıdaki environment variables'ları ayarlamanız gerekiyor:

```env
# Supabase Configuration
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Server Configuration
PORT=9876
NODE_ENV=production

# Session Secret (güvenli bir random string kullanın)
SESSION_SECRET=your-very-secure-random-string-here
```

## Coolify Deployment Adımları

### 1. Supabase Veritabanı Kurulumu

Supabase Dashboard'da SQL Editor'e gidin ve aşağıdaki SQL dosyalarını sırayla çalıştırın:

1. `supabase/reset_schema.sql` - Ana tabloları oluşturur
2. `supabase/add_users_table.sql` - Kullanıcı authentication tablosu

**Varsayılan Giriş Bilgileri:**
- Kullanıcı Adı: `admin`
- Şifre: `admin123`

⚠️ **ÖNEMLİ:** İlk girişten sonra yönetici şifresini mutlaka değiştirin!

### 2. Coolify'da Proje Oluşturma

1. Coolify dashboard'a giriş yapın
2. "New Resource" > "Application" seçin
3. GitHub repository'nizi bağlayın
   - Repository URL: `https://github.com/ibrahimsavi/savi-budget-supabase`
   - Branch: `main`
4. Build Pack olarak **"Dockerfile"** seçin
5. Dockerfile path: `Dockerfile` (varsayılan)

### 3. Environment Variables Ayarları

Coolify'da projenizin "Environment Variables" bölümüne yukarıdaki değişkenleri ekleyin.

**SESSION_SECRET oluşturmak için:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Port Ayarları

- **Container Port:** 9876
- **Public Port:** 80 veya 443 (HTTPS için)

### 5. Health Check Ayarları

- **Health Check Endpoint:** `/health`
- **Health Check Interval:** 30s
- **Timeout:** 3s
- **Start Period:** 5s
- **Retries:** 3

### 6. Deploy

"Deploy" butonuna tıklayın. İlk build birkaç dakika sürebilir.

## Güvenlik Notları

1. **Şifre Değiştirme:**
   - İlk girişten sonra admin şifresini değiştirin
   - Yeni kullanıcılar ekleyin
   - Varsayılan admin hesabını devre dışı bırakabilirsiniz

2. **HTTPS:**
   - Coolify otomatik olarak Let's Encrypt SSL sertifikası sağlar
   - Domain adınızı Coolify'da yapılandırın

3. **Session Secret:**
   - Production'da mutlaka güçlü ve benzersiz bir secret kullanın
   - Secret'ı asla kodda saklamayın, sadece environment variable olarak

## Yeni Kullanıcı Ekleme

Supabase SQL Editor'de yeni kullanıcı eklemek için:

```sql
-- Önce şifre hash'i oluşturun (Node.js):
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('yeni_sifre', 10);

INSERT INTO users (kullanici_adi, sifre_hash, tam_ad, eposta, aktif) 
VALUES (
    'kullanici_adi',
    'bcrypt_hash_buraya',
    'Tam Adı',
    'email@example.com',
    true
);
```

## 🐳 Docker ile Test (Opsiyonel)

Coolify'a deploy etmeden önce local'de Docker ile test edebilirsiniz:

```bash
# Docker image oluştur
docker build -t savi-budget:latest .

# Container çalıştır (environment variables ile)
docker run -d \
  -p 9876:9876 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_KEY=your_key \
  -e SESSION_SECRET=your_secret \
  -e NODE_ENV=production \
  -e PORT=9876 \
  --name savi-budget \
  savi-budget:latest

# Logs kontrol
docker logs -f savi-budget

# Container'ı durdur
docker stop savi-budget && docker rm savi-budget
```

## Sorun Giderme

### Container başlamıyor:
- Environment variables'ların doğru girildiğini kontrol edin
- Supabase bağlantı bilgilerini doğrulayın
- Logs'u kontrol edin: `docker logs container_name` veya Coolify > Application > Logs
- Health check endpoint'ini test edin: `curl http://localhost:9876/health`

### Login çalışmıyor:
- `add_users_table.sql` dosyasının çalıştırıldığından emin olun
- Supabase'de `users` tablosunun oluşturulduğunu kontrol edin:
  ```sql
  SELECT * FROM users;
  ```
- Browser console'da hata mesajlarını kontrol edin
- Network tab'de `/api/auth/login` request'ine bakın

### Session kaybolması:
- SESSION_SECRET'ın production'da ayarlandığından emin olun
- Cookie secure flag'i HTTPS kullanıyorsanız aktif olmalı
- Browser cookies'in aktif olduğunu kontrol edin

## Yedekleme

Supabase otomatik yedekleme yapıyor, ancak ek güvenlik için:

1. Coolify > Application > Backups bölümünden yedek alın
2. Supabase Dashboard > Database > Backups'tan manuel yedek alın

## Monitoring

Coolify'da:
- Logs: Gerçek zamanlı uygulama logları
- Metrics: CPU, Memory, Network kullanımı
- Alerts: Sorun durumunda bildirim

## Destek

Sorularınız için:
- GitHub Issues
- Coolify Documentation: https://coolify.io/docs
- Supabase Documentation: https://supabase.com/docs
