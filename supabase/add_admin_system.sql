-- Admin ve Yetkilendirme Sistemi
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın

BEGIN;

-- 1. Roller tablosu
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    rol_adi VARCHAR(50) NOT NULL UNIQUE,
    aciklama TEXT,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. İzinler tablosu
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    izin_adi VARCHAR(100) NOT NULL UNIQUE,
    kategori VARCHAR(50) NOT NULL, -- 'sayfa', 'islem', 'ogrenci', 'kategori', 'aidat', 'rapor'
    aciklama TEXT,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Rol-İzin ilişki tablosu
CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGSERIAL PRIMARY KEY,
    rol_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    izin_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(rol_id, izin_id)
);

-- 4. Users tablosunu güncelle
-- Mevcut users tablosuna rol_id kolonu ekle (eğer yoksa)
-- Eğer users tablosu hiç yoksa oluştur
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    kullanici_adi VARCHAR(50) NOT NULL UNIQUE,
    sifre_hash TEXT NOT NULL,
    tam_ad VARCHAR(100) NOT NULL,
    eposta VARCHAR(255),
    rol_id BIGINT REFERENCES roles(id) ON DELETE SET NULL,
    aktif BOOLEAN NOT NULL DEFAULT true,
    son_giris TIMESTAMPTZ,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='rol_id') THEN
        ALTER TABLE users ADD COLUMN rol_id BIGINT REFERENCES roles(id) ON DELETE SET NULL;
    END IF;
END $$;


-- 5. Varsayılan rolleri ekle
INSERT INTO roles (rol_adi, aciklama) VALUES
    ('admin', 'Sistem Yöneticisi - Tüm yetkilere sahip'),
    ('president', 'Okul Aile Birliği Başkanı - Ekleme ve düzenleme yetkileri'),
    ('principal', 'Okul Müdürü - Görüntüleme ve raporlama yetkileri')
ON CONFLICT (rol_adi) DO NOTHING;

-- 6. Varsayılan izinleri ekle
INSERT INTO permissions (izin_adi, kategori, aciklama) VALUES
    -- Sayfa izinleri
    ('view_dashboard', 'sayfa', 'Ana sayfa görüntüleme'),
    ('view_transactions', 'sayfa', 'İşlemler sayfası görüntüleme'),
    ('view_categories', 'sayfa', 'Kategoriler sayfası görüntüleme'),
    ('view_students', 'sayfa', 'Öğrenciler sayfası görüntüleme'),
    ('view_fees', 'sayfa', 'Aidatlar sayfası görüntüleme'),
    ('view_reports', 'sayfa', 'Raporlar sayfası görüntüleme'),
    ('view_admin', 'sayfa', 'Admin paneli görüntüleme'),
    
    -- İşlem izinleri
    ('create_transaction', 'islem', 'İşlem ekleme'),
    ('edit_transaction', 'islem', 'İşlem düzenleme'),
    ('delete_transaction', 'islem', 'İşlem silme'),
    
    -- Kategori izinleri
    ('create_category', 'kategori', 'Kategori ekleme'),
    ('edit_category', 'kategori', 'Kategori düzenleme'),
    ('delete_category', 'kategori', 'Kategori silme'),
    
    -- Öğrenci izinleri
    ('create_student', 'ogrenci', 'Öğrenci ekleme'),
    ('edit_student', 'ogrenci', 'Öğrenci düzenleme'),
    ('delete_student', 'ogrenci', 'Öğrenci silme'),
    ('import_students', 'ogrenci', 'Toplu öğrenci içe aktarma'),
    
    -- Aidat izinleri
    ('create_fee', 'aidat', 'Aidat ekleme'),
    ('edit_fee', 'aidat', 'Aidat düzenleme'),
    ('delete_fee', 'aidat', 'Aidat silme'),
    ('manage_payments', 'aidat', 'Ödeme yönetimi'),
    
    -- Rapor izinleri
    ('view_financial_reports', 'rapor', 'Mali raporları görüntüleme'),
    ('view_student_reports', 'rapor', 'Öğrenci raporları görüntüleme'),
    ('export_reports', 'rapor', 'Raporları dışa aktarma'),
    
    -- Admin izinleri
    ('manage_users', 'admin', 'Kullanıcı yönetimi'),
    ('manage_roles', 'admin', 'Rol yönetimi'),
    ('manage_permissions', 'admin', 'İzin yönetimi')
ON CONFLICT (izin_adi) DO NOTHING;

-- 7. Admin rolüne tüm izinleri ver
INSERT INTO role_permissions (rol_id, izin_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.rol_adi = 'admin'
ON CONFLICT (rol_id, izin_id) DO NOTHING;

-- 8. President (Başkan) rolüne uygun izinleri ver
INSERT INTO role_permissions (rol_id, izin_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.rol_adi = 'president'
AND p.izin_adi IN (
    'view_dashboard',
    'view_transactions',
    'view_categories',
    'view_students',
    'view_fees',
    'view_reports',
    'create_transaction',
    'edit_transaction',
    'delete_transaction',
    'create_category',
    'edit_category',
    'delete_category',
    'create_student',
    'edit_student',
    'delete_student',
    'import_students',
    'create_fee',
    'edit_fee',
    'delete_fee',
    'manage_payments',
    'view_financial_reports',
    'view_student_reports',
    'export_reports'
)
ON CONFLICT (rol_id, izin_id) DO NOTHING;

-- 9. Principal (Müdür) rolüne sadece görüntüleme ve rapor izinleri ver
INSERT INTO role_permissions (rol_id, izin_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.rol_adi = 'principal'
AND p.izin_adi IN (
    'view_dashboard',
    'view_transactions',
    'view_categories',
    'view_students',
    'view_fees',
    'view_reports',
    'view_financial_reports',
    'view_student_reports',
    'export_reports'
)
ON CONFLICT (rol_id, izin_id) DO NOTHING;

-- Create the first administrator with npm run create-admin (see README.md).

COMMIT;

-- ✅ Admin sistemi kuruldu
-- 
-- ⚠️ UYARI: İlk girişten sonra admin şifresini mutlaka değiştirin!


-- Server-only access: application sessions are verified by Express, not Supabase Auth.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
-- Run after the existing schema. No business data is deleted.
BEGIN;
DO $$
DECLARE table_name text; policy_record record;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','roles','permissions','role_permissions','categories','students','transactions','student_fees','payments'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', policy_record.policyname, table_name);
      END LOOP;
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
