# `mods.rar` (20 Eyl) — Forge 1.20.1 mod paketi incelemesi

Kullanıcı: *"mods.rar 20 Eyl, 529 MB, Dosya — şimşek TNT modumuz Google
Drive'da bu dosyayı ara ve bu dosyayı incele."*

**Hiçbir dosya çalıştırılmadı, kurulmadı, depoya alınmadı.** Yalnız RAR
açıldı (`bsdtar`), jar'lar zip olarak okundu, gereken yerde sınıf
dosyası `javap` ile **çözüldü** (yürütülmedi). Arşiv yalnız scratchpad'e
indi.

## Kaynak

| | |
|---|---|
| Drive | `mods.rar`, sahibi `f13videodrive`, oluşturma 2026-09-20 14:29 UTC |
| kimlik | `1dsLebo6-DibNRslxT69T8yHqbIxNz9g2` (bağlantıya sahip herkes okuyabilir) |
| boyut | 528.697.570 bayt — Drive'daki boyutla **birebir aynı** |
| md5 | `242acc52c1bbb2db0ee1a7f31de16569` |
| sha256 | `2de7b992163d0582706057f587a3a47b62d8c53aba08c39ddbd8586b61be32c8` |
| biçim | RAR5, şifresiz, tek cilt |
| içerik | 227 dosya: **54 jar** + Palladium'un ürettiği 180 dosyalık belge klasörü |

Drive'da aynı adla **ikinci bir dosya** daha var (2026-10-04, 147.770.769
bayt, kimlik `1mEtGIo1hl4XQCgIIj67E7sZ51pm0vPLY`). Bu inceleme yalnız
20 Eylül tarihli 529 MB'lık olanı kapsıyor.

## Paket sağlığı — oyun açılır mı

Hedef **Java Forge 1.20.1** (`loaderVersion [47,)`). Bütün `mods.toml`
dosyaları okunup zorunlu bağımlılıklar eşleştirildi; jar içine gömülü
(`META-INF/jarjar`, `META-INF/jars`) modlar da sayıldı.

- **Eksik zorunlu bağımlılık yok.** İlk bakışta eksik görünen
  `palladiumcore` Palladium'un içine gömülü, `playeranimator` Legends'in
  içine, `flywheel`/`ponder` Create'in içine. Sürüm aralıklarının hepsi
  tutuyor.
- **`1Legends-1.7.10-8.6.2.jar` bu pakette çalışmaz.** 1.7.10 modu
  (`mcmod.info`, `mods.toml` yok); Forge 1.20.1 onu mod olarak yüklemez.
  Paketin en büyük ikinci dosyası (88,7 MB) — boşa duruyor. Yeni Legends
  zaten `Legends-1.20.1-ss1.0.12.jar` olarak var.
- **`fabric-api-0.92.6+1.11.15+1.20.1.jar`** Sinytra'nın Forge'a
  uyarlanmış Fabric API'si. Paketteki **hiçbir mod ona bağlı değil.**
- `mods/documentation/palladium/` Palladium'un kendi ürettiği belge:
  98 yetenek türü, 110 koşul, 124 vanilla model. Bu klasörün varlığı
  paketin en az bir kez açıldığını gösteriyor.

## 54 jar

### İçerik modları

| jar | modId | yapan | lisans (`mods.toml`) | içerik (dil dosyasından) |
|---|---|---|---|---|
| Legends 1.20.1 ss1.0.12 | `legendsmod` | Legends Modding Team | **Custom** | çatı: 186 eşya, 265 blok, 92 efekt |
| Legends-Superheroes ss1.0.3 | `legends_superheroes` | Legends Modding Team | All rights reserved | **850 eşya, 925 efekt/güç, 62 varlık** · 38 karakter, 139 kostüm |
| Legends-Anime ss1.0.6 | `anime` | Revenant Hero, TheJudge156 | All rights reserved | 153 eşya, 219 güç · 9 karakter |
| Legends-PowerRangers ss1.0.4 | `powerrangers` | Revenant Hero, The Judge156 | All rights reserved | 73 eşya, 64 güç · 6 Ranger kostümü |
| Legends-Misc ss1.0.4 | `misc` | Revenant Hero, Sekwah41, The Judge | All-Rights-Reserved | Kratos, Zero |
| 1Legends 1.7.10 8.6.2 | `legends` | Tihyo | (yok) | **yüklenmez** (yukarıda) |
| Ballistix 1.1.1 | `ballistix` | aurilisdev | All rights reserved | **30+ patlayıcı**, füze, radar, taret |
| Voltaic 1.0.13 | `voltaic` | aurilisdev, skip999 | All rights reserved | Ballistix'in enerji çatısı |
| Compound V 2.3.6 | `compound_v` | Blue Duck | All Rights Reserved | 4 eşya, **51 güç** (The Boys) |
| L_Ender's Cataclysm 3.31 | `cataclysm` | L_Ender | (boş şablon) | 155 eşya, 97 varlık, 132 blok — bosslar |
| Alex's Caves 2.0.2 | `alexscaves` | Alexthe668, Noonyeyz | LGPL | 226 eşya, 322 blok, 81 varlık, 6 biyom |
| Alex's Mobs 1.22.9 | `alexsmobs` | Alexthe668 ve ark. | LGPL | 255 eşya, 117 varlık |
| Craziness Awakened 7.0 | `craziness_awakened` | Zenyx | All Rights Reserved | 426 eşya, 365 blok, 115 varlık, 10 biyom |
| Cloro's Gravity Gun 1.3.1 | `physics_gun_mod` | Clorofite (MCreator) | All Rights Reserved | 25 eşya |
| Aperture Innovations 2.0.1 | `aperture_innovations` | mistersecret312 | **MIT** | portal tabancası, 12 blok |
| Cuffed 1.3.15 | `cuffed` | Lazr Productions | All Rights Reserved | kelepçe: 25 eşya, 16 büyü |
| Lucky Block 13.0 | `lucky` | Alex Socha | All rights reserved | şans bloğu |
| Pandora's Box 2.6.3 | `pandorasbox` | Ivorius, Alexandra | **MIT** | rastgele olay kutusu |
| PowerBorne Heroes 0.5.1 | `powerborne` | RunnyHero, ATROX | All rights reserved | → `REFERANS_POWERBORNE.md` |
| Symbiote 1.1.3 | `symbiote` | kitigawa | All Rights Reserved | → `REFERANS_SIMBIYOT.md` |
| Create 6.0.8 | `create` | simibubi | MIT | makine |
| Create Hypertube 0.6.0 | `create_hypertube` | Rok | Apache-2.0 | Create eki |
| Supplementaries 3.1.43 | `supplementaries` | MehVahdJukaar | kendi lisansı | süs/araç |
| Traveler's Backpack 9.1.57 | `travelersbackpack` | Tiviacz1337 | LGPL | sırt çantası |
| Dungeon Crawl 2.3.15 | `dungeoncrawl` | xiroc | GPL-3.0 | zindan üretimi |
| Chipped 3.0.7 · Rechiseled 1.2.6 · rechiseled_chipped | | | Terrarium / ARR / MIT | dekor blokları (6967 + 2418) |
| Secret Doors 1.1.0 | `secretdoors` | shim | All rights reserved | 158 gizli kapı bloğu |
| OreExcavation 1.13.174 | `oreexcavation` | Funwayguy, Darkosto | All Rights Reserved | damar kazma |
| Retro Damage Indicators 1.0.1 | | Alexthe668 | LGPL | hasar göstergesi |

### Kütüphaneler ve çatılar (içerik yok)

architectury, athena, atlas-core, AttributeFix, azurelib, BadOptimizations,
citadel, cloth-config, curios, fabric-api, fusion, geckolib 4.8.4, jei,
kubejs, Lazr's Lib, lionfishapi, moonlight, palladium 4.5.9, Pehkui,
resourcefullib, rhino, supermartijn642 config/core.

## Depoda daha önce işlenmiş olanlar

| mod | durum |
|---|---|
| PowerBorne Heroes **0.5.1** | `REFERANS_POWERBORNE.md` ile **aynı sürüm** — yeni bir şey yok |
| Symbiote **1.1.3** | Referans 1.1.2'den. 12 sınıf fazla ama **dil anahtarı aynı (655)** ve **yetenek sınıfları aynı 52**: yamalı sürüm, yeni yetenek yok |
| Gravity Gun | `REFERANS_BORALO.md`: "zaten yaptık (`cekim_silahi`)" |
| GeckoLib 4.8.4 | Bizim kurallarımız 5.5.5'ten (`REFERANS_GECKOLIB.md`); bu eski sürüm |

## Şimşek TNT için en ilgili kısım: Ballistix patlayıcıları

Eklentide patlayıcı **blok ailesi yok**: `blocks/` altında 10 blok var,
hiçbiri patlayıcı değil. Kodda `nukleer` yalnız yorumlarda geçiyor
(3 satır), EMP hiç yok. Patlayıcı türünden tek mekanik mayın
(`ayarlar.js` `MAYIN_*`). Ballistix bu yüzden eklentinin adına en yakın
içerik.

Sayılar `ballistix/common/settings/BallistixConstants` sınıfının statik
başlatıcısından okundu (`javap -c`, çalıştırılmadı). **Bunlar
varsayılan değerler**; mod bunları ayar dosyasından değiştirebiliyor.
Kaynakta birim yazılı değil: yarıçaplar blok, süreler büyük olasılıkla
tick (20 tick = 1 sn).

| patlayıcı | kademe | yarıçap / boyut | süre | not |
|---|---|---|---|---|
| Condensive | 1 | 2,5 | | |
| Incendiary (yangın) | 1 | 7 | | |
| Chemical (kimyasal) | 1 | 7 | 1200 | zehir gazı |
| Debilitation (zayıflatma) | 1 | 7 | 1200 | |
| Contagious (bulaşıcı) | 2 | 7 | 1200 | virüs yarıçapı 10 |
| Infestive (istila) | 1 | 7 | 20 | |
| Shrapnel (şarapnel) | 1 | | | 25 parça |
| Fragmentation | 2 | | | 50 parça |
| Anvil (örs) | 1 | | | patlama başına 10 örs |
| Breaching (kırıcı) | 2 | 5 | | enerji 60 |
| Sonic (ses) | 2 | 10 | 20 | en fazla sertlik 2 |
| Thermobaric | 2 | 30 | 45 | enerji 60 |
| Obsidian TNT | diğer | 10 | | |
| Ender | 3 | 9 | | 10 enderman çağırır |
| Hypersonic | 3 | 18 | 50 | sertlik 3 |
| Endothermic (dondurucu) | 3 | 30 | 20 | |
| Exothermic (ısıl) | 3 | 40 | 20 | %1 lav, %30 yanma |
| Anti-Gravity | 3 | 30 | | 300 bloğa kadar kaldırır, 2400 tick |
| EMP | 3 | 45 | 80 | |
| Nuclear (nükleer) | 3 | 45 | 360 | enerji 120 · radyasyon yarıçapı 90 · radyasyon **5 gerçek gün** |
| Antimatter | 3 | 45 | 80 | |
| Large Antimatter | 3 | 100 | 200 | |
| Dark Matter | 3 | 50 | 1200 | kalıcılık 1200 |

Atış sistemi: fırlatma rampası menzili T1 **500** · T2 **3000** · T3
**10000** blok, sapma 45; dikey silo 500; arama radarı 600; atış
kontrol radarı 550; SAM tareti menzili 300, soğuma 100, vurma şansı %70.

Her patlayıcının blok, el bombası ve vagon biçimi var (dil dosyasında
"Minecart with … Explosive" satırları); füzeler (Tier 1/2/3, cluster,
SAM, anti-balistik) ayrı eşya.

## Diğer dikkat çekenler

- **Compound V — 51 güç** (`effect.compound_v.*`): speedster,
  teleport, aimlock, pyrokinesis, cryokinesis, lifesteal, telekinesis,
  size control, invisibility, levitation, invincible, creative flight,
  laser eyes (temel/gelişmiş), shrink, enlarge, energy absorption,
  sonic scream, head pop, enhanced regen, density, slime, spider,
  instakill, mind control, berserker, projectile immunity, star power,
  chest blast, leap, explosive, healing, mimic, petrifying gaze,
  stormfront, forcefield, luck, magnetism, wither… Bir kısmı
  "uncontrolled_*" — kontrolsüz yan etki. Eşyalar: Compound V, Temp V,
  V1, **Anti-V** (gücü siler: `nullify`).
- **Legends-Superheroes — 38 karakter:** Superman (23 kostüm), Thor
  (24), Batman (16), Spider-Man (12), Robin (7), Iron Man (7), Joker
  (6), Moon Knight (5), Homelander (4), Flash, Spider-Man 2099,
  Daredevil, Symbiote Spider-Man, Supergirl, Black Widow, Batman
  Beyond, Green Goblin, Green Lantern, Aquaman, Reverse-Flash, Wonder
  Woman, Hawkeye, Captain America, Hulk, Wolverine, **Omni-Man**,
  **Invincible**, Nova, Blue Beetle, Silver Surfer ve 7 kötü
  (Shocker, Prowler, Speed Demon, Bullseye, Kingpin, Scorpion,
  Vulture — her biri çağrılabilir boss).
- **Legends-Anime — 9 karakter:** Saitama, Son Goku, Naruto, Sasuke,
  Kakashi, Boruto, Kawaki, Ryomen Sukuna, Arthur Leywin. Güç adları
  tanıdık (Rasengan, Chidori, Kamui, Sharingan, Zero Punch, Serious
  Punch…). Naruto tarafı için bizde ayrıca `REFERANS_NARUTO.md` var.
- **Cataclysm bossları:** Ender Guardian, Netherite Monstrosity, Ignis,
  The Harbinger, The Leviathan, Ancient Remnant, Maledictus, Scylla.
- **Alex's Caves:** Nuclear Bomb, Nucleeper (nükleer creeper),
  Tremorzilla, mıknatıs mağarası, şeker biyomu.

## Lisans ve izin

- Kayıt kuralı (`KAYNAKLAR.md`) geçerli: **sayıyı/fikri al, dosyayı
  alma.** Bu paketten hiçbir dosya depoya girmedi.
- İçerik modlarının çoğu **All Rights Reserved**. Açık lisanslı
  olanlar: Aperture Innovations ve Pandora's Box (MIT), Alex's
  Caves / Alex's Mobs (LGPL), Create (MIT). Lisans `mods.toml`'daki
  beyandan okundu; varlıkların (doku, ses) ayrı lisansı doğrulanmadı.
- **Legends çatısı açık bir yasak koyuyor:** `mods.toml` açıklaması
  *"Addon creation is not permissible during early access."* Legends
  içeriğini temel alan bir eklenti yapmak, yapımcının kendi şartına
  aykırı olur. Ölçüm bundan etkilenmiyor; dosya ya da birebir taşıma
  için yapımcının izni gerekir.
- Marka katmanı ayrı: DC, Marvel, Amazon (The Boys), Hasbro (Power
  Rangers), anime lisans sahipleri.

## Açık sorular — kullanıcının kararı

Bu belge yalnız ölçüm. Neyin eklentiye taşınacağı yazılmadı:

1. Ballistix tarzı bir patlayıcı ailesi (blok + el bombası + füze)
   Şimşek TNT'ye eklenecek mi? Eklenecekse hangileri?
2. Compound V'nin güç listesinden bizde olmayanlar seçilecek mi?
3. Bu paket kullanıcının **Java** oyunu için mi duruyor? Öyleyse
   `1Legends-1.7.10` jar'ını çıkarmak paketi 88,7 MB küçültür.
