# 🎓 Savi Bütçe v.1

Okulların gelir-gider, öğrenci ve aidat takibini kolay yönetebilmesi için hazırlanmış **Node.js + Express + Supabase** tabanlı profesyonel bütçe yönetim sistemi.

Docker & Coolify uyumlu, Cloudflare Tunnel arkasında sorunsuz çalışacak şekilde yapılandırılmıştır.

---

## 🚀 Özellikler

- 🔐 **Kullanıcı Yönetimi** — Oturum bazlı giriş, rol ve izin sistemi (admin / başkan / müdür)
- 💸 **Gelir & Gider Takibi** — Kategorize edilmiş işlem kayıtları
- 👩‍🎓 **Öğrenci Yönetimi** — Öğrenci bilgileri, toplu içe aktarma (Excel)
- 💳 **Aidat & Ödeme Takibi** — Aidat tanımlama, ödeme kaydı, durum izleme
- 📊 **Raporlama** — Mali ve öğrenci raporları, Excel (`.xlsx`) dışa aktarma
- 🛡️ **Rol Bazlı Yetkilendirme** — Sayfa, işlem ve kaynak düzeyinde izin kontrolü
- 🖥️ **Docker & Coolify** — Tek komutla production deploy
- ☁️ **Cloudflare Tunnel Desteği** — HTTPS proxy arkasında otomatik protokol algılama

---

## 📐 Mimari

```
Tarayıcı (HTTPS)
    │
    ▼
Cloudflare (SSL Termination)
    │
    ▼
Cloudflare Tunnel (HTTP)
    │
    ▼
Coolify / Docker Container
    │
    ▼
Express.js (Node.js 20)  ←→  Supabase (PostgreSQL)
    │
    ├── /api/auth        → Kimlik doğrulama
    ├── /api/categories   → Kategori CRUD
    ├── /api/transactions → İşlem CRUD
    ├── /api/students     → Öğrenci CRUD
    ├── /api/student-fees → Aidat yönetimi
    ├── /api/payments     → Ödeme yönetimi
    ├── /api/reports      → Raporlama & Excel
    └── /api/admin        → Kullanıcı & rol yönetimi
```

---

## ⚙️ Gereksinimler

| Gereksinim | Versiyon | Açıklama |
|---|---|---|
| **Node.js** | 20+ | Uygulama çalışma zamanı |
| **npm** | 9+ | Paket yöneticisi |
| **Supabase** | — | PostgreSQL veritabanı (bulut veya self-hosted) |
| **Docker** | 20+ | Container tabanlı deploy (opsiyonel) |

---

## 📦 Bağımlılıklar

### Production Bağımlılıkları

| Paket | Versiyon | Açıklama |
|---|---|---|
| `express` | ^5.1.0 | Web framework |
| `@supabase/supabase-js` | ^2.81.1 | Supabase JavaScript istemcisi |
| `bcryptjs` | ^3.0.3 | Şifre hashleme (bcrypt) |
| `express-session` | ^1.18.2 | Sunucu taraflı oturum yönetimi |
| `cookie-parser` | ^1.4.7 | Cookie ayrıştırma |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing |
| `dotenv` | ^17.2.3 | `.env` dosyasından ortam değişkeni yükleme |
| `exceljs` | ^4.4.0 | Excel dosyası oluşturma ve dışa aktarma |
| `xlsx` | ^0.18.5 | Excel dosyası okuma (toplu içe aktarma) |
| `multer` | ^1.4.5-lts.1 | Dosya yükleme (Excel import) |
| `pg` | ^8.16.3 | PostgreSQL istemcisi |
| `connect-pg-simple` | ^10.0.0 | PostgreSQL tabanlı session store |
| `better-sqlite3` | ^9.4.3 | SQLite desteği (opsiyonel) |

---

## 🛠️ Kurulum Adımları

### 1. Repoyu Klonlayın

```bash
git clone https://github.com/ibrahimsavi/Okul-Butce-with-Supabase-Savi.git
cd Okul-Butce-with-Supabase-Savi
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Supabase Veritabanını Hazırlayın

[Supabase Dashboard](https://supabase.com) üzerinden yeni bir proje oluşturun, ardından **SQL Editor** bölümüne giderek aşağıdaki SQL dosyalarını **sırasıyla** çalıştırın:

| Sıra | Dosya | Açıklama |
|---|---|---|
| 1 | `supabase/reset_schema.sql` | Ana tabloları oluşturur (categories, students, transactions, student_fees, payments) ve örnek veri ekler |
| 2 | `supabase/add_users_table.sql` | `users` tablosunu oluşturur, varsayılan admin kullanıcısı ekler |
| 3 | `supabase/add_admin_system.sql` | Rol ve izin sistemini kurar (`roles`, `permissions`, `role_permissions` tabloları), admin/başkan/müdür rollerini tanımlar |

> **⚠️ Önemli:** SQL dosyalarını sırasıyla çalıştırın. `add_admin_system.sql`, `users` tablosunun var olmasını gerektirir.

### 4. Ortam Değişkenlerini Ayarlayın

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyerek Supabase projenizden aldığınız bilgileri girin:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Server Configuration
PORT=9876
NODE_ENV=production
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax

# Session Secret (aşağıdaki komutla güvenli bir anahtar üretin)
SESSION_SECRET=your_random_secret_key_here
```

**Session Secret üretmek için:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Uygulamayı Başlatın

```bash
# Production
npm start

# Geliştirme
npm run dev
```

Uygulama varsayılan olarak `http://localhost:9876` adresinde çalışır.

### 6. İlk Giriş

| Alan | Değer |
|---|---|
| Kullanıcı Adı | `admin` |
| Şifre | `admin123` |

> **⚠️ Güvenlik:** İlk girişten sonra **Şifre Değiştir** sayfasından (`/sifre-degistir.html`) yeni bir şifre belirleyin.

---

## ☁️ Coolify ile Deploy

### 1. Coolify Uygulaması Oluşturma

1. Coolify Dashboard'da yeni bir **Application** oluşturun
2. GitHub reposunu bağlayın: `ibrahimsavi/Okul-Butce-with-Supabase-Savi`
3. Build type: **Dockerfile** (root dizindeki `Dockerfile` veya `Dockerfile.production` kullanılır)
4. Ports Exposes: `9876`

### 2. Ortam Değişkenleri (Coolify UI)

Coolify'ın **Environment Variables** sekmesine aşağıdaki değişkenleri ekleyin:

```
SUPABASE_URL=https://your-supabase-url
SUPABASE_ANON_KEY=your_anon_key
SESSION_SECRET=your_secure_random_secret
PORT=9876
NODE_ENV=production
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
```

### 3. Cloudflare Tunnel Yapılandırması

Uygulama Cloudflare Tunnel arkasında çalışıyorsa, `server.js` içindeki middleware `CF-Visitor` ve `CF-Connecting-IP` header'larını otomatik olarak algılar ve `x-forwarded-proto` değerini `https` olarak düzeltir. Ekstra yapılandırma gerekmez.

| Ayar | Değer | Açıklama |
|---|---|---|
| `SESSION_COOKIE_SECURE` | `true` | Cloudflare HTTPS kullandığı için `true` olmalı |
| `SESSION_COOKIE_SAMESITE` | `lax` | Same-site cookie politikası |

### 4. Deploy

Deploy işlemini başlatın. Loglarda şunları görmelisiniz:

```
✅ Supabase bağlantısı başarılı!
🚀 Sunucu http://localhost:9876 adresinde çalışıyor
```

### 5. Healthcheck

Dockerfile içinde `curl` tabanlı healthcheck tanımlıdır. Coolify otomatik olarak container sağlık durumunu kontrol eder:

```
HEALTHCHECK CMD curl -f http://127.0.0.1:9876/health || exit 1
```

---

## 🐳 Docker ile Manuel Deploy

```bash
# İmaj oluştur
docker build -t savi-butce .

# Container çalıştır
docker run -d \
  --name savi-butce \
  -p 9876:9876 \
  -e SUPABASE_URL=https://your-supabase-url \
  -e SUPABASE_ANON_KEY=your_anon_key \
  -e SESSION_SECRET=your_secret \
  -e NODE_ENV=production \
  -e SESSION_COOKIE_SECURE=false \
  -e SESSION_COOKIE_SAMESITE=lax \
  savi-butce
```

---

## 📂 Proje Yapısı

```
Okul-Butce-with-Supabase-Savi/
├── server.js                  # Express uygulaması giriş noktası
├── database.js                # Supabase bağlantısı ve DB yardımcı fonksiyonlar
├── package.json               # Proje bağımlılıkları ve script'ler
├── Dockerfile                 # Docker imajı (geliştirme araçları dahil)
├── Dockerfile.production      # Hafif production Docker imajı
├── docker-compose.yml         # Docker Compose yapılandırması
├── .env.example               # Örnek ortam değişkenleri
├── .dockerignore              # Docker build hariç tutulanlar
│
├── middleware/
│   ├── auth.js                # Oturum kontrol middleware'i (requireAuth)
│   └── authorization.js       # Rol ve izin bazlı yetkilendirme
│
├── routes/
│   ├── auth.js                # Giriş, çıkış, şifre değiştirme API'leri
│   ├── admin.js               # Kullanıcı, rol ve izin yönetimi API'leri
│   ├── categories.js          # Kategori CRUD API'leri
│   ├── transactions.js        # Gelir/gider işlem API'leri
│   ├── students.js            # Öğrenci CRUD ve toplu içe aktarma API'leri
│   ├── fees.js                # Aidat yönetimi API'leri
│   ├── payments.js            # Ödeme kayıtları API'leri
│   └── reports.js             # Raporlama ve Excel dışa aktarma API'leri
│
├── public/
│   ├── index.html             # Ana sayfa (Dashboard)
│   ├── login.html             # Giriş sayfası
│   ├── islemler.html          # Gelir/gider işlemleri
│   ├── kategoriler.html       # Kategori yönetimi
│   ├── ogrenciler.html        # Öğrenci yönetimi
│   ├── aidatlar.html          # Aidat ve ödeme takibi
│   ├── raporlar.html          # Raporlama sayfası
│   ├── admin.html             # Admin paneli
│   ├── sifre-degistir.html    # Şifre değiştirme sayfası
│   ├── dashboard.js           # Dashboard iş mantığı
│   ├── islemler.js            # İşlemler iş mantığı
│   ├── kategoriler.js         # Kategoriler iş mantığı
│   ├── ogrenciler.js          # Öğrenciler iş mantığı
│   ├── aidatlar.js            # Aidatlar iş mantığı
│   ├── raporlar.js            # Raporlar iş mantığı
│   ├── admin.js               # Admin paneli iş mantığı
│   ├── theme.js               # Tema yönetimi
│   └── theme.css              # Tema stilleri
│
└── supabase/
    ├── reset_schema.sql       # Ana şema: tablolar ve örnek veri
    ├── add_users_table.sql    # Kullanıcı tablosu
    ├── add_admin_system.sql   # Rol ve izin sistemi
    ├── full_setup.sql         # Tüm tabloları tek seferde kuran SQL
    ├── enable_rls_policies.sql# Row Level Security politikaları
    ├── disable_rls.sql        # RLS devre dışı bırakma
    ├── run_reset.js           # Şema sıfırlama script'i
    ├── ADMIN_SETUP.md         # Admin sistemi kurulum rehberi
    └── RLS_SETUP.md           # RLS yapılandırma rehberi
```

---

## 🗄️ Veritabanı Şeması

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  categories  │     │   students   │     │    users     │
│──────────────│     │──────────────│     │──────────────│
│ id           │     │ id           │     │ id           │
│ kategori_adi │     │ ad           │     │ kullanici_adi│
│ tur          │     │ soyad        │     │ sifre_hash   │
│ aciklama     │     │ sinif        │     │ tam_ad       │
└──────┬───────┘     │ sube         │     │ rol_id ──────┼──→ roles
       │             │ durum        │     └──────────────┘
       │             │ veli_adi     │
       │             │ veli_telefonu│     ┌──────────────┐
       │             └──────┬───────┘     │    roles     │
       │                    │             │──────────────│
       ▼                    ▼             │ id           │
┌──────────────┐                          │ rol_adi      │
│ transactions │                          └──────┬───────┘
│──────────────│                                 │
│ id           │     ┌──────────────┐    ┌───────┴────────┐
│ islem_turu   │     │ student_fees │    │role_permissions│
│ tutar        │     │──────────────│    │────────────────│
│ aciklama     │     │ id           │    │ rol_id         │
│ kategori_id ─┼──→  │ ogrenci_id ──┼──→ │ izin_id ───────┼──→ permissions
│ ogrenci_id ──┼──→  │ tutar        │    └────────────────┘
│ islem_tarihi │     │ durum        │
└──────────────┘     └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │   payments   │
                     │──────────────│
                     │ id           │
                     │ aidat_id ────┼──→ student_fees
                     │ tutar        │
                     │ odeme_yontemi│
                     └──────────────┘
```

---

## 🔐 Rol ve İzin Sistemi

### Varsayılan Roller

| Rol | Açıklama |
|---|---|
| **admin** | Sistem Yöneticisi — Tüm yetkilere sahip |
| **president** | Okul Aile Birliği Başkanı — Ekleme, düzenleme, silme ve raporlama |
| **principal** | Okul Müdürü — Sadece görüntüleme ve raporlama |

### İzin Kategorileri

| Kategori | İzinler |
|---|---|
| **Sayfa** | Dashboard, İşlemler, Kategoriler, Öğrenciler, Aidatlar, Raporlar, Admin |
| **İşlem** | İşlem ekleme, düzenleme, silme |
| **Kategori** | Kategori ekleme, düzenleme, silme |
| **Öğrenci** | Öğrenci ekleme, düzenleme, silme, toplu içe aktarma |
| **Aidat** | Aidat ekleme, düzenleme, silme, ödeme yönetimi |
| **Rapor** | Mali raporlar, öğrenci raporları, dışa aktarma |
| **Admin** | Kullanıcı, rol ve izin yönetimi |

---

## 🌐 API Endpoints

### Kimlik Doğrulama (`/api/auth`)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/auth/login` | Kullanıcı girişi |
| `POST` | `/api/auth/logout` | Oturumu sonlandır |
| `GET` | `/api/auth/session` | Oturum durumu kontrolü |
| `POST` | `/api/auth/change-password` | Şifre değiştirme |

### Kategoriler (`/api/categories`)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/categories` | Tüm kategorileri listele |
| `POST` | `/api/categories` | Yeni kategori ekle |

### İşlemler (`/api/transactions`)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/transactions` | Tüm işlemleri listele |
| `POST` | `/api/transactions` | Yeni işlem ekle |

### Öğrenciler (`/api/students`)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/students` | Tüm öğrencileri listele |
| `POST` | `/api/students` | Yeni öğrenci ekle |

### Aidatlar (`/api/student-fees`)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/student-fees` | Tüm aidatları listele |
| `POST` | `/api/student-fees` | Yeni aidat tanımla |

### Ödemeler (`/api/payments`)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/payments` | Tüm ödemeleri listele |
| `POST` | `/api/payments` | Yeni ödeme kaydı |

### Raporlar (`/api/reports`)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/reports` | Rapor verileri |

### Admin (`/api/admin`)

| Metod | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/admin/users` | Tüm kullanıcıları listele |
| `POST` | `/api/admin/users` | Yeni kullanıcı ekle |
| `PUT` | `/api/admin/users/:id` | Kullanıcı güncelle |
| `PUT` | `/api/admin/users/:id/password` | Kullanıcı şifresi değiştir |
| `DELETE` | `/api/admin/users/:id` | Kullanıcı sil |
| `GET` | `/api/admin/roles` | Tüm rolleri listele |
| `GET` | `/api/admin/permissions` | Tüm izinleri listele |
| `GET` | `/api/admin/roles/:id/permissions` | Rolün izinlerini getir |
| `POST` | `/api/admin/roles/:id/permissions` | Role izin ekle |
| `DELETE` | `/api/admin/roles/:roleId/permissions/:permissionId` | Rolden izin kaldır |
| `GET` | `/api/admin/stats` | Sistem istatistikleri |

### Sağlık Kontrolü

| Metod | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/health` | Container healthcheck (public) |
| `GET` | `/api/health` | API sağlık kontrolü (authenticated) |

---

## 🔧 Ortam Değişkenleri Referansı

| Değişken | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|
| `SUPABASE_URL` | ✅ | — | Supabase proje URL'si |
| `SUPABASE_ANON_KEY` | ✅ | — | Supabase anon (public) API anahtarı |
| `SESSION_SECRET` | ✅ | — | Oturum imzalama anahtarı (en az 32 karakter) |
| `PORT` | ❌ | `9876` | Sunucu port numarası |
| `NODE_ENV` | ❌ | `development` | Çalışma ortamı (`development` / `production`) |
| `SESSION_COOKIE_SECURE` | ❌ | `false` | HTTPS üzerinden çalışıyorsa `true` |
| `SESSION_COOKIE_SAMESITE` | ❌ | `lax` | Cookie SameSite politikası (`lax` / `strict` / `none`) |

---

## 🐛 Sorun Giderme

### Healthcheck Başarısız (Coolify)

**Hata:** `New container is not healthy, rolling back`

**Çözüm:** Dockerfile'da `curl` yüklü olmalıdır. `Dockerfile.production` dosyasında şu satır bulunmalı:

```dockerfile
RUN apk add --no-cache curl
```

### Giriş Sonrası Yönlendirme Çalışmıyor

**Hata:** "Giriş başarılı" mesajı görünüyor ama ana sayfaya yönlendirilmiyor.

**Neden:** Cloudflare Tunnel, origin sunucuya HTTP üzerinden bağlandığı için `x-forwarded-proto: http` gönderiyor. `Secure` cookie bu durumda düzgün çalışmıyor.

**Çözüm:** `server.js` içinde Cloudflare header'larını (`CF-Visitor`, `CF-Connecting-IP`) algılayarak `x-forwarded-proto` değerini otomatik olarak düzelten middleware zaten eklidir. `SESSION_COOKIE_SECURE=true` olarak ayarlayın.

### Supabase Bağlantı Hatası

**Hata:** `❌ Supabase bilgileri bulunamadı!`

**Çözüm:** `SUPABASE_URL` ve `SUPABASE_ANON_KEY` ortam değişkenlerinin doğru ayarlandığından emin olun. Coolify kullanıyorsanız bu değişkenleri Coolify UI'dan girin (`.env` dosyası Docker imajına dahil edilmez).

### MemoryStore Uyarısı

**Uyarı:** `Warning: connect.session() MemoryStore is not designed for a production environment`

**Açıklama:** Uygulama bellek içi session store kullanıyor. Tek instance çalışma için uygundur. Çoklu replika veya ölçekleme planlıyorsanız Redis tabanlı session store geçişi önerilir.

---

## 📝 Ek Notlar

- Oturum süresi varsayılan olarak **24 saat**'tir
- Supabase **anon key** ile çalışır; RLS politikaları opsiyoneldir (`supabase/enable_rls_policies.sql`)
- Frontend **Tailwind CSS** (CDN) ve **Font Awesome** ile stillendirilmiştir
- Excel dışa aktarma **ExcelJS**, içe aktarma **xlsx** kütüphanesi ile yapılır

---

## 🤝 Katkı

Pull request'ler ve hata bildirimleri memnuniyetle karşılanır. Yeni özellik taleplerini issue açarak paylaşabilirsiniz.

---

## 📄 Lisans

MIT Lisansı — Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

<p align="center">
  <b>Savi Bütçe v.1</b> — Profesyonel Okul Bütçe Yönetim Sistemi<br>
  © 2025 Savi
</p>