# Row Level Security (RLS) Kurulum Rehberi

## RLS Nedir?
Row Level Security (RLS), Supabase'de veritabanı seviyesinde güvenlik sağlayan bir özelliktir. RLS aktif olduğunda, her tablo için özel politikalar tanımlamanız gerekir.

## Adımlar

### 1. RLS Politikalarını Etkinleştir

`enable_rls_policies.sql` dosyasını Supabase Dashboard'da çalıştırın:

1. Supabase Dashboard'unuza gidin
2. **SQL Editor** sekmesini açın
3. **New Query** butonuna tıklayın
4. `supabase/enable_rls_policies.sql` dosyasının içeriğini kopyalayıp yapıştırın
5. **Run** butonuna tıklayın

### 2. Service Role Key'i Kontrol Edin

`.env` dosyanızda `SUPABASE_SERVICE_KEY` değerinin doğru olduğundan emin olun. Bu key, RLS politikalarını bypass eder ve backend tarafından kullanılır.

**Önemli:** `SUPABASE_SERVICE_KEY` ve `SUPABASE_ANON_KEY` farklı değerler olmalıdır!

Service Role Key'i bulmak için:
1. Supabase Dashboard > Settings > API
2. **Project API keys** bölümünde **service_role** key'ini kopyalayın
3. `.env` dosyanızdaki `SUPABASE_SERVICE_KEY` değerini güncelleyin

### 3. Sunucuyu Yeniden Başlatın

```bash
npm start
```

## Politika Açıklamaları

### Service Role Politikaları
Backend'iniz (Express server) **service_role** key ile tüm işlemleri yapabilir:
- Okuma (SELECT)
- Ekleme (INSERT)
- Güncelleme (UPDATE)
- Silme (DELETE)

### Authenticated User Politikaları
Kimliği doğrulanmış kullanıcılar sadece okuma yapabilir. Bu frontend tarafından kullanılır.

## Sorun Giderme

### "new row violates row-level security policy" hatası alıyorsanız:
- `SUPABASE_SERVICE_KEY` doğru ayarlandığından emin olun
- `database.js` dosyasının güncellendiğinden emin olun
- Sunucuyu yeniden başlatın

### RLS'i tamamen kapatmak isterseniz:
```sql
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

## Güvenlik Notu

⚠️ **Production ortamında:**
- `SUPABASE_SERVICE_KEY`'i güvenli tutun
- Asla frontend kodunda kullanmayın
- Sadece backend/server tarafında kullanın
- Environment variables'ları güvenli bir şekilde saklayın
