# Referans · JujutsuCraft 50.1

**Kaynak:** `JujutsuCraftver50.1forge1.20.1.jar` (Forge 1.20.1, MCreator).

**Yöntem:** jar **hiç çalıştırılmadı**. Zip olarak açıldı, `.class`
dosyalarının sabit havuzu bayt bayt okundu (`scratchpad/cp2.py`).

## Modun ölçüsü

| | Adet |
|---|---|
| Sınıf | 3493 |
| `procedures/` | 1170 sınıf, **1080 benzersiz yordam** |
| `entity/` | 892 |
| `item/` | 428 |
| `potion/` | 58 |
| Dil anahtarı | 1737 |
| `jujutsu.technique.*` | **166 teknik adı** |

Teknik adları `lang/en_us.json`'da düz metin duruyor, mantık
`procedures/` altında. Yani "hangi teknik var" ile "o teknik ne
yapıyor" ayrı iki yerden okunuyor.

## Seçilen iki karakter

Ölçüt: **güçlü** olmak ve mekanik olarak birbirinden ayrışmak.
İkisi de eserde en üstte ve modda **tam kadro** işlenmiş.

### Satoru Gojō — Limitless

| Kaynak yordamı | Okunan sabitler | Bizde |
|---|---|---|
| `TechniqueBlueProcedure` | `GetDistanceNearestEnemy`, `NEUTRALIZATION`, 16 · 8 · 5 · 3 · **−50** | **Mavi** — çeker |
| `TechniqueRedProcedure` | `RED` varlığı + `MOB_SUMMONED`, `x/y/z_power`, 25 · 16 · 8 | **Kırmızı** — iter |
| `HollowPurpleProcedure` | 40 · 24 · 90 · 215 · 66 (modun en büyük sayıları) | **Mor** — delici |
| `InfinityProcedure` + `InfinityActiveTickProcedure` + `WhenPlayerActiveTickInfinityProcedure` | `infinity` boolean, `INFINITY_EFFECT`, `NEUTRALIZATION`, `skill` havuzunu yakan `timer` | **Sonsuzluk** — açılıp kapanan |
| `UnlimitedVoidProcedure` | `DomainExpansionCreateBarrier`, `DomainExpansionRadius`, 33 · 34 | **Sınırsız Boşluk** |
| `uniform_gojo_helmet/chestplate/leggings/boots` | "Blindfold (Black)", "Satoru Gojo's Uniform", "Black Boots" | **Üniforma** (etki olarak) |

**−50'nin anlamı:** eksi işaret çekim demek. Mavi içeri çeker,
Kırmızı dışarı iter — aynı fonksiyonun iki işareti.

### Ryōmen Sukuna — Malevolent Shrine

| Kaynak yordamı | Okunan sabitler | Bizde |
|---|---|---|
| `DismantleProcedure` | `PRESS_Z`, `flag_dismantle`, **`INFINITY_EFFECT` denetimi**, 16 · 9 · 8 | **Parçala** (3'lü combo) |
| `CleaveProcedure` | `ChargeParticle`, `ANIMATION_1`, 30 · 120 · 22 · 19 · 17 | **Yar** (tek, ağır) |
| `MalevolentShrineProcedure` | `DomainExpansionCreateBarrier` 33/34, `DOMAIN_EXPANSION`, `effect give @s blindness 2 0 true` | **Kutsal Mabet** |
| `OpenProcedure` | 405 · 30 · 17.5 · 12 · 45 · 720, `x/y/z_pos` | **Fūga** (alev hattı) |
| `sukuna_body_chestplate` | "Sukuna's Arms" | **Sukuna'nın Kolları** (etki olarak) |

## Kaynaktan alınan en değerli şey

`DismantleProcedure` sabit havuzunda **`INFINITY_EFFECT`** geçiyor.
Yani kaynakta Sukuna'nın kesiği, hedefte Sonsuzluk varsa
**geçmiyor**. İki karakter arasında gerçek bir taş-kâğıt ilişkisi
var ve tesadüf değil, koda yazılmış.

Bizde aynen var: Sonsuzluk açık olan hedefe **Parçala** ve **Yar**
işlemiyor. Gojo'nun **Mavi**'si ise takılmıyor — kaynakta da denetim
yalnız Sukuna'nın kesiklerinde.

Mekanizma farkı: kaynakta bir potion effect, bizde bir **etiket**
(`simsek_sonsuzluk`). Sebep: etiket **başka bir varlıkta**
okunabiliyor; dinamik özellik için oyuncu nesnesi gerekir ve hedef
bir mob da olabilir.

## Alınmayanlar ve nedeni

**Üç kademeli ilerleme** (`GetSukunaLevelProcedure`,
`SelectSukunaProcedure`, `TransformToSukunaProcedure`). Bu depoda
ilerleme yok — her şey açık başlıyor, güç `ruhCarpani`'nden gelir.

**Ayrı lanetli enerji havuzu.** Kaynakta `skill` adlı bir havuz
var. Bizde `ruh` havuzu aynı işi yapıyor; ikinci bir havuz iki
doğruluk kaynağı demekti (v7.57'de kademe için aynı karar).

**Giyilebilir zırh eşyaları.** BP'de yeni eşya + yeni doku demek;
dokuyu uydurmak "sahte içerik yasak" kuralına girer. Zırhın
**yaptığı şey** alındı: koruma/hız/gece görüşü ve güç/hız.

**Diğer 20 karakter.** Higuruma (43 dil anahtarı), Maki, Hakari,
Mahito, Dagon, Kashimo, Choso, Yuta, Todo, Uraume, Yorozu ve
diğerleri kaynakta işlenmiş. Katalog `lang/en_us.json`'daki
`jujutsu.technique.*` altında; ileride başkası istenirse oradan
seçilir.

## Karakter seçimi neden sohbette

Kullanıcı: *"adlarını yazarak aralarında değişim yapabileyim."*
Jest sırası zaten 20'yi geçmişti; üçüncü bir seçici koymak sırayı
daha da uzatırdı. Sohbete `gojo` / `sukuna` (veya `satoru`,
`ryomen`, `limitless`, `shrine`) yazmak yetiyor. Ad listesi
`ayarlar.js`'te (`JJK_KARAKTERLER[].adlar`) — `sohbet.js` oradan
okuyor, kopyalamıyor.
