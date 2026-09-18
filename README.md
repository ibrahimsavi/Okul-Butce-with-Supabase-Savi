# Savi Bütçe

Okul bütçesi, gelir–gider, öğrenci, aidat, ödeme ve Excel raporlarını yöneten Türkçe web uygulaması. Express, Supabase PostgreSQL ve sunucu taraflı oturum kullanır.

## Kurulum

Önce [güvenli kurulum ve yükseltme kılavuzunu](SECURITY.md) okuyun. `.env.example` dosyasından `.env` oluşturun ve gerçek sunucu değerlerini girin. Gizli anahtarları Git'e eklemeyin.

```sh
npm ci
npm test
npm start
```

Uygulama varsayılan olarak 9876 portunda çalışır. Üretimde HTTPS, güçlü oturum anahtarı ve PostgreSQL oturum deposu zorunludur. İlk yöneticiyi roller oluşturulduktan sonra `npm run create-admin` ile oluşturun; bu komut `ADMIN_USERNAME` ve `ADMIN_PASSWORD` ortam değişkenlerini kullanır.

**Mevcut kurulum:** Yalnızca `supabase/harden_access.sql` ve `supabase/harden_payments.sql` geçişlerini uygulayın. `full_setup.sql` ve `reset_schema.sql` verileri siler; yükseltmede kullanmayın. Sıfırdan demo kurulumunda `full_setup.sql` örnek öğrenci ve finans kayıtları içerir.

## Erişim ve kullanım

- Admin tüm işlemleri yönetir. Diğer rollerin görüntüleme, ekleme, düzenleme ve silme izinleri her API isteğinde kontrol edilir.
- Öğrenci, kategori ve işlem metinleri HTML'e güvenli biçimde aktarılır.
- Aidat listesi ödemeleri toplar; özet servisinde bekleyen ve geciken tutarlar kalan borcu gösterir. Toplam aidat tutarı tahakkuk tutarıdır.
- Toplu aidat atama tek istekte 1–500 öğrenciyle sınırlıdır. Daha büyük okullarda sınıf bazında bölün.
- Aidat düzenlemede öğrenci değiştirilemez. Ödenen tutarın altına düşen aidat veya kalan borcu aşan ödeme veritabanında reddedilir.
- Ödeme kaydı ve aidat durumu aynı veritabanı işlemi içinde güncellenir.
- Görünüm tüm sayfalarda ortak tema, erişilebilir odak göstergeleri ve mobil gezinme kullanır.

## Doğrulama

`npm test` HTTP üzerinden oturum, yetki, kaynak kontrolü ve giriş sınırını; girdi doğrulamayı, HTML kaçışını ve Excel üretimini kontrol eder. Geçiş testleri yerel PGlite üzerinde şemayı, erişim engelini ve ödeme kurallarını çalıştırır. Testler canlı veritabanına bağlanmaz. `npm audit` bağımlılık taramasını çalıştırır.

Canlıya geçiş öncesinde Supabase migration'larını, gerçek proxy ayarlarını, yetkili/yetkisiz kullanıcıları ve test ödemelerini ayrı test ortamında doğrulayın. Güvenlik ve kalan işletim sınırları [SECURITY.md](SECURITY.md) içinde açıklanır.
