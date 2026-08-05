# Proje Notları

Türkçe bir kurgu evreninin **hikaye lore sitesi**.

Statik site: HTML + CSS + vanilla JS. **Derleme adımı yok, paket yöneticisi
yok, backend yok, veritabanı yok, dış servis yok.** Dosyalar doğrudan
GitHub Pages'ten tarayıcıya gidiyor.

- Hikayenin canon kaynağı **[`LORE.md`](LORE.md)**.
- Bütün site içeriği veri olarak **`assets/js/data.js`** içinde.
- **[`HARITA.md`](HARITA.md)** neyin hangi dosyanın hangi satırlarında
  olduğunu söylüyor. Büyük dosyaları baştan sona okuma — haritadan aralığı
  al, sadece onu oku.
- Değişiklikten sonra **`./kontrol.sh`** çalıştır.

## Görev → nereye bak

| Yapacağın | Oku | Değiştir | Dokunma |
|---|---|---|---|
| Karakter ekle/düzenle | `LORE.md` §4 | `LORE.md` §4 + `data.js` `KARAKTERLER` | HTML, `app.js` |
| İcraat ekle | — | `data.js` `ICRAATLER` | HTML |
| İrade kademesi değiştir | `LORE.md` §3 | `LORE.md` §3 + `data.js` `IRADE_KADEMELERI` | HTML |
| Derebeyi / komutan | `LORE.md` §5 | `LORE.md` §5 + `data.js` `KOMUTANLAR` / `IL_DEREBEYLERI` | HTML |
| Video ekle | `README.md` "YouTube videolarını eklemek" | `data.js` `VIDEOLAR` | HTML |
| Hikaye olayı / zaman çizelgesi | `LORE.md` ilgili bölüm | `LORE.md` **önce**, sonra `data.js` | — |
| Renk, tipografi, boşluk | `TASARIM.md` | `style.css` `:root` (bkz. **Değişmezler**) | — |
| Animasyon | `animasyon.js` başındaki yorum | `animasyon.css` + `animasyon.js` | `style.css` |
| Yeni sayfa | `README.md` "Yeni sayfa eklemek" | Yeni HTML + **8 HTML'in menüsü** + `sitemap.xml` | — |

**Yeni karakter/güç/kademe eklerken HTML'e dokunma** — `data.js` yeterli.
İçerik değişince `LORE.md` ile `data.js` senkron kalmalı; `kontrol.sh`
sayıların tuttuğunu denetliyor.

Arayüz metinleri **Türkçe**. Kod içindeki değişken ve fonksiyon isimleri de
Türkçe — mevcut düzene uy.

## Değişmezler

Aşağıdakiler bir kullanıcı deneyimi denetiminden sonra **bilinçli olarak**
alınmış kararlar. "Düzeltilecek eksik" değiller; bozma.

- **Menüyü `app.js` üretmiyor**, her HTML'de elle yazılı — JavaScript
  yüklenmezse navigasyon kaybolmasın diye.
  `menuyuHazirla()` yine de gerekli: aktif bağlantıyı işaretliyor ve mobil
  katlanır menüyü çalıştırıyor. **Silme.**
- **Sahte içerik yasak.** `VIDEOLAR` boşken ana sayfadaki video bölümleri
  basılmıyor (`videoDolu()` kilidi). Örnek başlık, "yakında", uydurma
  bağlantı **üretme** — boş bırak, eksik olduğunu rapor et.
- **Gizleme her zaman `hidden` özniteliğiyle** yapılır, `opacity: 0` ile
  değil. Hareket azaltma açıkken `style.css` bütün geçişleri kapatıyor;
  opacity ile gizlenen bir şey bir daha asla görünmez.
  Bu yüzden `[hidden] { display: none !important; }` kuralı var — silme.
- **Renk paleti ölçülerek belirlendi.** `--text-3`, `--kotu-metin` ve
  `--bolge-renk` değerleri WCAG AA (4.5:1) sınırına göre hesaplandı.
  Değiştireceksen önce kontrastı ölç.
- **Odak halkası silinmez.** `:focus-visible` tasarımı bilerek var.
  Klavye odağını görünmez yapan bir kural yazma. (`style.css` içindeki
  `:focus:not(:focus-visible) { outline: none; }` bunun parçası — sadece
  fare tıklamasındaki halkayı kaldırıyor, klavyedekini değil.)
- **Betikler `defer` ile ve bu sırayla** yükleniyor:
  `data.js → goz.js → app.js → animasyon.js` (ilk boyama ~%28 hızlandı).
  `animasyon.js` içeriğin basılmasını bekliyor; sırayı bozma.
- **Dış bağımlılık yok.** Font, betik, görsel — hiçbiri dışarıdan
  çekilmiyor. CDN bağlantısı, npm paketi, framework ekleme.

## Tuzaklar

- **Sayfa içeriğinin çoğu JS ile sonradan basılıyor.** DOM'a dokunan bir şey
  yazacaksan `icerik-hazir` olayını bekle:
  `document.addEventListener("icerik-hazir", () => { ... })`.
  Bu olay birden fazla kez yayılabilir (gizli sayfada kilit açılınca) —
  dinleyicin iki kez çalışmaya dayanıklı olsun.
- **Veriden gelen her metin `kacir()` içinden geçmeli.** `data.js` içeriği
  `innerHTML` ile basılıyor.
- **`data-metin` görünen başlıkla birebir aynı olmalı.** Glitch efektinin
  ikinci katmanını CSS `attr(data-metin)` ile çiziyor; başlığı değiştirip
  özniteliği unutursan iki farklı metin üst üste biner.
- **Bir `data-*` noktasını HTML'den silersen o bölüm sessizce boş kalır** —
  hata vermez, konsola bir şey yazmaz.
- **Yeni sayfa 8 yerde menü güncellemesi demek** (`404.html` hariç, onun
  menüsü yok) + `sitemap.xml`. `kontrol.sh` unutulanı yakalıyor.

## Doğrulama

Test altyapısı yok; yerine bağımlılıksız bir denetim betiği var:

```bash
./kontrol.sh
```

Menü tutarlılığını, `sitemap.xml` kapsamını, betik sırasını, ölü `data-*`
bağlama noktalarını, `LORE.md` ↔ `data.js` senkronunu ve `HARITA.md`
satır numaralarının hâlâ doğru yeri gösterdiğini denetler.

Siteyi görmek için: `python3 -m http.server 8000`

## Gizlilik

**Sitede hiç kullanıcı verisi toplanmıyor.** Form yok, giriş yok, çerez yok.
`localStorage` sadece spoiler kapaklarının açık/kapalı tercihini tutuyor.
Soru-cevap YouTube yorumlarında yapılıyor; site sadece oraya yönlendiriyor.
Buraya backend eklemeden önce iki kez düşün — sadeliği bilinçli bir tercih.

> Daha önce Supabase tabanlı bir soru-cevap sistemi vardı, kaldırıldı.
> Kodu git geçmişinde duruyor. Geri getirme.

## Bekleyen işler

- **`VIDEOLAR` tamamen boş** (`data.js:32-49`). Ana sayfanın ilk göze
  çarpması gereken bölümü bu yüzden hiç basılmıyor. Kanaldan video kimliği
  girilmesi gerekiyor — uydurma değer yazma.
- **İrade kademeleri taslak.** `LORE.md:93` "DURUM: TASLAK" diyor; 5 kademe
  bir öneri, netleşmedi.
- **Zaman çizelgesi netleşmedi.** `LORE.md:76-79` 1730/1731 tercihini açık
  bırakıyor.

## Diğer belgeler — ne zaman okunur

| Dosya | Ne zaman |
|---|---|
| `HARITA.md` | Bir şeyin nerede olduğunu ararken. **Önce buraya bak.** |
| `LORE.md` | İçerik/canon değiştirirken — sadece ilgili bölümü |
| `README.md` | "Nasıl eklenir" adımları, GitHub Pages yayını |
| `TASARIM.md` | Tasarım/animasyon işi. Dışarıdaki bir araca yapıştırmak için yazıldı; palet ve kısıtlar `CLAUDE.md` ile aynı şeyi söylüyor |
