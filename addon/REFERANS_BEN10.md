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

**19 tür, 41 kayıt.** Modun ilk on bir uzaylısında üç biçim
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

### Aktif yetenekleri henüz alınmayanlar

Bunların modelleri ve pasif güçleri geldi, **saldırı yetenekleri
gelmedi** — sayılar okundu, aktarılmadı:

| yaratık | kaynaktaki yetenek | sayılar |
|---|---|---|
| **Ejderha** | ateş topu · ateş nefesi | 10 hasar / patlama 0.6 · 3 hasar / 5 sn ateş |
| **Astro Bot** | astro yumruk · havada yumruk · lazer | 7 hasar / 2.75 yarıçap · 10 / 2 · 10 / 10 blok |
| **Büyük Üşütük** | buz nefesi | 3 hasar |
| **Yükseltme** | enerji ışını | `alienevo:upgrade_beam` |

Ejderha ve Astro Bot'un tablodaki güçleri **bu yüzden zayıf** — kaynakta
da öyle, güçleri saldırılarında.

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
