-- Supabase Schema Reset (Turkish column names without diacritics)
BEGIN;

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS student_fees CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    kategori_adi VARCHAR(255) NOT NULL UNIQUE,
    tur VARCHAR(10) NOT NULL CHECK (tur IN ('gelir', 'gider')),
    aciklama TEXT,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    ogrenci_numarasi VARCHAR(50) UNIQUE,
    ad VARCHAR(100) NOT NULL,
    soyad VARCHAR(100) NOT NULL,
    sinif VARCHAR(50) NOT NULL,
    sube VARCHAR(50),
    durum VARCHAR(20) NOT NULL DEFAULT 'aktif',
    veli_adi VARCHAR(150),
    veli_telefonu VARCHAR(25),
    veli_eposta VARCHAR(255),
    adres TEXT,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    islem_turu VARCHAR(10) NOT NULL CHECK (islem_turu IN ('gelir', 'gider')),
    tutar NUMERIC(12, 2) NOT NULL,
    aciklama TEXT NOT NULL,
    kategori_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    ogrenci_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
    islem_tarihi DATE NOT NULL,
    notlar TEXT,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_fees (
    id BIGSERIAL PRIMARY KEY,
    ogrenci_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    aciklama TEXT NOT NULL,
    tutar NUMERIC(12, 2) NOT NULL,
    son_odeme_tarihi DATE NOT NULL,
    durum VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (durum IN ('pending', 'paid', 'overdue')),
    notlar TEXT,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    aidat_id BIGINT NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
    tutar NUMERIC(12, 2) NOT NULL,
    odeme_tarihi DATE NOT NULL,
    odeme_yontemi VARCHAR(20) NOT NULL CHECK (odeme_yontemi IN ('cash', 'bank_transfer', 'credit_card', 'check')),
    makbuz_numarasi VARCHAR(50),
    notlar TEXT,
    islem_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (kategori_adi, tur, aciklama) VALUES
('Ogrenci Aidati', 'gelir', 'Ogrencilerden alinan duzenli aidatlar'),
('Bagis ve Yardimlar', 'gelir', 'Kuruma yapilan bagislar'),
('Etkinlik Gelirleri', 'gelir', 'Etkinliklerden elde edilen gelirler'),
('Kirtasiye Gideri', 'gider', 'Ofis ve okul kirtasiye giderleri'),
('Elektrik Faturasi', 'gider', 'Elektrik faturasi odemeleri'),
('Su Faturasi', 'gider', 'Su faturasi odemeleri'),
('Temizlik Gideri', 'gider', 'Temizlik malzemeleri ve hizmetleri'),
('Kira Gideri', 'gider', 'Bina veya ofis kira odemeleri');

INSERT INTO students (ogrenci_numarasi, ad, soyad, sinif, sube, durum, veli_adi, veli_telefonu, veli_eposta) VALUES
('2024001', 'Ahmet', 'Yilmaz', '9', 'A', 'aktif', 'Mehmet Yilmaz', '05551234567', 'mehmet.yilmaz@example.com'),
('2024002', 'Ayse', 'Kaya', '9', 'B', 'aktif', 'Fatma Kaya', '05559876543', 'fatma.kaya@example.com'),
('2024003', 'Mehmet', 'Demir', '10', 'A', 'aktif', 'Ali Demir', '05556549876', 'ali.demir@example.com'),
('2024004', 'Zeynep', 'Celik', '10', 'B', 'aktif', 'Emine Celik', '05553216547', 'emine.celik@example.com'),
('2024005', 'Can', 'Ozturk', '11', 'A', 'aktif', 'Huseyin Ozturk', '05557894561', 'huseyin.ozturk@example.com'),
('2024006', 'Elif', 'Sahin', '11', 'B', 'aktif', 'Ayse Sahin', '05552348765', 'ayse.sahin@example.com'),
('2024007', 'Burak', 'Arslan', '12', 'A', 'aktif', 'Mustafa Arslan', '05558523697', 'mustafa.arslan@example.com'),
('2024008', 'Selin', 'Kilic', '12', 'B', 'aktif', 'Zehra Kilic', '05554567891', 'zehra.kilic@example.com');

INSERT INTO transactions (islem_turu, tutar, aciklama, kategori_id, ogrenci_id, islem_tarihi, notlar) VALUES
('gelir', 1500.00, 'Aylik aidat odemesi - Ahmet Yilmaz', 1, 1, '2024-11-01', 'Nakit odeme'),
('gelir', 1500.00, 'Aylik aidat odemesi - Ayse Kaya', 1, 2, '2024-11-01', 'Banka havalesi'),
('gelir', 1500.00, 'Aylik aidat odemesi - Mehmet Demir', 1, 3, '2024-11-02', 'Kredi karti'),
('gelir', 5000.00, 'Yilsonu etkinligi gelirleri', 3, NULL, '2024-11-05', 'Kermes geliri'),
('gider', 850.00, 'Ofis kirtasiye malzemeleri', 4, NULL, '2024-11-03', 'A4 kagit, kalem, dosya vb'),
('gider', 1250.00, 'Kasim ayi elektrik faturasi', 5, NULL, '2024-11-10', 'TEDAS fatura no: 12345'),
('gider', 450.00, 'Kasim ayi su faturasi', 6, NULL, '2024-11-10', 'ISKI fatura no: 67890'),
('gider', 3500.00, 'Ofis kira odemesi', 8, NULL, '2024-11-01', 'Kasim ayi kira');

INSERT INTO student_fees (ogrenci_id, aciklama, tutar, son_odeme_tarihi, durum, notlar) VALUES
(1, 'Kasim 2024 Aylik Aidat', 1500.00, '2024-11-05', 'paid', 'Tam olarak odendi'),
(2, 'Kasim 2024 Aylik Aidat', 1500.00, '2024-11-05', 'paid', 'Tam olarak odendi'),
(3, 'Kasim 2024 Aylik Aidat', 1500.00, '2024-11-05', 'paid', 'Tam olarak odendi'),
(4, 'Kasim 2024 Aylik Aidat', 1500.00, '2024-11-05', 'pending', 'Henuz odenmedi'),
(5, 'Kasim 2024 Aylik Aidat', 1500.00, '2024-11-05', 'pending', 'Henuz odenmedi'),
(6, 'Kasim 2024 Aylik Aidat', 1500.00, '2024-11-05', 'overdue', 'Son odeme tarihi gecti'),
(7, 'Kasim 2024 Aylik Aidat', 1500.00, '2024-11-05', 'paid', 'Tam olarak odendi'),
(8, 'Kasim 2024 Aylik Aidat', 1500.00, '2024-11-05', 'pending', 'Henuz odenmedi'),
(1, 'Aralik 2024 Aylik Aidat', 1500.00, '2024-12-05', 'pending', 'Aralik donemi aidati'),
(2, 'Aralik 2024 Aylik Aidat', 1500.00, '2024-12-05', 'pending', 'Aralik donemi aidati');

INSERT INTO payments (aidat_id, tutar, odeme_tarihi, odeme_yontemi, makbuz_numarasi, notlar, islem_id) VALUES
(1, 1500.00, '2024-11-01', 'cash', 'MKB-2024-001', 'Tam odeme - nakit', 1),
(2, 1500.00, '2024-11-01', 'bank_transfer', 'MKB-2024-002', 'Tam odeme - havale', 2),
(3, 1500.00, '2024-11-02', 'credit_card', 'MKB-2024-003', 'Tam odeme - kredi karti', 3),
(7, 1500.00, '2024-11-03', 'cash', 'MKB-2024-004', 'Tam odeme - nakit', NULL);

COMMIT;
