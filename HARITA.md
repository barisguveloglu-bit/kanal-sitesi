# Dosya Haritası

Bu dosya **büyük dosyaları baştan sona okumamak için** var. Aradığın şeyin
hangi dosyanın hangi satırlarında olduğunu buradan al, sadece o aralığı oku.

Depodaki dört büyük dosya (`data.js` 637, `app.js` 565, `style.css` 1718,
`LORE.md` 437 satır) tamamen okunursa gereksiz yere çok yer kaplar. Bu harita
o dört dosyanın içindekileri satır aralığına bağlıyor.

> **Satır numaraları eskiyebilir.** `./kontrol.sh` her çalıştığında bu
> tablolardaki numaraların hâlâ doğru yeri gösterdiğini denetler. Bu dosyadaki
> bir aralığı değiştirdiysen kontrolü çalıştır.

---

## Veri — `assets/js/data.js`

Sitedeki bütün içerik burada. **Karakter, icraat, derebeyi, video eklerken
sadece bu dosyaya dokunulur.**

<!-- kontrol: assets/js/data.js -->

| Blok | Satır | Ne |
|---|---|---|
| `const KANAL` | 13 | YouTube kanal adresi |
| `const SITE_ADRESI` | 16 | Yayın adresi (paylaşım etiketleri için) |
| `const VIDEOLAR` | 32-49 | Ana sayfa videoları. **Şu an tamamen boş** — bu yüzden video bölümleri siteye basılmıyor |
| `const YAPIMCI` | 57-64 | Ana sayfa alt tanıtımı |
| `const DURUM` | 70-77 | Üstteki "şu anki durum" şeridi |
| `const SEBEPLER` | 84-126 | Ana sayfa "neden bakmalısın" — beş sebep |
| `const KARAKTERLER` | 128-288 | 6 karakter. Kart alanları: `id, ad, unvan, taraf, oynanan, esir, tir, gucEtiketi, ozet, ozellikler[], iradeKademe, detay` |
| `const ICRAATLER` | 302-380 | Karakter başına "ne yaptı" listeleri. Sıralama ve puan yok |
| `const IRADE_KADEMELERI` | 383-414 | 5 kademe. Alanlar: `kademe, ad, etki, ornek` |
| `const MAFYA_TEPE` | 425-438 | Hiyerarşinin ilk iki kademesi |
| `const KOMUTANLAR` | 449-533 | 3 komutan derebeyi (Nemesis, Teşup, Ahriman) |
| `const KOMUTAN_CEKISMESI` | 536-546 | Komutanların birbirleriyle çatışması |
| `const IL_DEREBEYLERI` | 549-631 | 81 il. Alanlar: `plaka, il, komutan("bati"/"orta"/"dogu"), ad, kim` |
| `const TARAF_ETIKET` | 633-637 | "iyi"/"kotu"/"belirsiz" → ekranda görünen etiket |

---

## Sunum — `assets/js/app.js`

Veriyi HTML'e çeviriyor. Her `...Kur()` fonksiyonu bir `data-*` noktasını
doldurur. **Yeni bir veri türü eklemiyorsan buraya dokunmana gerek yok.**

<!-- kontrol: assets/js/app.js -->

| Fonksiyon | Satır | Ne yapar |
|---|---|---|
| `function kacir` | 7 | HTML kaçışı. Veriden gelen her metin buradan geçmeli |
| `function menuyuHazirla` | 23-72 | Menüyü **üretmez**; aktif bağlantıyı işaretler ve mobil katlanır menüyü çalıştırır |
| `function gizliKapiyiKur` | 79 | Üst bardaki kırmızı noktaya üç basınca `gizli.html` |
| `function tercihOku` | 112 | `localStorage` okuma (spoiler tercihleri) |
| `function kapakKur` | 125 | Spoiler kapağı aç/kapa |
| `function durumSeridiniKur` | 140 | `DURUM` → `data-durum` |
| `function spoilerlariKur` | 172 | `data-spoiler` olan her kapsayıcıya kapak koyar |
| `function sizintiyiKur` | 198 | `data-sizinti` şeridi |
| `function kanalBaglantilariniKur` | 209 | `data-kanal`, `data-izle` |
| `function videoDolu` | 239 | **Sahte içerik kilidi:** video boşsa bölüm hiç basılmaz |
| `function oneCikanVideoyuKur` | 258 | `VIDEOLAR.oneCikan` → `data-one-cikan` |
| `function rotayiKur` | 282 | `VIDEOLAR.rota` → `data-rota` |
| `function yapimciyiKur` | 307 | `YAPIMCI` → `data-yapimci` |
| `function sebepleriKur` | 324 | `SEBEPLER` → `data-sebepler` |
| `function karakterKarti` | 340 | Tek karakter kartının HTML'i |
| `function karakterleriKur` | 379 | `KARAKTERLER` → `data-karakterler` |
| `function icraatleriKur` | 392 | `ICRAATLER` → `data-icraat` |
| `function iradeyiKur` | 425 | `IRADE_KADEMELERI` → `data-irade` |
| `function mafyayiKur` | 443 | `MAFYA_TEPE`, `KOMUTANLAR`, `IL_DEREBEYLERI` → `data-mafya-tepe`, `data-komutanlar`, `data-derebeyleri` |
| `function cekismeyiKur` | 530 | `KOMUTAN_CEKISMESI` → `data-cekisme` |

Dosyanın sonunda `DOMContentLoaded` içinde hepsi sırayla çağrılıyor; en sonda
`icerik-hazir` olayı yayılıyor.

---

## Görünüm — `assets/css/style.css`

<!-- kontrol: assets/css/style.css -->

| Bölüm | Satır | İçerik |
|---|---|---|
| `KANLI GÖZ — Tasarım Sistemi` | 2-397 | `:root` değişkenleri, tipografi, üst bar, kartlar, ızgaralar |
| `KANLI GÖZ — göz çizimi` | 399-439 | Ana sayfadaki dev SVG gözün stilleri |
| `BOZULMA EFEKTLERİ` | 441-805 | Glitch başlıklar (`data-metin`), tarama çizgileri, sızıntı şeridi |
| `SORU & CEVAP` | 807-931 | `soru-cevap.html` sayfası |
| `ESKİ KAYIT — 1726, Osmanlı dönemi` | 933-1082 | `efsane.html` vakayinamesinin eskimiş kâğıt görünümü |
| `GİZLİ SAYFA — bozulma renkleri` | 1084-1390 | `gizli.html` (mor–camgöbeği palet) |
| `ERİŞİLEBİLİRLİK, MOBİL MENÜ, YOUTUBE VİTRİNİ` | 1392-1718 | `[hidden]` kuralı, odak halkası, mobil menü, video kartları |

Animasyonlar ayrı: `assets/css/animasyon.css` (218 satır) +
`assets/js/animasyon.js` (311 satır). İkisi `html.animasyon-acik` sınıfı ve
`.beliren/.belirdi` gibi sınıflar üzerinden anlaşıyor; ayrıntısı
`animasyon.js` başındaki yorumda yazılı.

---

## Canon — `LORE.md`

Hikayenin tek doğru kaynağı. **İçerik değiştirmeden önce ilgili bölümü oku;
tamamını okuma.**

<!-- kontrol: LORE.md -->

| Bölüm | Satır | İçerik |
|---|---|---|
| `## 1. Temel Fikir` | 11-41 | Kanlı Göz nedir, şu anki durum, "gerçek barış" kelime oyunu |
| `## 2. Unutulan Efsane` | 42-88 | Kuruyan ağaç, Yılmaz (öl. 1728), vakayiname |
| `## 3. İrade Sistemi` | 89-112 | 5 kademe (**taslak**), Kanlı Göz paradoksu |
| `## 4. Karakterler` | 113-164 | 6 karakterin canon tanımı |
| `## 5. Mafya Yapısı` | 165-341 | 4 kademeli yapı, 3 komutan, 81 il derebeyi tabloları (234-334) |
| `## 6. Tır Değerleri` | 342-363 | İç referans güç tablosu — **siteye basılmıyor** |
| `## 7. Güçlerin Kaynağı` | 364-392 | Güçler ağacın özünden geliyor |
| `## 8. Beyin Yıkama Yöntemi` | 393-406 | Kalan kereste parçası |
| `## 9. Kapatılan Diğer Uçlar` | 407-437 | Barış'ın ailesi, Samara'nın ihaneti, Barış nerede tutuluyor |

---

## HTML ↔ JS sözleşmesi

HTML dosyaları iskelet; içeriği `app.js` `data-*` noktalarına basıyor.
**Bir `data-*` özniteliğini HTML'den silersen o bölüm sessizce boş kalır** —
hata vermez.

| Öznitelik | Nerede | Kim dolduruyor |
|---|---|---|
| `data-durum` | index | `durumSeridiniKur` |
| `data-sebepler` | index | `sebepleriKur` |
| `data-one-cikan`, `data-rota` | index | `oneCikanVideoyuKur`, `rotayiKur` |
| `data-yapimci` | index | `yapimciyiKur` |
| `data-karakterler` | karakterler | `karakterleriKur` (değeri taraf süzgeci) |
| `data-icraat` | index, icraatler | `icraatleriKur` (değeri taraf süzgeci) |
| `data-irade` | irade | `iradeyiKur` |
| `data-mafya-tepe`, `data-komutanlar`, `data-derebeyleri` | mafya | `mafyayiKur` |
| `data-cekisme` | mafya | `cekismeyiKur` |
| `data-spoiler`, `data-spoiler-anahtar` | efsane | `spoilerlariKur` |

Bunlar JS ile doldurulmuyor, **CSS okuyor**:

| Öznitelik | Ne işe yarar |
|---|---|
| `data-metin` | Glitch başlık. CSS `content: attr(data-metin)` ile ikinci katmanı çiziyor — **görünen başlıkla birebir aynı olmalı** |
| `data-taraf` | Kartın sol kenar rengi (`iyi`/`kotu`/`belirsiz`) |

---

## Sayfalar ve betikler

Menüdeki 7 sayfa: `index`, `efsane`, `karakterler`, `irade`, `mafya`,
`icraatler`, `soru-cevap`. Menü **dışında** iki sayfa var:

- `gizli.html` — menüde ve `sitemap.xml`'de yok, bilerek. `gizli.js` yüklüyor.
- `404.html` — stili kendi içinde, betik yüklemiyor, menüsü yok.

Betik sırası (7 sayfa + gizli, hepsi `defer`):

```
data.js → goz.js → app.js → animasyon.js
```

`gizli.html` bunun yerine `data.js → app.js → gizli.js → animasyon.js`
yüklüyor (göz çizimi o sayfada yok).
