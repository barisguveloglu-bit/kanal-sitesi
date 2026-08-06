# Proje Notları

Bu depo bir **hikaye lore sitesi**. Türkçe bir kurgu evreninin arşivi.

## Önce bunu oku

Hikayenin canon kaynağı [`LORE.md`](LORE.md). Herhangi bir içerik değişikliği
yapmadan önce o dosyayı oku — karakterler, güçler ve efsane orada tanımlı.

## Yapı

- Statik site: HTML + CSS + vanilla JS. **Derleme adımı, paket yöneticisi yok.**
  Backend yok, veritabanı yok, hiçbir dış servise bağlı değil.
- Bütün içerik `assets/js/data.js` içinde veri olarak duruyor.
- `assets/js/app.js` bu veriyi HTML'e çeviriyor; menü ve alt bilgi de oradan geliyor.
- HTML sayfaları sadece iskelet + `data-*` bağlama noktaları içeriyor.

## Kurallar

- Yeni karakter/güç/kademe eklerken **HTML'e dokunma** — `data.js` yeterli.
- İçerik değişince `LORE.md` ile `data.js` senkron kalmalı.
- Arayüz metinleri **Türkçe**.
- Kod içindeki değişken ve fonksiyon isimleri de Türkçe (mevcut düzene uy).
- **Sitede hiç kullanıcı verisi toplanmıyor.** Form yok, giriş yok, çerez yok.
  Soru-cevap YouTube yorumlarında yapılıyor; site sadece oraya yönlendiriyor.
  Buraya backend eklemeden önce iki kez düşün — sadeliği bilinçli bir tercih.

## Denetim — içerik değiştirdiysen çalıştır

```
node arac/denetim.mjs
```

Bağımlılığı yok, kurulum istemiyor. Üç şeyi ölçüyor:

1. `data.js` kendi içinde tutarlı mı — 81 il eksiksiz mi, her cephede 27 il
   var mı, tekrar eden isim/plaka var mı, `gucEtiketi` ile `tir` uyuşuyor mu,
   icraatlerdeki karakterler tanımlı mı.
2. `LORE.md` ile `data.js` aynı şeyi mi söylüyor — derebeyi isimleri, cephe
   dağılımı, karakter ve komutan adları.
3. Site bütün mü — menü bütün sayfalarda aynı mı, kırık iç bağlantı var mı,
   `sitemap.xml` eksik/fazla sayfa listeliyor mu.

Hata varsa çıkış kodu 1. Aynı betik her push'ta GitHub Actions'ta da koşuyor
(`.github/workflows/denetim.yml`).

**Uyarı ile hata farklı.** Eksik derebeyi adı gibi şeyler *uyarı* — site
çalışır. Canon ile verinin ayrışması *hata* — düzeltilmeli.

Denetime yeni kural eklersen `arac/denetim-testi.sh` ile doğrula: betik
kasten bozulmuş verileri gerçekten yakalıyor mu? Hiçbir şey yakalamayan
denetim, denetim değildir.

## Bekleyen işler

`LORE.md` dosyasının sonundaki "Açık Uçlar" bölümüne bak — irade kademelerinin
son hâli, derebeyi isimleri ve zaman çizelgesi henüz netleşmedi.

## Denetim sonrası eklenen kurallar

Bu kısım dış bir kullanıcı deneyimi denetiminden sonra eklendi.
Aşağıdakiler bilinçli kararlar — "düzeltilecek eksik" değil.

- **Menü artık `app.js` üretmiyor**, her HTML'de yazılı. JavaScript
  yüklenmezse navigasyon kaybolmasın diye. Yeni sayfa eklersen menüyü
  bütün HTML dosyalarında ve `sitemap.xml` içinde güncelle.
- **Sahte içerik yasak.** `VIDEOLAR` boşken ana sayfadaki video bölümleri
  `hidden` kalır. Örnek başlık, "yakında", uydurma bağlantı **üretme** —
  boş bırak, eksik olduğunu rapor et.
- **Gizleme her zaman `hidden` özniteliğiyle** yapılır, `opacity: 0` ile
  değil. Hareket azaltma açıkken `style.css` bütün geçişleri kapatıyor;
  opacity ile gizlenen bir şey bir daha asla görünmez.
  Bu yüzden `[hidden] { display: none !important; }` kuralı var — silme.
- **Renk paleti ölçülerek belirlendi.** `--text-3`, `--kotu-metin` ve
  `--bolge-renk` değerleri WCAG AA (4.5:1) sınırına göre hesaplandı.
  Değiştireceksen önce kontrastı ölç.
- **Odak halkası silinmez.** `outline: none` yazma; `:focus-visible`
  tasarımı bilerek var.
- Betikler `defer` ile yükleniyor (ilk boyama ~%28 hızlandı). Sıra korunur,
  bozma.
