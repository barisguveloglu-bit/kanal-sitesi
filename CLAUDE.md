# Proje Notları

Bu depo bir **hikaye lore sitesi**. Türkçe bir kurgu evreninin arşivi.

## Önce bunu oku

Hikayenin canon kaynağı [`LORE.md`](LORE.md) — karakterler, güçler ve efsane
orada tanımlı. **Ama dosyayı baştan sona okuma:** 437 satır ve büyük kısmı
eldeki işle ilgisiz. `lore` becerisi (`.claude/skills/lore/`) hangi bölümün
okunacağını söyleyen bir harita tutuyor; önce ona bak, sonra sadece o bölümü oku.

## Hangi dosyaya ne için bakılır

| Soru | Dosya |
|---|---|
| Hikayede ne oluyor, kim kim | `LORE.md` — ilgili bölüm (`lore` becerisi) |
| İçerik nasıl eklenir, site nasıl yayınlanır | `README.md` |
| Renk, tipografi, animasyon, erişilebilirlik | `TASARIM.md` |
| Geçen oturumda ne yaptık, ne kaldı | `DEFTER.md` |
| Sayfada görünen her şeyin verisi | `assets/js/data.js` |
| Verinin HTML'e nasıl çevrildiği | `assets/js/app.js` |

Gereksiz dosya okumak bağlam penceresini doldurur ve yanıtı kötüleştirir.
Tabloda karşılığı olan soruyu tabloya bakarak cevapla.

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

## Bekleyen işler

Henüz netleşmemiş üç şey — bunlar canon değil, taslak:

- **İrade kademeleri.** `LORE.md` → `## 3. İrade Sistemi`, tablonun hemen
  üstünde "DURUM: TASLAK" yazıyor.
- **81 il derebeyi.** `### 81 il derebeyi` — kadro dolu değil.
- **Zaman çizelgesi.** 1728 ve 1730–1735 dışındaki tarihler belirsiz.

Güncel liste `DEFTER.md` içindeki en son kaydın "Kaldığımız yer" bölümünde.

## Oturum düzeni

- Oturum başında `DEFTER.md`'nin başı otomatik yüklenir
  (`.claude/settings.json` → `SessionStart`). Geçen seferden devam et.
- İş bitince **`/gunluk`** yaz — kararlar ve kalan işler deftere geçsin.
  Yazılmayan karar bir sonraki oturumda kaybolur.
- İçerik değiştirdikten sonra **`/lore-denetle`** ile `LORE.md` ↔ `data.js`
  tutarlılığını kontrol et.

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
