# Admin Sistem Kurulum Rehberi

## Kurulum Adımları

### 1. SQL Şemasını Çalıştırın

`add_admin_system.sql` dosyasını Supabase Dashboard'da çalıştırın:

1. Supabase Dashboard'unuza gidin
2. **SQL Editor** sekmesini açın
3. **New Query** butonuna tıklayın
4. `supabase/add_admin_system.sql` dosyasının içeriğini kopyalayıp yapıştırın
5. **Run** butonuna tıklayın

### 2. Varsayılan Admin Hesabı

SQL çalıştıktan sonra otomatik olarak bir admin kullanıcısı oluşturulur:

**Kullanıcı Adı:** `admin`  
**Şifre:** `admin123`

⚠️ **ÖNEMLİ:** İlk girişten sonra admin şifresini mutlaka değiştirin!

### 3. Roller ve Yetkiler

Sistem 3 varsayılan rol ile gelir:

#### 1. **Admin (Sistem Yöneticisi)**
- Tüm yetkilere sahiptir
- Kullanıcı yönetimi yapabilir
- Rol ve yetki atamaları yapabilir
- Tüm sayfaları görüntüleyebilir ve işlem yapabilir

#### 2. **President (Okul Aile Birliği Başkanı)**
- İşlem ekleme, düzenleme, silme
- Kategori ekleme, düzenleme, silme
- Öğrenci ekleme, düzenleme, silme, içe aktarma
- Aidat ekleme, düzenleme, silme, ödeme yönetimi
- Mali raporları görüntüleme ve dışa aktarma
- **YAPAMAZ:** Admin paneline erişim, kullanıcı yönetimi

#### 3. **Principal (Okul Müdürü)**
- Tüm sayfaları **sadece görüntüleyebilir**
- Raporları görüntüleyebilir ve dışa aktarabilir
- **YAPAMAZ:** Ekleme, düzenleme, silme işlemleri, admin paneli

### 4. Yetki Sistemi Nasıl Çalışır?

#### Sayfa İzinleri
- `view_dashboard` - Ana sayfa
- `view_transactions` - İşlemler sayfası
- `view_categories` - Kategoriler sayfası
- `view_students` - Öğrenciler sayfası
- `view_fees` - Aidatlar sayfası
- `view_reports` - Raporlar sayfası
- `view_admin` - Admin paneli

#### İşlem İzinleri
Her modül için `create`, `edit`, `delete` izinleri vardır:
- İşlemler: `create_transaction`, `edit_transaction`, `delete_transaction`
- Kategoriler: `create_category`, `edit_category`, `delete_category`
- Öğrenciler: `create_student`, `edit_student`, `delete_student`, `import_students`
- Aidatlar: `create_fee`, `edit_fee`, `delete_fee`, `manage_payments`

#### Rapor İzinleri
- `view_financial_reports` - Mali raporları görme
- `view_student_reports` - Öğrenci raporları görme
- `export_reports` - Raporları dışa aktarma

#### Admin İzinleri
- `manage_users` - Kullanıcı yönetimi
- `manage_roles` - Rol yönetimi
- `manage_permissions` - İzin yönetimi

### 5. Admin Paneli Kullanımı

Admin paneline erişim: **http://localhost:9876/admin.html**

#### Kullanıcı Yönetimi
- Yeni kullanıcı ekleme
- Kullanıcı bilgilerini düzenleme
- Kullanıcı şifresi değiştirme
- Kullanıcı silme
- Kullanıcı aktivasyon durumunu değiştirme

#### Rol & Yetki Yönetimi
- Her rolün izinlerini görüntüleme
- Role yeni izin ekleme
- Rolden izin kaldırma
- İzinler kategori bazında gruplandırılmıştır

### 6. Yeni Kullanıcı Ekleme

1. Admin paneline giriş yapın
2. "Kullanıcı Yönetimi" sekmesinde "Yeni Kullanıcı" butonuna tıklayın
3. Formda:
   - **Kullanıcı Adı:** Benzersiz olmalı
   - **Şifre:** En az 6 karakter
   - **Ad ve Soyad:** Zorunlu
   - **E-posta:** İsteğe bağlı
   - **Rol:** Admin, President veya Principal seçin
   - **Aktif:** İşaretli ise kullanıcı giriş yapabilir
4. "Kaydet" butonuna tıklayın

### 7. Rol İzinlerini Değiştirme

1. Admin paneline giriş yapın
2. "Rol & Yetki Yönetimi" sekmesine geçin
3. Sol taraftan bir rol seçin
4. Sağ tarafta o rolün izinleri görünür
5. İzinleri işaretleyerek/kaldırarak değişiklik yapın
6. Değişiklikler otomatik olarak kaydedilir

### 8. Güvenlik Notları

⚠️ **Önemli Güvenlik Uyarıları:**

1. **Admin Şifresini Değiştirin:** İlk kurulumdan sonra varsayılan `admin123` şifresini mutlaka değiştirin

2. **Service Role Key Güvenliği:** 
   - `.env` dosyasındaki `SUPABASE_SERVICE_KEY` asla paylaşmayın
   - Production ortamında environment variables kullanın

3. **HTTPS Kullanımı:** 
   - Production'da mutlaka HTTPS kullanın
   - `SESSION_COOKIE_SECURE=true` yapın

4. **Güçlü Şifreler:** 
   - Tüm kullanıcılar için güçlü şifreler belirleyin
   - Minimum 8 karakter, harf, rakam ve özel karakter içermeli

5. **Yedekleme:** 
   - Düzenli veritabanı yedeği alın
   - Kullanıcı ve rol değişikliklerini loglayın

### 9. Sorun Giderme

#### "Bu sayfaya erişim yetkiniz yok" Hatası
- Kullanıcınızın doğru role sahip olduğundan emin olun
- Session'ın aktif olduğunu kontrol edin (logout/login yapın)
- Rolün gerekli izinlere sahip olduğunu kontrol edin

#### "Kullanıcı adı zaten kullanılıyor" Hatası
- Başka bir kullanıcı adı deneyin
- Kullanıcı adları benzersiz olmalıdır

#### Admin Paneli Açılmıyor
- Kullanıcınızın `admin` rolüne sahip olduğundan emin olun
- Tarayıcı konsolunda hata kontrolü yapın
- Session'ı yenilemek için logout/login yapın

### 10. Veritabanı Yapısı

#### `roles` Tablosu
- `id` - Primary key
- `rol_adi` - Rol adı (unique)
- `aciklama` - Rol açıklaması

#### `permissions` Tablosu
- `id` - Primary key
- `izin_adi` - İzin adı (unique)
- `kategori` - İzin kategorisi (sayfa, islem, kategori, ogrenci, aidat, rapor, admin)
- `aciklama` - İzin açıklaması

#### `role_permissions` Tablosu
- `id` - Primary key
- `rol_id` - roles tablosuna foreign key
- `izin_id` - permissions tablosuna foreign key
- Unique constraint: (rol_id, izin_id)

#### `users` Tablosu
- `id` - Primary key
- `kullanici_adi` - Kullanıcı adı (unique)
- `sifre_hash` - Bcrypt ile hashlenmiş şifre
- `ad`, `soyad` - Kullanıcı adı soyadı
- `eposta` - E-posta adresi (opsiyonel)
- `rol_id` - roles tablosuna foreign key
- `aktif` - Kullanıcı aktif mi? (boolean)
- `son_giris` - Son giriş zamanı
- `olusturma_tarihi`, `guncelleme_tarihi` - Timestamp'ler

## Yardım ve Destek

Sorun yaşıyorsanız:
1. Tarayıcı konsolunu kontrol edin (F12)
2. Server loglarını kontrol edin
3. SQL şemasının doğru çalıştığından emin olun
4. Session cookie'lerinin doğru ayarlandığından emin olun
