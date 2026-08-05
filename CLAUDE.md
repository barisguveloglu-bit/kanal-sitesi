# Proje Notları

Bu depo bir **hikaye lore sitesi**. Türkçe bir kurgu evreninin arşivi.

## Önce bunu oku

Hikayenin canon kaynağı [`LORE.md`](LORE.md). Herhangi bir içerik değişikliği
yapmadan önce o dosyayı oku — karakterler, güçler ve efsane orada tanımlı.

## Yapı

- Statik site: HTML + CSS + vanilla JS. **Derleme adımı, paket yöneticisi yok.**
  Backend yok, veritabanı yok, hiçbir dış servise bağlı değil.
- Bütün içerik `assets/js/data.js` içinde veri olarak duruyor.
- `assets/js/app.js` bu veriyi `data-*` noktalarına basıyor.
- **Menü ve alt bilgi `app.js` üretmiyor** — her HTML dosyasında yazılı.
  `app.js` menüde sadece açık sayfayı işaretliyor ve mobil düğmeyi çalıştırıyor;
  alt bilgide sadece kanal bağlantısını (`data-kanal`) dolduruyor.
- HTML sayfaları sadece iskelet + `data-*` bağlama noktaları içeriyor.

## Kurallar

- Yeni karakter/güç/kademe eklerken **HTML'e dokunma** — `data.js` yeterli.
- İçerik değişince `LORE.md` ile `data.js` senkron kalmalı.
- Arayüz metinleri **Türkçe**.
- Kod içindeki değişken ve fonksiyon isimleri de Türkçe (mevcut düzene uy).
- **Sitede hiç kullanıcı verisi toplanmıyor.** Form yok, giriş yok, çerez yok.
  Soru-cevap YouTube yorumlarında yapılıyor; site sadece oraya yönlendiriyor.
  Buraya backend eklemeden önce iki kez düşün — sadeliği bilinçli bir tercih.

## Prosedürler

Sık yapılan işlerin adımları `.claude/skills/` altında duruyor; buraya
kopyalanmıyor ki bu dosya şişmesin. İşe başlarken ilgili olanı aç:

| Ne yapıyorsun | Skill |
|---|---|
| Karakter, güç, kademe, derebeyi, icraat — hikaye içeriği | `canon-ekle` |
| Yeni HTML sayfası, sayfa silme veya yeniden adlandırma | `sayfa-ekle` |
| Ana sayfadaki YouTube bölümlerini doldurma | `video-ekle` |

## Bekleyen işler

- **Hikaye tarafı:** [`LORE.md`](LORE.md) bölüm 10 "Açık Uçlar".
  Şu an açık olan iki şey var: irade kademeleri hâlâ TASLAK ve vakayiname
  tarihi (1730 mü 1731 mi) karara bağlanmadı. Derebeyi isimleri kapandı.
- **Site tarafı:** `data.js` içindeki `VIDEOLAR` bloğu tamamen boş, yani ana
  sayfanın en görünür bölümü hiç basılmıyor. Doldurmak için gerçek YouTube
  kimlikleri lazım — **uydurma, iste.**

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
