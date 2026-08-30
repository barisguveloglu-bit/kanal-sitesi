# Teknoloji Zırhları — kaynak notları (v5.1)

Üç Java modundan **yalnızca zırhlar** alındı. Kullanıcının isteği
aynen: *"bunlar direkt zırh modları değil ama bizim odaklanacağımız
şey bunların verdiği zırhlar, sadece onları alacağız, hiçbir şeyi
almayacağız onlardan başka. Ayrıca zırh verdiği özellikler falan
varsa alabildiklerini al, Java ile Bedrock farklı olduğu için."*

Alınmayanlar: makineler, kablolar, enerji ağı, dönüştürme (EMC),
modül eşyaları, aletler, silahlar. Hiçbiri.

Bütün sayılar jar'ların **bytecode'undan okundu** (`javap -c -p`,
lambda eşlemeleri `javap -v` BootstrapMethods tablosuyla çözüldü).
Hiçbiri hafızadan yazılmadı.

---

## 1. ProjectE 1.21.1 — üç takım, on iki parça

### Zırh puanı ve tokluk
`moze_intel/projecte/gameObjs/registries/PEArmorMaterials.class`

Üç malzeme de `DIAMOND_RESISTANCES` kullanıyor:

| parça | zırh |
|---|---|
| başlık | 3 |
| göğüslük | 8 |
| pantolon | 6 |
| bot | 3 |
| **toplam** | **20** |

Tokluk (toughness) hepsinde `fconst_2` = **2.0**.
Geri tepme direnci: Kara Madde **0.1**, Kızıl Madde **0.2**,
Mücevher **0.25**.

> Geri tepme direncinin hangi malzemeye ait olduğu lambda
> sırasından çözüldü, göz kararı değil: `static{}` içinde kayıt
> sırası dark_matter → red_matter → gem_armor; BootstrapMethods
> tablosu bunları sırayla `lambda$static$2` (0.1),
> `lambda$static$4` (0.2), `lambda$static$6` (0.25) ile
> eşliyor.

### Hasar azaltma
`PEArmor.class`

```
getPieceEffectiveness:  bot/başlık = 0.2 · göğüslük/pantolon = 0.3
reduction(parça) = getFullSetBaseReduction() * getPieceEffectiveness(parça)
```

Dört parçanın etkinliği toplamı 0.2+0.3+0.3+0.2 = **1.0**, yani
tam takımda azaltma taban değere eşit:

| takım | taban azaltma | patlama tavanı | düşme | boğulma |
|---|---|---|---|---|
| Kara Madde (`DMArmor`)   | **0.80** | 350 | 5  | 5  |
| Kızıl Madde (`RMArmor`)  | **0.90** | 500 | 10 | 10 |
| Mücevher (`GemArmorBase`)| **0.90** | 750 | 15 | 15 |

`BYPASSES_ARMOR` etiketli hasarda azaltma **0** — zırhı delen
hasar (açlık, void, `/kill`) geçiyor.

### Mücevher takımının parça yetenekleri
Ad'lar `gem.projecte.lore.*` anahtarlarından:

| parça | ad | ne yapıyor (sınıftan) |
|---|---|---|
| başlık | Abyss Helmet | can tazeleme · gece görüşü (açılıp kapanır) · `doZap` 120 blok menzilde yıldırım |
| göğüslük | Infernal Armor | `FoodData.eat(?, 10.0f)` otomatik doyurma · ateş koruması · `doExplode` 9.0 güçünde patlama |
| pantolon | Gravity Greaves | çömelince yerçekimi çakması (düşüş hızı en az -8.0, 3.5 blok alanda 6.0 hasar) · yavaş iniş |
| bot | Hurricane Boots | adım yardımı 0.4 · düşme hasarı yok (`resetFallDistance`) · süzülme (+0.1 dikey) · koşarken ×1.1 |

Kara ve Kızıl Madde takımlarında parça yeteneği **yok** —
sadece azaltma. Uydurulmadı, sınıflarında yok.

---

## 2. Mekanism 1.21.1 — MekaSuit

### Zırh puanı
`MekanismArmorMaterials.class` → `MekanismStartupConfig.class`

MekaSuit'in varsayılanları doğrudan **`ArmorMaterials.NETHERITE`**
üzerinden okunuyor (bytecode'da `getstatic ArmorMaterials.NETHERITE`
→ `.defense()` / `.toughness()` / `.knockbackResistance()`):

| parça | zırh |
|---|---|
| başlık | 3 |
| göğüslük | 8 |
| pantolon | 6 |
| bot | 3 |
| **toplam** | **20** |

Tokluk **3.0**, geri tepme direnci **0.1**.

### Hasar soğurma
`data/mekanism/data_maps/damage_type/mekasuit_absorption.json`

```json
{"values":{"#mekanism:mekasuit_always_supported":{"absorption":1.0},
           "minecraft:sonic_boom":{"absorption":0.75}}}
```

`mekasuit_always_supported` etiketi (21 hasar türü): falling_anvil,
cactus, cramming, dragon_breath, dry_out, fall, falling_block,
fly_into_wall, generic, hot_floor, in_fire, in_wall, lava,
lightning_bolt, on_fire, sweet_berry_bush, wither, freeze,
falling_stalactite, stalagmite, sonic_boom.

`GearConfig.class` varsayılanları: `fallDamageReductionRatio` **1.0**,
`magicDamageReductionRatio` **1.0**, `unspecifiedDamageReductionRatio`
**1.0**.

> **Bu %100 soğurma ENERJİYE bağlı.** Takım şarjlıyken hasarı
> tamamen yiyor, şarj bitince sıradan bir netherite takımı.
> Bizde enerji sistemi yok (mod almadık, sadece zırh aldık),
> bu yüzden %100 aktarılmadı — gerekçe `ayarlar.js`'te.

### Modüllerin verdikleri
`mekanism/common/content/gear/mekasuit/` (23 sınıf). Bunlar ayrı
eşya, biz onları **almadık**; ama "zırhın verdiği özellikler"
sorusunun cevabı bunlar, o yüzden takımın kendi özelliği sayıldı:

| modül | ne |
|---|---|
| VisionEnhancement | gece görüşü |
| ElectrolyticBreathing | su altında nefes |
| HydrostaticRepulsor | su içinde hız |
| HydraulicPropulsion | zıplama + adım yardımı |
| LocomotiveBoosting | koşu hızı |
| NutritionalInjection | otomatik doyurma |
| GravitationalModulating | serbest uçuş |
| Elytra | süzülme |
| InhalationPurification | etkileri temizleme |
| MagneticAttraction | eşya çekme |
| ChargeDistribution / Solar / Geiger / Dosimeter / Radiation | enerji ve radyasyon — bizde karşılığı yok |

### Model
`assets/mekanism/models/entity/mekasuit.obj` — Blockbench 4.3.1
çıktısı, **124 kutu**. Kutu olduğu için Bedrock'a birebir
çevrildi (`obj_coz.py`). Dört doku (player / body / helmet /
exoskeleton, hepsi 32×32) tek 64×64 atlasta birleştirildi.

Blockbench'in OBJ çıkışı **X eksenini ters veriyor** — ölçüldü:
çevirinin ilk halinde `chest_left_arm` x = −9…−3.5'e düştü,
vanilla sol kol +4…+8 olmalıydı. `obj_coz.py:x_ters` bunu
düzeltiyor (ayna sarım yönünü de bozduğu için yüz köşe sırası
da ters çevriliyor).

---

## 3. Draconic Evolution 1.20.4 — üç göğüslük

### ÖNEMLİ: bu sürümde dört parçalı takım YOK

1.20.4'te dört parça tek bir **Modüler Göğüslük**'e indirilmiş.
Oyunda kayıtlı zırh eşyası tam olarak üç tane:
`wyvern_chestpiece`, `draconic_chestpiece`, `chaotic_chestpiece`.

Başlık / pantolon / bot **uydurulmadı** — jar'da yoklar.
(Eski dört parçalı takımın 16×16 ikonları
`textures/item/armor/` altında hâlâ duruyor ama eşyaları yok.)

### Zırh puanı
`ModularChestpiece.class` kurucusu: `ArmorMaterials.DIAMOND` +
`ArmorItem$Type.CHESTPLATE` → **8 zırh**, tokluk 2.0. Üç kademe
de aynı; fark modüllerden geliyor.

### Modül verileri (`DEModules.class`, lambda eşlemesiyle çözüldü)

| modül | wyvern | draconic | chaotic |
|---|---|---|---|
| hız (`speedData`) | +%25 | +%50 | +%150 |
| zıplama (`jumpData`) | +%75 | +%125 | +%400 |
| uçuş (`flightData`) | süzülme, hız 1.0 | süzülme + serbest, 2.0 | süzülme + serbest, 3.5 |
| kalkan (`shieldData`) | 25 / 0.1 sn | 50 / 0.25 sn | 100 / 0.5 sn |
| büyük kalkan | 125 / 0 | 250 / 0 | 500 / 0 |
| kalkan tazeleme | 5 / 1.0 | 10 / 2.5 | 20 / 5.0 |
| kalkan kontrol (bekleme sn) | 20 | 10 | 5 |
| ölmezlik (`undyingData`) | 6 can · 25 kalkan · 300t · 2400t şarj | 12 · 50 · 600t · 1200t | 20 · 100 · 2400t · 900t |
| otomatik doyurma | 150 | 400 | (yok) |
| gece görüşü | var | — | — |

Zıplamanın anlamı `ModularArmorEventHandler.onLivingJumpEvent`
içinde açık: `push(0, 0.1f * (boost + 1), 0)` — yani zıplamaya
eklenen **dikey hız** `0.1 × (1+p)`.

### Model
`models/item/equipment/chestpeice.obj` — Blender çıktısı, **serbest
üçgen ağı** (`g` grupları, kutu değil). Bedrock varlık geometrisi
yalnız kutu kabul ediyor, bu yüzden **giyilen model aktarılamadı**.
Göğüslükler modun kendi eşya ikonlarıyla geliyor
(`textures/item/tools/*_chestpiece.png`), giyince oyuncunun
üstünde ayrı bir model çizilmiyor.

Bu bir eksik ve gizlenmedi.
