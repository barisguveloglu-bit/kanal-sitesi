# AlienEvo (Ben 10) — Bedrock'a taşınabilirlik listesi

**Bu dosya bir kez yazıldı.** Kullanıcı jar'ı tekrar yüklemesin, ben de modu
tekrar taramayayım diye burada duruyor.

---

## Kaynak

| | |
|---|---|
| dosya | `AlienEvo1.1.3fabric_1.jar` (643 KB) |
| modid | `alienevo` v1.1.3 |
| yapan | Habb & Stephen |
| platform | Minecraft **Java**, Fabric + **Palladium** |
| modeller | **GeckoLib** → yani zaten Bedrock `.geo.json` biçimi |
| md5 | `18b2b7b17aa9b5d4efa794d3fbbfd7e4` |

```
1656 PNG · 799 JSON · 223 mcfunction · 126 js · 54 ogg · 35 sınıf
```

Sadece 35 derlenmiş sınıf var — mantığın neredeyse tamamı JSON.

## Bu modun en değerli yanı

**Modelleri GeckoLib ile yapılmış.** GeckoLib, Bedrock'un `.geo.json`
biçimini kullanıyor — yani modeller **dönüştürmeye gerek kalmadan** okunuyor.
BoraLo'da bytecode çözmek gerekmişti, Ionstrike'ta sayılar JSON'daydı ama
modeller yoktu; burada **hem sayılar hem modeller** hazır.

Tek değişiklik **kemik adları**. Modun bütün modelleri altı kök kemikten
sarkıyor (Palladium'un oyuncu parçalarına bağlama kuralı):

```
armorHead · armorBody · armorLeftArm · armorRightArm
armorLeftLeg · armorRightLeg
        ↓  yeniden adlandır
head · body · leftArm · rightArm · leftLeg · rightLeg
```

Bunlar Bedrock'ta oyuncunun **kendi** kemik adları, dolayısıyla bütün ağaç
(66 kemiğe kadar) vanilla oyuncu animasyonlarıyla sürülüyor — yürüyüş, kol
sallama, eğilme **bedava**.

Dönüştürücü: `kol_uret.py: ben10_geometrisi()`.

---

## Taşınabilirlik

### ✅ Yapıldı

| ne | tür | ölçek | biçim | sürüm |
|---|---|---|---|---|
| **Elmas Kafa** (Diamondhead) | Petrosapien | 1.35 | 3 | v4.92 |
| **Dört Kol** (Four Arms) | Tetramand | 2.0 | 3 | v4.92 |
| **Yüzen Çene** (Ripjaws) | Piscciss Volann | 1.17 | 3 | v4.92 |
| **Ateş Topu** (Heatblast) | Pyronite | 1.1 | 3 | v4.92 |
| **Vahşi Sırtlan** (Wildmutt) | Vulpimancer | 1.0 | 3 | v6.0 |
| **Şimşek Hız** (XLR8) | Kineceleran | 1.1 | 3 | v6.0 |
| **Gri Madde** (Grey Matter) | Galvan | 0.25 | 3 | v6.0 |
| **Sinek Suratlı** (Stinkfly) | Lepidopterran | 1.0 | 3 | v6.0 |
| **Yükseltme** (Upgrade) | Galvanic Mechamorph | 1.4 | 3 | v6.0 |
| **Hayalet** (Ghostfreak) | Ectonurite | 1.3 | 3 | v6.0 |
| **Gülle** (Cannonbolt) | Arburian Pelarota | 1.33 | 3 | v6.0 |
| **Jet Işını** (Jetray) | Aerophibian | 1.0 | 1 | v6.0 |
| **Atomik** (Atomix) | Nucleonix | 3.3 | 1 | v6.0 |
| **Ejderha** (Dragonoid) | Dragonoid | 8.7 | 1 | v6.0 |
| **Astro Bot** (Astrobot) | Astrobot | 0.55 | 1 | v6.0 |
| **Bataklık Ateşi** (Swampfire) | Methanosian | 1.7 | 1 | v6.0 |
| **Büyük Üşütük** (Big Chill) | Necrofriggian | 1.0 | 1 | v6.0 |
| **Yankı Yankı** (Echo Echo) | Sonorosian | 0.5 | 1 | v6.0 |
| **Devasaur** (Humungousaur) | Vaxasaurian | 2.8 | 1 | v6.0 |

**20 tür, 56 kayıt** (v6.1'de beş ek form ×3 biçim). Modun ilk on bir uzaylısında üç biçim
(Recal / Prototip / 10K) var; `alien_34/60/100/101` ve `afomni`nin
uzaylılarında tek model var — olmayan biçim **uydurulmadı**.

### ⛔ Alınamayan iki tür

| tür | neden |
|---|---|
| **Kryptonian** | **Modeli yok.** Güç dosyası dolu (armor +20, attack +13, max_health +40) ama jar'da tek bir modeli, dokusu ya da `render_layer`'ı yok. Uydurma bir model çizilmedi. |
| **Crystalsapien** (Chromastone) | **Modun kendisi bitmemiş.** Modeli ve dokusu var, ama güç dosyasında iş yapan tek satır `say Under Construction`. Güçsüz bir yaratık kostümden ibaret olurdu. |

Bunların ikisi de `sim/ben10.mjs` 1. bölümde **sınanıyor** — "unuttuk"
ile "alınamadı" ayrı şeyler, test hangisi olduğunu tutuyor.

### 🟢 Yeni yaratık eklemek

`ben10_al.py <açılmış-jar>` modelleri ve dokuları çıkarıyor; sonra
`kol_uret.py: BEN10_TABAN` ile `ayarlar.js: BEN10_TABAN` tablolarına
birer satır. Üreteç gerisini yapıyor.

### 🟡 Orta

| ne | zorluk |
|---|---|
| **Omnitrix eşyası** | Modda tam bir saat modeli var (`geo/prototype_omnitrix.geo.json`, `10k/`). Bizde dönüşüm eşyayı ele almakla oluyor; saat bir menü açabilir |
| **Yeteneklerin kendisi** | Elmas Kafa'nın kristal sütunu, Dört Kol'un yer sarsması, Ateş Topu'nun ateş ışını — lazer/silah motorumuz hazır, her biri ayrı iş |
| **Dönüşüm balonu** | `transform_bubble.json` — parçacık + ses, yapılabilir |
| **Ateş Topu'nun animasyonlu alevi** | 8 kare glow dokusu. Bedrock'ta `.mcmeta` yerine flipbook gerekiyor |

### 🔴 Zor ya da imkânsız

| ne | neden |
|---|---|
| **`size` yeteneği** | yaratıkların çoğu ölçek değiştiriyor; Bedrock'ta oyuncu ölçeklenemiyor |
| **`omnitrix_timer`** | Palladium'un kendi zamanlayıcısı; bizde script'le yazılabilir ama davranışı birebir değil |
| **`knockback_resistance +255`** | oyuncuya verilemiyor |
| **`freeze_immunity`** | Bedrock'ta böyle bir efekt yok |
| **223 `.mcfunction`** | Java komut söz dizimi; Bedrock'ta çoğu çalışmaz |

---

## Okunan gerçek sayılar

`data/alienevo_aliens/palladium/powers/*.json` — okundu, tahmin değil.

| yaratık | sayılar |
|---|---|
| **Petrosapien** | armor +20 · toughness +15 · attack **+14** · max_health **+20** · knockback_res +255 · movement −3 · donma bağışıklığı |
| **Tetramand** | armor **+60** · max_health **+40** · attack +12.3 · knockback_res +255 · movement −5 · leaping +0.3 |
| **Piscciss Volann** | swim_speed +4 · destroy_speed +10 · attack +5 · armor +20 · fall_resistance +2.5 |
| **Pyronite** | ateş + donma bağışıklığı · armor +12 · max_health +10 · attack +3 · ışın 9 · fall_resistance +3.4 |

**Çeviri** (`ayarlar.js: BEN10`):

```
Can Artışı seviye başına +4 CAN  ->  +20 = V,  +40 = X   (İKİSİ DE BİREBİR)
Güç        seviye başına +3      ->  +14 = Güç V (+15, en yakın)
                                     +12.3 = Güç IV (+12, neredeyse birebir)
Direnç     seviye başına %20
Yavaşlık   seviye başına %15     ->  Elmas Kafa ve Dört Kol AĞIR
```

---

## v6.0 — on beş yeni uzaylının sayıları

Hepsi `powers/<tür>.json` dosyalarından **hesaplandı**, elle yazılmadı.

### Hangi durum sayıldı

Kaynakta bir özelliğin üç hâli var:

| hâl | koşul | sayıldı mı |
|---|---|---|
| koşulsuz | yok | ✅ |
| beceri ağacından açılan | `unlocking` | ✅ (açılınca kalıcı) |
| bir moda basılıyken | `enabling` | pozitifler ✅ · **cezalar ❌** |

Cezalar niye sayılmadı: Gülle'nin *yuvarlanırken* donan hızı
(`movement_speed −255`) ya da Hayalet'in *fazdayken* kaybettiği hasar
(`attack_damage −255`) bizde hiç girmediğimiz bir durumun bedeli olurdu.

### Dönüşüm kuralları

| kaynak | karşılık | kural |
|---|---|---|
| `armor` + `armor_toughness` | Direnç | Java zırh formülü, 10 hasarlık referans vuruş, tavan Direnç IV |
| `attack_damage` | Güç | seviye başına +3, eşitlikte aşağı |
| `max_health` | Can Artışı | seviye başına +4, eşitlikte aşağı |
| `movement_speed` | Hız | oyuncu tabanı 0.1'e oran, seviye başına %20, **tavan Hız V** |
| `destroy_speed` | Acele | / 2, tavan Acele V |
| `leaping` / `jump_power` | Zıplama | / 0.3 |
| `swim_speed` > 0 · `is_drowning` | Su Solunumu | (≥ 4 ise Kanal Gücü de) |
| `is_fall` · `fall_resistance` · uçuş | Yavaş Düşüş | |
| `is_fire` | Ateş Direnci | |
| `healing` (pasif) | Yenilenme | Yenilenme I = 50 tick'te 1 can, her seviye yarıya |
| `entity_glow` (pasif) | Gece Görüşü | Vahşi Sırtlan'ın avcı sezgisi |
| `slower_hunger` | Tokluk | |
| `wall_climb` | `tirmanma` mekaniği | Marvel motoru |
| `intangibility` | `faz` mekaniği | Marvel motoru |
| `elytra_flight` · `flight_speed` | `suzulme` mekaniği | Marvel motoru |
| `astrojump` | `sicrayis` mekaniği | Marvel motoru |

**Hız tavanı** neden var: XLR8'in `movement_speed +1.65`'i oyuncunun
taban hızının **16 katı**. Aynı gerekçe zırh tablosunda da yazılı
(orada `+1` = 11 kat).

### Taşınamayanlar (uydurulmadı)

| kaynak | neden |
|---|---|
| `flight_speed` (pasif uçuş) | Bedrock'ta pasif uçuş efekti yok — uçan yaratıklara `suzulme` verildi |
| `freeze_immunity` | Bedrock'ta donma bağışıklığı yok |
| `is_projectile` / `is_explosion` bağışıklığı | efekt karşılığı yok |
| `knockback_resistance` | oyuncuya verilemiyor |
| `step_height` · `entity_gravity` · `entity_reach` | ayarlanamıyor |
| `size` (çarpışma kutusu) | **model büyüyor, kutu büyümüyor** — Bedrock'ta oyuncunun kutusu sabit (0.6 × 1.8) |

### v6.1: aktif saldırılar geldi

**54 saldırı + 2 ışın.** Tablo `ayarlar.js: BEN10_SALDIRI` ve
`BEN10_ISIN`; her satırın `kaynak` alanı modun kendi yetenek adı,
`sim/ben10_saldiri.mjs` o adı jar'da arayıp sayıyı karşılaştırıyor.

Modda ~15 ayrı yetenek türü var; Bedrock'ta üçe iniyorlar:

| tür | kaç | kaynaktaki karşılıkları |
|---|---|---|
| **mermi** | 24 | `projectile` · `custom_projectile` |
| **alan** | 24 | `aoe_damage` · `sonic_clap` · `explosion` · `astro_punch_damage` · `astro_laser_damage` · `roll_damage` |
| **atılma** | 6 | `motion` · `motion_dash` · `charge_leap` · `vax_leap` · `astrojump` |

**Hasar çevrilmedi:** Java'da `Damage: 25` de Bedrock'ta `applyDamage(25)`
de aynı ölçek. Işınlardaki ×20 kuralı buraya girmiyor — o kural *sürekli*
ışınlar içindi, bunlar tek vuruş.

**Menzil tavanı 64 blok.** Kaynakta menzil `hız × Lifetime` ve Java'da bu
bir tavan (mermi zaten çarpıp duruyor). Düz alınsaydı Kaya Fırlatma 630,
Nükleer Top 300 blok tarardı. Kesilen satırlarda kaynağın kendi sayısı
`kaynakMenzil` olarak duruyor.

**İki mermide hasar oyuncudan:** Yükseltme ve Devasaur'un süper
yumruğunda `Damage` alanı yok, `damage_from_player: true` var. Tablodaki
sayı türün kendi `attack_damage`ı ve satır `hasarKaynak: "oyuncu"`
işaretli.

**Alınmayan iki ışın:** Yükseltme'nin `upgrade_beam`i ile Çubuk'un
`lightning_beam`i hasar taşımıyor (`energy_beams/*.json` yalnızca renk/boy;
hasar yetenekte ve o ikisinde `damage` alanı yok). Uydurma hasar verilmedi.

**Ateş Topu'nun ışını:** v4.92'den beri özet "ışın 9" vaat ediyordu ama
ortada ışın yoktu. v6.1'de geldi (9 × 20 = 180, 15 blok), Büyük Üşütük'ün
buz nefesiyle birlikte (3 × 20 = 60, 10 blok).

### v6.1: beş ek form

| form | kaynak | ölçek | ne değişiyor |
|---|---|---|---|
| **Gri Madde · Zırh** | `galvan_armor` | 0.25 | armor +20 · uçuş |
| **Gri Madde · Uzuv** | `galvan_limbs` | 0.25 × 5 = **1.25** | armor +10 · saldırı +2 |
| **Gri Madde · Takım** | `galvan_suit` | 0.25 × 6.6 = **1.65** | armor +24 · saldırı +5 · ateş bağışıklığı |
| **Gülle · Top** | `ball_roll` | 1.33 × 1.03 = **1.37** | tokluk +10 |
| **Yükseltme · Çubuk** | ayrı güç dosyası | 0.8 | armor +16 · saldırı +4 |

**İki `palladium:size` aynı anda açıksa pehkui bunları ÇARPIYOR.** Kanıtı
modun kendi içinde: Devasaur'un `size_change` 2.8 ve `size_change_grow`
2.3 — "grow" büyüme demek, ezseydi oyuncuyu küçültürdü.

**Grey Matter'ın tabanı v6.0'da yanlıştı:** Direnç IV ve Güç II vardı, o
sayılar `armor +56` / `attack +7`den geliyordu ve onlar çıplak Galvan'ın
değil zırhının/takımının sayılarıymış. Formlar ayrılınca yerine gitti.

### Dikkat: üç uzaylı ÇOK büyük

| yaratık | ölçek | boy |
|---|---|---|
| **Ejderha** | 8.7× | ~20 blok |
| **Atomik** | 3.3× | ~6 blok |
| **Devasaur** | 2.8× | ~5.4 blok |

Model o kadar büyüyor ama **çarpışma kutusu 1.8 blokta kalıyor**.
Kaynak mod bunu `pehkui` ile çözüyor, Bedrock'ta karşılığı yok.
Sayılar modun kendi JSON'undan — küçültmek uydurmak olurdu.

---

## Alınan dosyalar

`kaynak_doku/NEREDEN.md` — her dokunun ve her modelin modun içindeki yolu
orada yazılı.

---

## v7.95.6 · ÜÇÜNCÜ TARAMA — animasyon ve dönüşüm anı

Kullanıcı üç jar yükledi ve sordu: *"almadığımız animasyonlar var mı,
dönüşüm yaparken bir şey oluyor mu?"* Cevap: **evet, hem de çoğu.**

| jar | modid | sürüm | yazar | lisans |
|---|---|---|---|---|
| `AlienEvo-1.1.3-fabric_1.jar` | `alienevo` | 1.1.2 | Habb and Stephen | All Rights Reserved |
| `pinnacle_of_evolution.jar` | `evolved` | 4.1.0 | Gorrini | Gorrini/Tim/WOU/Fireblast |
| `shout-1.0.3.jar` | `shout` | 1.0.0 | — | All rights reserved |

Üçü de lisanssız/kısıtlı → **ölçüm alınır, dosya alınmaz** (depo kuralı).

### 1. DÖNÜŞÜM ANI — kaynakta var, bizde HİÇ yok

Bizim `ben10.js`'imiz dönüşümde **hiçbir görsel ve ses üretmiyor**.
Kaynakta üç ayrı katman var:

**a) `energy_beams/transform_bubbles/` — 16 dosya**
Her uzaylı rengine bir tane: `transform_bubble` + 13 renk varyantı
(`_black _blue _brown _cyan _dark_green _gray _light_blue _light_gray
_magenta _orange _pink _purple`) + `_recal` + `_t`, artı `self_destruct`.

Hepsi `palladium:lightning` tipinde. `self_destruct`'ın ölçülen değerleri:

```
body_part head · segments 3 · frequency 1 · spread 10
glow #FC7900 · core #FFFFFF (opacity 0.4) · bloom 10
size [500, 500] · rotation 120 · rotation_speed 50 · offset [0,-5,15]
```

**Bu belgede tek satır vardı** ("Dönüşüm balonu · `transform_bubble.json`
— parçacık + ses, yapılabilir") ve **tek dosya sanılmıştı**. Gerçekte
16 renkli varyant var.

**b) `particle_emitters/` — 18 dosya, belgede HİÇ yoktu**

```
aqua_jet · dragonoid_breath · dragonoid_tornado · freeze_breath
pyronite_beaml · pyronite_beamr · pyronite_breath
pyronite_breath_flight · pyronite_flight · pyronite_leap
pyronite_shield · pyronite_surf · pyronite_tornado
slime · smoke_dash · smoke_form · spin_cloud · spin_particles
```

**c) `shout` modu — 11 ses, bu mod bize HİÇ gelmemişti**

Ayrı bir mod. 22 yetenek: 11 `animation_timer` + 11 komut.
Her komut şu: `playsound shout:<uzaylı> master @a[distance=..15]`
— yani dönüşünce 15 blok çapındaki herkes duyuyor.

| ses | süre | ses | süre |
|---|---:|---|---:|
| stinkfly | 0.99 sn | diamondhead | 1.52 sn |
| cannonbolt | 1.23 sn | ripjaws | 1.83 sn |
| upgrade | 1.25 sn | fourarms | 2.06 sn |
| greymatter | 1.38 sn | wildmutt | 2.12 sn |
| xlr8 | 1.46 sn | ghostfreak | 2.43 sn |
| heatblast | 1.52 sn | | |

Bu, Ben 10'un o klasik "dönüşürken adını haykırma" anı. Bizde yok.

### 2. ANİMASYONLAR — 23'ün 1'i bizde

`assets/alienevo/animations/` altında 23 dosya var, depoda **yalnız
`ripjaws`**:

```
astrobot · atomix · aurora · cannonbolt · crystal_dome · dragonoid
ectonurite · galvan_armor · galvanic.rod · galvanic_mechamorph
greymatter · jetray · petrosapien · prototype · prototype_core_pickup
recal_omnitrix · ripjaws(BİZDE) · stinkfly · wildmutt · xlr8
```

**Ayrım önemli:** `petrosapien`, `prototype`, `recal_omnitrix` bizde
BİR ARA VARDI ve v7.95.1'de **bilerek silindi** — hiçbiri bir tetiğe
bağlanmamıştı. Kalan 19'u ise hiç alınmadı.

Yani "eksik" iki türlü: bilinçli silinen 3, hiç bakılmayan 19.

### 3. `evolved` (Pinnacle of Evolution) — formlar TAM, görsel eksik

Modun 6 evrim gücünün **altısı da bizde** (`BEN10_EVRIM`):
`evolved_pyronite · evolved_vulpimancer · evolved_petrosapien ·
evolved_kineceleran · evolved_galvan · evolved_tetramand`.
Bu taraf eksiksiz.

Alınmayanı görsel katman:

- **7 animasyon**: `evolved_greymatter · evolved_petrosapien ·
  evolved_pyronite · evolved_tetramand · evolved_wildmutt ·
  evolved_xlr8 · malevolent_shrine`
- **8 parçacık türü**: `evolved_dismantle · evolved_pyronite_absorb ·
  _ball · _flame · _flares · _surf · _tornado · evolved_slash`

`malevolent_shrine` üç animasyon taşıyor (`shrine`, `shrine_up`,
`shrine_down`) ama **kemik listesi boş** — model tarafında duran, bu
dosyada yalnız zamanlaması olan bir şey. Jujutsu Kaisen göndermesi.

### Özet: ne eksik

| katman | kaynakta | bizde |
|---|---:|---:|
| Dönüşüm balonu (renkli) | 16 | 0 |
| Parçacık yayıcı (alienevo) | 18 | 0 |
| Dönüşüm nidası (shout) | 11 | 0 |
| Animasyon (alienevo) | 23 | 1 |
| Animasyon (evolved) | 7 | 0 |
| Parçacık türü (evolved) | 8 | 0 |
| **Evrim formları** | **6** | **6** ✅ |

En ucuz ve en çok hissedilecek olan **shout**: 11 ses dosyası ve
dönüşüm anına bağlı tek bir `playSound` çağrısı. Mekanik değişmiyor,
sadece dönüşüm sessiz olmaktan çıkıyor.
