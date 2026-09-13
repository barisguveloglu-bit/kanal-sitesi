# PowerBorne Heroes 0.5.1 — inceleme

Kullanıcı: *"bu dosya zaten daha önceden gönderdim diye hatırlıyorum, bu
dosyadaki tüm karakterlerin yani aldığımız her şeyini aldık mı diye bir
bakabilir misin."*

## Kısa cevap: bu mod hiç işlenmemiş

Depoda `REFERANS_POWERBORNE.md` yoktu ve kaynak kodda `powerborne` geçen tek
satır yok. Marvel içeriğimizin nereden geldiği `REFERANS_MARVEL.md`'de yazılı
ve **başka bir mod**:

| | |
|---|---|
| bizim Marvel kaynağımız | **Marvel Project Addon v3.0.1** — Bedrock `.mcaddon`, 92 JS dosyası |
| bu dosya | **PowerBorne Heroes 0.5.1** — Forge 1.20.1, Palladium + KubeJS |

Adları benzediği için karışmış olabilir. İkisinin ortak tek yanı Marvel
karakterleri içermesi; kod, biçim ve içerik tamamen ayrı.

## Paket

1357 dosya, 5,1 MB. **Sıfır `.class`** — mod tamamen veri: Palladium güç
tanımları (JSON) + KubeJS betikleri. Yani okunabilir, `.class` çözmeye gerek
yok.

**Altı karakter:** Superman · Spider-Man · Thor · Captain America · Sentry ·
Firestorm. (Son ikisi Marvel, Superman ve Firestorm **DC** — bizde hiç DC yok.)

Güç dosyalarında toplam ~420 yetenek girdisi var ama çoğu tesisat:
`dummy` (satın alma düğümü), `attribute_modifier`, `animation_timer`,
`play_sound`, `render_layer`, `shader_effect`. Gerçek mekanik sayısı ~45.

## Bizde olan / olmayan

| PowerBorne | bizde |
|---|---|
| web swing (ağ sallanması) | **var** — `marvel_sallanma` |
| flight / flight boost | **var** — `ucus`, `marvel_suzulme` |
| teleport (Void) | **var** — `isinlanma` |
| telekinesis | **kısmen** — `cekme`, `yakala` |
| heat vision / nuclear beam / darkness projection | **kısmen** — `goz_lazeri` |
| atomic shield / photon forcefield | **kısmen** — `kubbe`, `marvel_kuvvet_alani` |
| super speed | **var** — `vilt_hiz` |
| healing / absorption | **var** — `can_ver`, `kalp_*` |
| void transform | **kısmen** — `donusum`, `o_sey` |
| **wall crawl** (duvarda yürüme) | **yok** |
| **spider sense** (tehlike sezgisi + sekme) | **yok** |
| **web shoot / web bomb** (ağ atma) | **yok** |
| **rising uppercut** | **yok** |
| **shield throw / rush / slam / spinning shield** | **yok** |
| **mjolnir call / throw / vortex** | **yok** |
| **blazing strike · photonic strike** (dalış vuruşu) | **yok** |
| **freeze breath** (dondurucu nefes) | **yok** |
| **thunderclap** | **yok** |
| **molecular shift** (madde dönüştürme) | **yok** |
| **cook item** (elde pişirme) | **yok** |
| **super flare** | **yok** |
| xray vision | **yok** — Bedrock'ta shader yok, yapılamaz |
| enerji çubuğu (güneş şarjı, kryptonite) | **yok** |
| satın alınabilir yetenek ağacı | **kısmen** — `beceri.js` var ama bu ölçekte değil |

"Yok" satırları **11 gerçek mekanik**. Hiçbiri alınmadı çünkü mod hiç
işlenmedi.

## ALINDI (v7.87) — on bir mekaniğin hepsi

Kullanıcı sonra *"bu yeni dosyanın tüm her şeyini almaya çalış"* dedi.
Kod `yetenekler/powerborne.js`, test `test/powerborne.mjs` (40 madde),
mutasyon bataryası **11/11**.

| bizdeki | kaynak | kaynaktan ayrıldığımız yer |
|---|---|---|
| Duvarda Yürüme | `wall_crawl` | süreli; **duvar yoksa tırmanmıyor** — bu bir uçuş değil tırmanma |
| Örümcek Hissi | `spider_sense` | tehlikeyi `glowing` ile gösteriyor (Bedrock'ta tek yol) |
| Ağ At | `web_shoot` | **hasar vermiyor**, tutuyor — kaynakta da öyle |
| Kalkan Fırlat | `throw_shield` | sekerken güç kaybediyor; sıralama **mesafeye** göre |
| Çekiç Çağır | `mjolnir_call` | bizde çekiç yok → yerdeki eşyayı çağırıyor, **silmiyor** |
| Yukarı Yumruk | `rising_uppercut` | hedefi de kendini de kaldırıyor |
| Dalış Vuruşu | `blazing/photonic_strike` | **yerdeyken çalışmıyor** — havaya çıkmak bedel |
| Donduran Nefes | `freeze_breath` | **blok koymuyor**; oyuncuyu bloğun içine hapsetmek yasak |
| Gök Gürlemesi | `thunderclap` | hasar düşük, iş savurmak |
| Madde Dönüştür | `molecular_shift` | tablo **bilerek zayıf** — taşı elmasa çevirmek hile olurdu |
| Elde Pişir | `cook_item` | **adet korunuyor**; tabloda olmayana dokunulmuyor |

### Alınmayanlar

- **xray vision** — Bedrock'ta shader yok, yapılamaz.
- **Palladium yetenek ağacı ve enerji çubuğu** (güneş şarjı, kryptonite) —
  kendi arayüzü ve `energy_bar_*` özellik sistemi var; bizde `beceri.js`
  benzer bir şey yapıyor ama bu ölçekte değil.
- **Karakter kostümleri** — Marvel Project'ten zaten 54 kahraman ve 300 parça
  var. Kullanıcı *"Marvel Project Addon v3.0.1 çıkarma, powerborne yanında
  birlikte dursun"* dedi; ikisi yan yana duruyor ve `test/powerborne.mjs`
  0. bölüm Marvel Project'in **silinmediğini** ayrıca bekçiliyor.

### FiskHeroes

Kullanıcı *"Frisk's heroes'un tüm karakterlerini sil"* dedi. **Zaten v5.2'de
tamamen silinmişti** — dokuz kahraman, yedi ışını, kostüm geometrisi,
`kahraman.js` ve `REFERANS_FISK.md` dahil. `test/marvel.mjs` 1. bölüm on bir
maddeyle kalıntı arıyor ve hepsi temiz.
