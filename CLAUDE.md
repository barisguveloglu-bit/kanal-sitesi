# Proje Notları

Bu depo bir **hikaye lore sitesi**. Türkçe bir kurgu evreninin arşivi.

## Önce bunu oku

Hikayenin canon kaynağı [`LORE.md`](LORE.md). Herhangi bir içerik değişikliği
yapmadan önce o dosyayı oku — karakterler, güçler ve efsane orada tanımlı.

## Yapı

- Statik site: HTML + CSS + vanilla JS. **Derleme adımı, paket yöneticisi yok.**
  Backend yok, veritabanı yok, hiçbir dış servise bağlı değil.
- Bütün içerik `assets/js/data.js` içinde veri olarak duruyor.
- `assets/js/app.js` bu veriyi HTML'e çeviriyor; alt bilgi de oradan geliyor.
  Menü ise her HTML'de yazılı — `app.js` sadece davranışını yönetir
  (aktif bağlantı, telefonda katlama).
- HTML sayfaları sadece iskelet + `data-*` bağlama noktaları içeriyor.

## Bağlam haritası — hangi iş için hangi dosyayı oku

| İş | Oku |
|---|---|
| Hikaye / içerik değişikliği | `LORE.md` (canon) → sonra `assets/js/data.js` |
| Tasarım / animasyon | `TASARIM.md` — kısıtlar, renk sistemi, `icerik-hazir` olayı |
| Video ekleme, yeni sayfa, yayınlama | `README.md` |
| Render mantığı, alt bilgi | `assets/js/app.js` |

`LORE.md` uzun; tamamını okumak şart değil, ilgili bölüm yeter. Bölümleri:
1 Temel Fikir · 2 Kuruyan Ağaç ve Yılmaz · 3 İrade Sistemi (taslak) ·
4 Karakterler · 5 Mafya Yapısı ve 81 derebeyi · 6 Tır Değerleri (iç referans) ·
7 Güçlerin Kaynağı · 8 Beyin Yıkama Yöntemi · 9 Kapatılan Diğer Uçlar.

## Kurallar

- Yeni karakter/güç/kademe eklerken **HTML'e dokunma** — `data.js` yeterli.
- İçerik değişince `LORE.md` ile `data.js` senkron kalmalı.
- Arayüz metinleri **Türkçe**.
- Kod içindeki değişken ve fonksiyon isimleri de Türkçe (mevcut düzene uy).
- **Sitede hiç kullanıcı verisi toplanmıyor.** Form yok, giriş yok, çerez yok.
  Soru-cevap YouTube yorumlarında yapılıyor; site sadece oraya yönlendiriyor.
  Buraya backend eklemeden önce iki kez düşün — sadeliği bilinçli bir tercih.

## Bekleyen işler

- **İrade kademeleri hâlâ taslak** — `LORE.md` §3'teki "DURUM: TASLAK" notu
  duruyor; 5 kademe birlikte detaylandırılacak.
- **`VIDEOLAR` boş** — ana sayfadaki video bölümleri bu yüzden gizli.
- **Zaman çizelgesi yazılmadı** — 1728'den bugüne olayların sırası
  `LORE.md`'de dağınık, tek bir çizelgede toplanmadı.
- Derebeyi isimleri netleşti: 81'i de `LORE.md` §5 ve `data.js` içinde tanımlı.
  (Eski notlardaki "Açık Uçlar" bölümü artık yok; kapatılanlar
  `LORE.md` §9'da.)

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
