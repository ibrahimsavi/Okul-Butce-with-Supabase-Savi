-- Row Level Security (RLS) Politikalarını Etkinleştir
-- Self-hosted Supabase için basit politikalar
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın

BEGIN;

-- RLS'i tüm tablolar için etkinleştir
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Herkes için tam erişim politikaları (Backend auth.js middleware'i güvenliği sağlar)
-- ANON_KEY ile bile tüm işlemler yapılabilir

-- Categories için politikalar
CREATE POLICY "Allow all access to categories"
ON categories
FOR ALL
USING (true)
WITH CHECK (true);

-- Students için politikalar
CREATE POLICY "Allow all access to students"
ON students
FOR ALL
USING (true)
WITH CHECK (true);

-- Transactions için politikalar
CREATE POLICY "Allow all access to transactions"
ON transactions
FOR ALL
USING (true)
WITH CHECK (true);

-- Student Fees için politikalar
CREATE POLICY "Allow all access to student_fees"
ON student_fees
FOR ALL
USING (true)
WITH CHECK (true);

-- Payments için politikalar
CREATE POLICY "Allow all access to payments"
ON payments
FOR ALL
USING (true)
WITH CHECK (true);

COMMIT;

-- ✅ RLS aktif ancak tüm erişimlere izin veriyor
-- ⚠️ Gerçek güvenlik backend middleware'de (auth.js) sağlanıyor
