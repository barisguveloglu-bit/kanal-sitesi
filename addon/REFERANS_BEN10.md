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

| ne | tür | sürüm |
|---|---|---|
| **Elmas Kafa** (Diamondhead) | Petrosapien | v4.92 |
| **Dört Kol** (Four Arms) | Tetramand | v4.92 |
| **Yüzen Çene** (Ripjaws) | Piscciss Volann | v4.92 |
| **Ateş Topu** (Heatblast) | Pyronite | v4.92 |

### 🟢 Kolay — aynı yolla eklenir

Modda **26 yaratık daha** var, hepsi aynı yapıda (`.geo.json` + `powers/*.json`):

```
aerophibian · arburian_pelarota · astrobot · dragonoid · ectonurite
galvan · galvanic_mechamorph · kineceleran · kryptonian · lepidopterran
methanosian · necrofriggian · nucleonix · sonorosian · vaxasaurian ...
```

Yeni bir yaratık eklemek: `kaynak_geo/` + `kaynak_doku/` içine dosyaları
koy, `kol_uret.py: BEN10` tablosuna bir satır ekle, `ayarlar.js: BEN10`
tablosuna güçlerini yaz. Üreteç gerisini yapıyor.

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

## Alınan dosyalar

`kaynak_doku/NEREDEN.md` — her dokunun ve her modelin modun içindeki yolu
orada yazılı.
