# Güvenli kurulum ve geçiş

Bu sürüm canlı veritabanına kendiliğinden değişiklik uygulamaz. Mevcut kurulum için bakım penceresinde şu sırayı izleyin:

1. Veritabanını yedekleyin. `full_setup.sql` ve `reset_schema.sql` mevcut kayıtları siler; yükseltme sırasında bunları çalıştırmayın.
2. Sunucuya `SUPABASE_SERVICE_KEY` (service_role), güçlü `SESSION_SECRET`, oturum deposu için `DATABASE_URL` ve HTTPS adresinizle `APP_ORIGIN` tanımlayın. `SUPABASE_ANON_KEY` artık kullanılmaz. Anahtarları tarayıcıya göndermeyin.
3. Supabase SQL Editor'de `supabase/harden_access.sql`, ardından `supabase/harden_payments.sql` çalıştırın. İlki anonim ve Supabase Auth kullanıcılarının bu uygulamanın tablolarına doğrudan erişimini kapatır. İkincisi ödeme ve bakiye güncellemelerini tek veritabanı işlemi içinde tutar; eşzamanlı fazla ödemeyi ve aidat tutarının ödenenden aşağı çekilmesini reddeder.
4. `SESSION_COOKIE_SECURE=true` kullanın. Ters proxy varsa `TRUST_PROXY` içine yalnızca gerçek proxy IP/CIDR adreslerini yazın; proxy HTTPS için `X-Forwarded-Proto: https` göndermeli ve istemciden gelen bu başlığı değiştirmelidir. Doğrudan HTTP erişimini dışarıya kapatın.
5. `npm ci`, `npm test`, ardından `npm start`. `/health` oturum gerektirmez; mali veri içermez. `DATABASE_URL` kullanıcısının `private` şemasında session tablosunu oluşturma izni olmalı; bu şemayı Supabase Data API üzerinden erişilebilir kılmayın. Geçiş dosyası private şemasını oluşturur ve anonim erişimini kaldırır.
6. Varsayılan parolayla oluşturulmuş mevcut yönetici hesabının şifresini değiştirin. Yeni kurulumda roller oluşturulduktan sonra `ADMIN_USERNAME` ve `ADMIN_PASSWORD` ortam değişkenleriyle `npm run create-admin` çalıştırın; ardından bu değişkenleri kaldırın. Komut mevcut hesapları veya şifreleri değiştirmez.

Üretimde kalıcı PostgreSQL oturum deposu zorunludur. Yerel geliştirmede `NODE_ENV=development`, `SESSION_COOKIE_SECURE=false`, yerel `APP_ORIGIN` ve ayrı test veritabanı kullanılabilir. Şifre değişikliği/pasifleştirme eski oturumları sonraki istekte geçersiz kılar. Her yeni giriş oturum kimliğini yeniler. İzinler sunucuda her işlem için tekrar okunur.

Giriş deneme sınırı işlem belleğindedir; çoklu sunucu kurulumunda proxy üzerinde ortak hız sınırı da uygulanmalıdır. Mevcut sayfalar satır içi betikler ve CDN kaynakları kullandığından CSP yalnızca çerçeve, nesne ve base URI sınırlarını uygular; tam betik CSP geçişi bu sürümün kapsamı dışındadır.

Kontroller sahte veritabanıyla HTTP/arayüz testleri ve yerel PostgreSQL uyumlu test motoruyla migration testleridir. Canlı Supabase erişim ayarları, proxy yapılandırması ve mevcut veriler ayrıca doğrulanmalıdır.
