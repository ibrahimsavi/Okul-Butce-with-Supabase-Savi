# Savi Bütçe

Okulların öğrenci aidatlarını, tahsilatlarını, gelir-gider hareketlerini ve kullanıcı yetkilerini tek panelden yönetmesi için geliştirilmiş web uygulaması.

Savi Bütçe; Türkçe ve responsive bir yönetim arayüzünü, Express tabanlı sunucu katmanını ve Supabase PostgreSQL veritabanını bir araya getirir. Yetkilendirme kontrolleri sunucuda uygulanır; raporlar Excel biçiminde dışa aktarılabilir.

## İçindekiler

- [Öne çıkan özellikler](#öne-çıkan-özellikler)
- [Teknolojiler](#teknolojiler)
- [Yeni kurulum](#yeni-kurulum)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Kullanılabilir komutlar](#kullanılabilir-komutlar)
- [Proje yapısı](#proje-yapısı)
- [Güvenlik](#güvenlik)
- [Üretime alma kontrol listesi](#üretime-alma-kontrol-listesi)
- [Sorun giderme](#sorun-giderme)

## Öne çıkan özellikler

| Modül | Sağladığı işlevler |
| --- | --- |
| Gösterge paneli | Gelir, gider, bakiye ve aidat durumlarını özetler. |
| Öğrenciler | Öğrenci ve veli bilgilerini kaydeder, günceller ve listeler. |
| Aidatlar | Tekli veya toplu aidat oluşturur; bekleyen, ödenen ve geciken kayıtları izler. |
| Ödemeler | Tahsilatları ödeme yöntemi ve makbuz bilgileriyle kaydeder. |
| İşlemler | Gelir-gider hareketlerini öğrenci ve kategorilerle ilişkilendirir. |
| Kategoriler | Gelir ve gider türlerini yönetir. |
| Raporlar | Mali ve öğrenci raporlarını görüntüler, Excel çıktısı üretir. |
| Yönetim | Kullanıcı, rol ve izinleri yönetir. |

Ek olarak uygulama; sunucu taraflı oturum yönetimi, rol ve izin denetimi, giriş denemesi sınırlaması, istek doğrulama ve veritabanı seviyesinde ödeme tutarlılığı sağlar.

## Teknolojiler

- **Çalışma ortamı:** Node.js 22+
- **Sunucu:** Express 5
- **Veritabanı:** Supabase PostgreSQL
- **Oturum deposu:** PostgreSQL (`connect-pg-simple`)
- **Arayüz:** HTML, JavaScript ve Tailwind CSS
- **Raporlama:** ExcelJS
- **Test:** Node.js test çalıştırıcısı ve PGlite

## Yeni kurulum

Bu bölüm boş bir Supabase projesi üzerinde sıfırdan kurulum içindir. Kurulum SQL'i mevcut uygulama tablolarını silerek yeniden oluşturduğu için veri bulunan bir projede çalıştırılmamalıdır.

### 1. Gereksinimleri hazırlayın

- Node.js 22 veya üzeri
- npm
- Yeni ve boş bir [Supabase](https://supabase.com/) projesi
- Git

Sürümleri kontrol edin:

```sh
node --version
npm --version
git --version
```

### 2. Projeyi indirin

```sh
git clone https://github.com/ibrahimsavi/Okul-Butce-with-Supabase-Savi.git
cd Okul-Butce-with-Supabase-Savi
npm ci
```

### 3. Veritabanını oluşturun

1. Supabase panelinde projenizi açın.
2. Sol menüden **SQL Editor** bölümüne girin.
3. Depodaki `supabase/full_setup.sql` dosyasının tamamını kopyalayın.
4. SQL Editor'e yapıştırıp **Run** düğmesine basın.
5. İşlemin hatasız tamamlandığını doğrulayın.

Bu dosya uygulama tablolarını, rollerini, izinlerini, başlangıç verilerini, RLS ayarlarını ve ödeme bütünlüğünü koruyan veritabanı kurallarını birlikte oluşturur.

> [!CAUTION]
> `supabase/full_setup.sql` ve `supabase/reset_schema.sql` mevcut uygulama tablolarını siler. Bu dosyaları yalnızca yeni ve boş kurulumda kullanın.

### 4. Ortam dosyasını oluşturun

```sh
cp .env.example .env
```

Supabase panelinde **Project Settings → API** bölümünden proje adresini ve `service_role` anahtarını alın. Ardından `.env` dosyasını yerel geliştirme için şu şekilde doldurun:

```dotenv
SUPABASE_URL=https://proje-kodu.supabase.co
SUPABASE_SERVICE_KEY=service-role-anahtariniz
DATABASE_URL=
PORT=9876
NODE_ENV=development
APP_ORIGIN=http://localhost:9876
SESSION_COOKIE_SECURE=false
SESSION_SECRET=uzun-ve-rastgele-bir-deger
TRUST_PROXY=
```

Güçlü bir oturum anahtarı üretmek için:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Üretilen değeri `SESSION_SECRET` alanına yazın. `.env` dosyasını Git'e eklemeyin.

### 5. İlk yönetici hesabını oluşturun

macOS veya Linux:

```sh
ADMIN_USERNAME=admin \
ADMIN_PASSWORD='en-az-12-karakter-guclu-parola' \
ADMIN_FULL_NAME='Sistem Yöneticisi' \
npm run create-admin
```

Windows PowerShell:

```powershell
$env:ADMIN_USERNAME='admin'
$env:ADMIN_PASSWORD='en-az-12-karakter-guclu-parola'
$env:ADMIN_FULL_NAME='Sistem Yöneticisi'
npm run create-admin
Remove-Item Env:ADMIN_PASSWORD
```

Parola en az 12 karakter olmalı ve UTF-8 olarak 72 baytı aşmamalıdır. Komut başarıyla tamamlandıktan sonra `ADMIN_PASSWORD` değerini terminal ortamından kaldırın. Bu komut mevcut bir kullanıcının parolasını değiştirmez.

### 6. Kontrolleri çalıştırın

```sh
npm test
npm audit --omit=dev --audit-level=moderate
```

Testler canlı Supabase verilerini değiştirmez. HTTP ve yetki akışları sahte veri katmanıyla, SQL kuralları ise yerel PostgreSQL uyumlu test motoruyla doğrulanır.

### 7. Uygulamayı başlatın

```sh
npm start
```

Tarayıcıda [http://localhost:9876](http://localhost:9876) adresini açın ve oluşturduğunuz yönetici hesabıyla giriş yapın. Uygulamanın çalıştığını doğrulamak için [http://localhost:9876/health](http://localhost:9876/health) adresini de kullanabilirsiniz.

## Ortam değişkenleri

| Değişken | Zorunluluk | Açıklama |
| --- | --- | --- |
| `SUPABASE_URL` | Her ortamda | Supabase projesinin HTTPS adresi. |
| `SUPABASE_SERVICE_KEY` | Her ortamda | Yalnızca sunucuda kullanılan `service_role` anahtarı. |
| `DATABASE_URL` | Üretimde | Kalıcı oturum deposu için PostgreSQL bağlantı adresi. |
| `PORT` | İsteğe bağlı | Sunucu portu; varsayılan değer `9876`. |
| `NODE_ENV` | Her ortamda | Yerelde `development`, canlı sistemde `production`. |
| `APP_ORIGIN` | Her ortamda | Kullanıcının uygulamaya eriştiği tam adres; sonunda `/` olmamalı. |
| `SESSION_COOKIE_SECURE` | Her ortamda | Yerel HTTP'de `false`, üretim HTTPS ortamında `true`. |
| `SESSION_SECRET` | Her ortamda | Oturum çerezlerini imzalayan güçlü ve benzersiz anahtar. |
| `TRUST_PROXY` | Proxy varsa | Virgülle ayrılmış güvenilir proxy IP veya CIDR değerleri. |

## Kullanılabilir komutlar

| Komut | Açıklama |
| --- | --- |
| `npm start` | Uygulamayı normal modda başlatır. |
| `npm run dev` | Uygulamayı geliştirme yapılandırmasıyla başlatır. |
| `npm test` | API, güvenlik ve veritabanı testlerini çalıştırır. |
| `npm run create-admin` | Ortam değişkenlerinden ilk yönetici hesabını oluşturur. |

## Proje yapısı

```text
.
├── middleware/   Kimlik doğrulama, yetkilendirme ve güvenlik kontrolleri
├── public/       HTML, tarayıcı JavaScript'i ve ortak tema dosyaları
├── routes/       REST API uçları
├── scripts/      Yönetim yardımcıları
├── supabase/     Veritabanı kurulumu ve güvenlik SQL dosyaları
├── tests/        HTTP, güvenlik ve SQL testleri
├── database.js   Supabase sunucu bağlantısı
└── server.js     Express uygulamasının giriş noktası
```

## Güvenlik

Uygulama Supabase tablolarına tarayıcıdan doğrudan erişmez. Tarayıcı yalnızca Express API ile haberleşir; veri işlemleri sunucuda tutulan `service_role` anahtarıyla yapılır. Rol ve izinler her korumalı istekte sunucu tarafında yeniden denetlenir.

### Anahtarlar ve gizli değerler

- `SUPABASE_SERVICE_KEY`, `SESSION_SECRET`, `DATABASE_URL` ve yönetici parolası hiçbir zaman tarayıcı koduna, Git geçmişine veya herkese açık kayıtlara yazılmamalıdır.
- `SUPABASE_ANON_KEY` bu uygulamanın sunucu akışında kullanılmaz.
- `.env` dosyası paylaşılmamalı; her ortam için farklı `SESSION_SECRET` kullanılmalıdır.
- Yönetici oluşturulduktan sonra `ADMIN_PASSWORD` ortamdan kaldırılmalıdır.

### Veritabanı erişimi

- Kurulum, uygulama tablolarında RLS'yi etkinleştirir ve `PUBLIC`, `anon` ile `authenticated` rollerinin doğrudan tablo erişimini kaldırır.
- Ödeme tetikleyicileri fazla tahsilatı, sıfır veya negatif ödemeyi ve aidat tutarının ödenmiş miktarın altına indirilmesini engeller.
- `DATABASE_URL` kullanıcısı `private` şemasında oturum tablosu oluşturabilmelidir.
- `private` şeması Supabase Data API üzerinden yayımlanmamalıdır.

### Oturum ve ağ güvenliği

- Üretimde `SESSION_COOKIE_SECURE=true` ve yalnızca HTTPS içeren bir `APP_ORIGIN` kullanılmalıdır.
- Ters proxy kullanılıyorsa `TRUST_PROXY` yalnızca gerçek proxy IP/CIDR değerlerini içermelidir. Proxy, `X-Forwarded-Proto: https` başlığını kendisi ayarlamalı ve istemciden gelen değeri kabul etmemelidir.
- Üretimde `DATABASE_URL` ile kalıcı PostgreSQL oturum deposu zorunludur. Parolası değiştirilen veya pasifleştirilen kullanıcının eski oturumu sonraki istekte geçersiz olur; her girişte oturum kimliği yenilenir.
- Giriş denemesi sınırı tek sunucu işleminin belleğinde tutulur. Birden fazla uygulama örneği kullanılıyorsa proxy veya ağ geçidi üzerinde ortak hız sınırı eklenmelidir.
- `/health` uç noktası oturum istemez ve mali veri döndürmez.

### Tarayıcı güvenlik politikası

Uygulama çerçeveleme, nesne kaynağı ve temel adres kullanımı için güvenlik başlıkları gönderir. Bazı sayfalarda satır içi betikler ve CDN kaynakları bulunduğundan tam kısıtlı bir Content Security Policy henüz uygulanmamaktadır. Üretimde yalnızca güvenilen CDN kaynakları kullanılmalı ve bağımlılık güncellemeleri düzenli olarak denetlenmelidir.

## Üretime alma kontrol listesi

- [ ] `NODE_ENV=production`
- [ ] `APP_ORIGIN` gerçek HTTPS adresi
- [ ] `SESSION_COOKIE_SECURE=true`
- [ ] Güçlü ve bu kuruluma özel `SESSION_SECRET`
- [ ] Kalıcı oturumlar için `DATABASE_URL`
- [ ] Yalnızca gerçek proxy adreslerini içeren `TRUST_PROXY`
- [ ] Supabase `service_role` anahtarının yalnızca sunucuda bulunması
- [ ] `private` şemasının Supabase Data API'ye kapalı olması
- [ ] `npm test` ve bağımlılık denetiminin başarılı olması
- [ ] Yetki, ödeme, yedekleme ve geri yükleme akışlarının test ortamında doğrulanması

## Sorun giderme

### Uygulama Supabase'e bağlanamıyor

`SUPABASE_URL` ve `SUPABASE_SERVICE_KEY` değerlerini kontrol edin. Anahtarın `anon` değil `service_role` anahtarı olduğundan ve `.env` dosyasının proje kökünde bulunduğundan emin olun.

### Yönetici oluşturulamıyor

Önce `supabase/full_setup.sql` dosyasını çalıştırdığınızı doğrulayın. `roles` tablosunda `admin` rolü bulunmalı; parola da uzunluk kurallarına uymalıdır.

### Üretimde giriş oturumu korunmuyor

`DATABASE_URL`, `APP_ORIGIN`, `SESSION_COOKIE_SECURE` ve proxy ayarlarını kontrol edin. HTTPS kullanan proxy'nin `X-Forwarded-Proto` başlığını doğru ilettiğinden emin olun.

### Port kullanımda hatası alınıyor

`.env` içindeki `PORT` değerini boşta olan başka bir portla değiştirin ve `APP_ORIGIN` adresini aynı porta göre güncelleyin.
