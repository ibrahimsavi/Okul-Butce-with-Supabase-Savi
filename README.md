# Savi Bütçe

Okullar için öğrenci, aidat, ödeme, gelir-gider ve rapor yönetimi uygulaması. Türkçe arayüz; rol ve izin denetimi; Excel raporları ve mobil uyumlu yönetim ekranları içerir.

## Özellikler

- Öğrenci, kategori ve gelir-gider kayıtları
- Tekli veya toplu aidat oluşturma ve ödeme takibi
- Bekleyen, ödenen ve geciken aidat özetleri
- Rol ve izin tabanlı kullanıcı yönetimi
- Excel raporları
- Sunucu taraflı oturum, giriş sınırlaması ve istek doğrulama
- Supabase PostgreSQL üzerinde veritabanı kuralları ve erişim koruması

## Gereksinimler

- Node.js 22 veya üzeri
- npm
- Bir Supabase projesi
- Üretim ortamında kalıcı oturumlar için PostgreSQL bağlantısı

## Hızlı kurulum

### 1. Projeyi indirin

```sh
git clone https://github.com/ibrahimsavi/Okul-Butce-with-Supabase-Savi.git
cd Okul-Butce-with-Supabase-Savi
npm ci
```

### 2. Supabase veritabanını hazırlayın

Supabase panelinde **SQL Editor** bölümünü açın ve kurulum türünüze uygun seçeneği uygulayın.

#### Yeni ve boş proje

`supabase/full_setup.sql` dosyasının tamamını SQL Editor'de çalıştırın. Bu dosya tabloları, rolleri, izinleri, örnek verileri ve güvenlik kurallarını oluşturur.

> [!WARNING]
> `full_setup.sql` ve `reset_schema.sql` mevcut tabloları siler. İçinde korunması gereken veri bulunan bir projede bu dosyaları çalıştırmayın.

#### Mevcut kurulum

Önce veritabanının yedeğini alın. Ardından SQL Editor'de aşağıdaki dosyaları sırayla çalıştırın:

1. `supabase/harden_access.sql`
2. `supabase/harden_payments.sql`

Bu geçişler mevcut kayıtları koruyarak doğrudan anonim tablo erişimini kapatır ve aidat/ödeme tutarlılığını veritabanı seviyesinde uygular. Ayrıntılar için [SECURITY.md](SECURITY.md) dosyasına bakın.

### 3. Ortam değişkenlerini ayarlayın

Örnek dosyayı kopyalayın:

```sh
cp .env.example .env
```

`.env` dosyasındaki değerleri kendi ortamınıza göre doldurun:

| Değişken | Açıklama | Yerel örnek |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase proje adresi | `https://proje-kodu.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase **service_role** anahtarı | Supabase → Project Settings → API |
| `DATABASE_URL` | Kalıcı oturum deposu için PostgreSQL bağlantısı | Yerel geliştirmede boş bırakılabilir |
| `PORT` | Uygulama portu | `9876` |
| `NODE_ENV` | Çalışma ortamı | `development` |
| `APP_ORIGIN` | Tarayıcının uygulamaya eriştiği tam adres | `http://localhost:9876` |
| `SESSION_COOKIE_SECURE` | Çerezin yalnızca HTTPS ile gönderilmesi | Yerelde `false`, üretimde `true` |
| `SESSION_SECRET` | Oturumları imzalamak için güçlü ve rastgele anahtar | Aşağıdaki komutla üretin |
| `TRUST_PROXY` | Güvenilen proxy IP/CIDR listesi | Doğrudan bağlantıda boş bırakın |

Güçlü bir oturum anahtarı üretin:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`SUPABASE_SERVICE_KEY` yalnızca sunucuda tutulmalıdır. `.env` dosyasını Git'e eklemeyin ve bu anahtarı tarayıcı kodunda kullanmayın.

Yerel geliştirme için en küçük yapılandırma şöyledir:

```dotenv
SUPABASE_URL=https://proje-kodu.supabase.co
SUPABASE_SERVICE_KEY=service-role-anahtariniz
PORT=9876
NODE_ENV=development
APP_ORIGIN=http://localhost:9876
SESSION_COOKIE_SECURE=false
SESSION_SECRET=uretmis-oldugunuz-uzun-rastgele-deger
TRUST_PROXY=
```

### 4. İlk yönetici hesabını oluşturun

Veritabanı kurulumu tamamlandıktan sonra yönetici bilgilerini geçici olarak tanımlayın:

```sh
ADMIN_USERNAME=admin \
ADMIN_PASSWORD='en-az-12-karakter-guclu-parola' \
ADMIN_FULL_NAME='Sistem Yöneticisi' \
npm run create-admin
```

Parola en az 12 karakter olmalı ve UTF-8 olarak 72 baytı aşmamalıdır. Hesap oluşturulduktan sonra `ADMIN_PASSWORD` değerini ortamdan kaldırın. Komut mevcut bir hesabın parolasını değiştirmez.

### 5. Testleri çalıştırın

```sh
npm test
npm audit --omit=dev --audit-level=moderate
```

Testler canlı Supabase veritabanını değiştirmez. HTTP oturum ve yetki akışları sahte veri katmanıyla; SQL geçişleri yerel PostgreSQL uyumlu test motoruyla doğrulanır.

### 6. Uygulamayı başlatın

```sh
npm start
```

Tarayıcıda [http://localhost:9876](http://localhost:9876) adresini açın ve oluşturduğunuz yönetici hesabıyla giriş yapın. Herkese açık sağlık kontrolü `GET /health` adresindedir.

## Üretim ayarları

Üretimde aşağıdaki ayarlar zorunludur:

- `NODE_ENV=production`
- HTTPS adresini içeren `APP_ORIGIN`
- `SESSION_COOKIE_SECURE=true`
- Güçlü ve benzersiz `SESSION_SECRET`
- Kalıcı oturum deposu için `DATABASE_URL`
- Ters proxy kullanılıyorsa yalnızca gerçek proxy IP/CIDR değerlerini içeren `TRUST_PROXY`

`DATABASE_URL` kullanıcısının `private` şemasında oturum tablosu oluşturma izni bulunmalıdır. `private` şemasını Supabase Data API üzerinden yayımlamayın. Canlıya geçmeden önce proxy, yetki ve ödeme akışlarını ayrı bir test ortamında doğrulayın.

## Kullanışlı komutlar

| Komut | İşlev |
| --- | --- |
| `npm start` | Uygulamayı başlatır |
| `npm run dev` | Uygulamayı geliştirme modunda başlatır |
| `npm test` | Güvenlik, API ve SQL geçiş testlerini çalıştırır |
| `npm run create-admin` | İlk yönetici hesabını oluşturur |

## Proje yapısı

```text
public/       Tarayıcı arayüzü
routes/       API uçları
middleware/   Kimlik, yetki ve güvenlik kontrolleri
scripts/      Yönetim yardımcıları
supabase/     Kurulum ve güvenlik SQL dosyaları
tests/        HTTP, güvenlik ve migration testleri
```

Güvenli yükseltme, bilinen işletim sınırları ve canlı ortam kontrol listesi için [SECURITY.md](SECURITY.md) dosyasını okuyun.
