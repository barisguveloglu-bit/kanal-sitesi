# v7.68.0 — Çarpık Hal: iki kademeli titreme + güç çarpanı

Kullanıcı: *"o forma geçtiğim zaman kollar normalden iki kat daha güçlü
olsun, mesela güçlü TNT var ya, onun iki katını düşün. Ayrıca forma
dönüşürken titreme daha çok olsun, forma dönüştükten sonra titremeler
az olsun."*

## Titreme artık iki kademeli

v7.67'de tek kademeydi: sürekli ±1,5°. Giriş anı yoktu.

**Ayrı bir giriş animasyonu ve denetleyici yazılmadı.** Kılık varlığı
dönüşüm anında **doğuyor**, yani `query.life_time` tam o anda 0'dan
başlıyor. Genlik bunun fonksiyonu:

```
genlik = OTURMUS + (GIRIS - OTURMUS) * math.clamp(1 - life_time/SURE, 0, 1)
```

| an | gövde | kafa |
|---|---|---|
| doğuş | **±9°** | ±15° |
| 0,75 sn | ±5,25° | — |
| 1,5 sn ve sonrası | ±1,5° | ±2,5° |

Tek animasyon, denetleyici yok, ek dosya yok. Ve **titreme durmuyor** —
"sürekli titresin" şartı bozulmadı, sadece kademesi düştü.

`math.clamp` şart: olmasaydı süre dolduktan sonra genlik eksiye düşer,
`math.random` ters aralığa girerdi. Test bunu ayrı madde olarak tutuyor.

## Güç çarpanı

`CARPIK_GUC_CARPANI = 2`, tek yerde. Her yeteneğin içine ayrı yazılsaydı
biri 2'yi 3 yapar, ötekiler 2'de kalırdı.

**Herkese uygulanmıyor, adı yazılı dört yeteneğe uygulanıyor.** "Bütün
yetenekler iki kat" ölçülemeyen bir vaat: 222 yeteneğin çoğunun sayısal
bir gücü yok (menü açan, kılık giren, eşya veren). Liste
`CARPIK_GUC_YETENEKLER`'de:

| yetenek | normal | Çarpık |
|---|---|---|
| `toprak_topu` | 4 | **8** |
| `guclu_tnt` | 8 | **16** |
| `meteor` | 5 | **10** |
| `isin_topu` | 4 | **8** |

Karşılaştırma için vanilla TNT = 4.

**Bütçeye dokunmuyor:** değişen patlamanın *gücü*, *sayısı* değil.
`patlamaIste()` yine aynı sayıda patlama istiyor, v7.62 bütçe kapısı
aynen geçerli.

O Şey kılığında çarpan **uygulanmıyor** — güç Çarpık forma ait.

## Yazarken gerçek bir hata çıktı

İlk yazılışta `toprak_topu.js`'te doğrudan `oyuncu.id` yazdım. O
fonksiyon (`patlat`) modül düzeyinde ve **`oyuncu` orada kapsamda
değil** — çalışma anında `ReferenceError` atardı ve toprak topu hiç
patlamazdı.

`patlat(boyut, poz, atanId)` oldu. Botlar da bu fonksiyonu kullanıyor;
onların kimliği Çarpık defterinde olmadığı için çarpan kendiliğinden 1
kalıyor.

`isin_topu.js`'te de aynısı vardı, kapanışta `oyuncuId` mevcuttu, ona
çevrildi. `meteor.js`'te `patlat` zaten `olustur(oyuncu)` içinde
tanımlı, sorun yoktu.

## Test

`carpik.mjs` iki yeni bölümle 30 → 45 madde.

Titreme testi Molang'ı **metin olarak taramıyor, değerlendiriyor**:
ifade JS'e çevrilip `life_time = 0`, `0.75`, `99` için hesaplanıyor.
Metinde "6" görmek genliğin altı kat olduğunu kanıtlamaz.

Güç testi hem çarpanı hem **bağlantıyı** sınıyor: ayarda listede olup
kodda çağrılmamış olabilirdi.

**8 mutasyon denendi, 8'i de yakalandı:** giriş kademesi kaldırıldı ·
genlik sabitlendi · clamp kaldırıldı · çarpan 1 yapıldı · liste
denetimi kaldırıldı · form denetimi kaldırıldı · O Şey kılığı da güç
aldı · `guclu_tnt` çarpanı çağırmadı.

## Kodda henüz olmayan şey

Hikâyedeki *"yeteneklerini asla saklamıyor"* kusuru **yazılmadı**.
Güç geldi ama bedeli gelmedi. Bu bilerek `ayarlar.js`'te yazılı
duruyor ki unutulmuş sayılmasın.
