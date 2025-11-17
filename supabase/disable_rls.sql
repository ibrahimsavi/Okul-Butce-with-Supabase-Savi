-- RLS'i Tüm Tablolardan Kaldır
-- Kendi sunucunuzda çalışan Supabase için
-- Backend seviyesinde authentication zaten mevcut

BEGIN;

-- RLS'i devre dışı bırak
ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Mevcut tüm RLS politikalarını kaldır
DROP POLICY IF EXISTS "Service role can do everything on categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can read categories" ON categories;
DROP POLICY IF EXISTS "Service role can do everything on students" ON students;
DROP POLICY IF EXISTS "Authenticated users can read students" ON students;
DROP POLICY IF EXISTS "Service role can do everything on transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can read transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can do everything on student_fees" ON student_fees;
DROP POLICY IF EXISTS "Authenticated users can read student_fees" ON student_fees;
DROP POLICY IF EXISTS "Service role can do everything on payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can read payments" ON payments;

COMMIT;

-- ✅ RLS devre dışı bırakıldı
-- ⚠️ Güvenlik şimdi tamamen backend middleware'inizde (auth.js)
