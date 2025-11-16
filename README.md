# Savi Bütçe v.1 (Supabase)

Okulların gelir-gider, öğrenci ve aidat takibini kolay yönetebilmesi için hazırlanmış Node.js + Supabase tabanlı bütçe uygulaması. Proje Coolify veya herhangi bir Docker destekli sunucuda hızlıca ayağa kaldırılabilecek şekilde düzenlendi.

## 🚀 Özellikler

- 🔐 Oturum bazlı kullanıcı girişi (bcrypt + express-session)
- 💸 Gelir / gider işlemlerinin yönetimi
- 👩‍🎓 Öğrenci ve aidat takibi
- 💳 Ödeme kayıtları
- 📊 Excel çıktılarını oluşturan raporlar
- 🖥️ Docker & Coolify uyumlu kurulum

## ⚙️ Gereksinimler

- Node.js 20+
- Supabase hesabı (PostgreSQL veritabanı otomatik oluşturulur)
- Docker (Coolify dağıtımı için)

## 🛠️ Kurulum Adımları

### 1. Repoyu Klonlayın

```bash
git clone https://github.com/ibrahimsavi/Okul-Butce-with-Supabase-Savi.git
cd Okul-Butce-with-Supabase-Savi
```

### 2. Supabase Projenizi Hazırlayın

1. https://supabase.com adresinden yeni bir proje oluşturun.
2. Dashboard > SQL Editor bölümüne gidin ve sırasıyla şu dosyalardaki SQL komutlarını çalıştırın:
   - `supabase/reset_schema.sql` → tüm ana tabloları oluşturur.
   - `supabase/add_users_table.sql` → `users` tablosunu ve varsayılan **admin/admin123** kullanıcısını ekler.
3. İlk girişten sonra `/sifre-degistir.html` sayfasından şifrenizi mutlaka değiştirin.

### 3. Ortam Değişkenlerini Ayarlayın

`.env.example` dosyasını kopyalayın ve Supabase projenizden aldığınız anahtarlarla doldurun:

```bash
cp .env.example .env
```

| Değişken | Açıklama |
| --- | --- |
| `SUPABASE_URL` | Supabase projenizin URL’si |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (şifre değiştirme vb. için gerekli) |
| `PORT` | Varsayılan `9876` (Coolify ile uyumlu) |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` ile üretin |
| `SESSION_COOKIE_SECURE` | Proxy arkasında HTTP çalışıyorsanız `false`, doğrudan HTTPS kullanıyorsanız `true` |
| `SESSION_COOKIE_SAMESITE` | HTTP için `lax`; HTTPS reverse proxy (Cloudflare Tunnel vb.) kullanıyorsanız `none` |

### 4. Yerel Geliştirme

```bash
npm install
npm start
```

Uygulama varsayılan olarak `http://localhost:9876` adresinde çalışır.

### 5. İlk Giriş

- Kullanıcı adı: `admin`
- Şifre: `admin123`
- Girişten hemen sonra “Şifre Değiştir” sayfasından yeni şifre belirleyin.

## ☁️ Coolify Üzerine Kurulum

1. Yeni bir **Application** oluşturup bu GitHub reposunu bağlayın.
2. Build type olarak “Dockerfile” seçin (root dizindeki `Dockerfile` kullanılır).
3. “Environment Variables” sekmesine `.env` dosyanızdaki değerleri ekleyin.
4. “Ports Exposes” alanını `9876` olarak ayarlayın.
5. Eğer uygulama Cloudflare Tunnel gibi HTTPS bir proxy arkasındaysa:
   - `SESSION_COOKIE_SECURE=false`
   - `SESSION_COOKIE_SAMESITE=lax`
   değerlerini kullanın.
   Doğrudan HTTPS ile yayın yapıyorsanız `true/none` kombinasyonunu tercih edin.
6. Deploy işlemini başlatın. Loglarda aşağıdaki satırları görmelisiniz:
   ```
   ✅ Supabase bağlantısı başarılı!
   🚀 Sunucu http://localhost:9876 adresinde çalışıyor
   ```

## 📂 Proje Yapısı

```
public/           → Statik HTML + Tailwind arayüz
routes/           → Express API uçları
middleware/auth.js→ Oturum kontrol middleware’i
supabase/*.sql    → Supabase şema ve kullanıcı SQL dosyaları
server.js         → Express uygulamasının girişi
Dockerfile        → Üretim yapısı
```

## 🔐 Ek Notlar

- Oturum süresi varsayılan olarak 24 saattir.
- Bellek içi session store kullanıldığı için tek instanslı dağıtımlar için uygundur. Birden fazla replika veya ölçekleme planlıyorsanız Redis tabanlı bir session store eklemeniz gerekir.
- `supabase/add_users_table.sql` dosyasındaki varsayılan admin kullanıcısının parolasını dağıtıma geçmeden önce değiştirin.

## 🤝 Katkı

Pull request’ler ve hata bildirimleri memnuniyetle karşılanır. Yeni özellik taleplerini issue açarak paylaşabilirsiniz.

## 📄 Lisans

MIT Lisansı