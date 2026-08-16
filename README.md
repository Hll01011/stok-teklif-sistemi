# Stok Teklif Sistemi

Mobil-first stok, cari, teklif ve stok hareketleri uygulaması.

## Modüller
- Genel bakış / KPI dashboard
- Stok kartları ve kritik stok görünümü
- Cari kartları ve bakiye takibi
- Teklif kayıtları
- Stok giriş / çıkış hareketleri
- Supabase Auth + PostgreSQL + RLS
- GitHub Pages dağıtımı
- Tam responsive mobil arayüz

## Canlı bağlantı
Uygulama `app.js` içindeki Supabase proje URL'sini kullanır. Publishable key'i `YOUR_SUPABASE_PUBLISHABLE_KEY` yerine ekleyin. Publishable/anon anahtar istemci tarafında kullanılmak üzere tasarlanmıştır; service-role anahtarını kesinlikle frontend'e koymayın.

## Veritabanı
`supabase/migrations/001_initial_schema.sql` migration'ı çalıştırıldığında tablolar, indeksler, RLS politikaları, kullanıcı profili trigger'ı ve stok hareketi trigger'ı oluşturulur.

## GitHub Pages
`.github/workflows/pages.yml` her `main` push'unda statik siteyi GitHub Pages'e deploy eder. Repository Settings → Pages altında Source olarak **GitHub Actions** seçili olmalıdır.
