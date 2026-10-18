# `mods.rar` (20 Eyl) — Forge 1.20.1 mod paketi, ayrıntılı inceleme

Kullanıcı (ilk istek): *"mods.rar 20 Eyl, 529 MB, Dosya — şimşek TNT modumuz
Google Drive'da bu dosyayı ara ve bu dosyayı incele."*
Kullanıcı (ikinci istek): *"bu dosyanın her ayrıntısına bakmaya çalış, hangi
şey ne yapıyor anlamaya çalış — ilk başta dosyayı anlamak önemli."*
Kullanıcı (üçüncü istek): *"kostümleri ve güçleri de incele; kostümleri
yapmak için gereken malzemeler, en çok malzeme gereken kostüm veya eşya ne;
kılıç, kazma, kürek gibi farklı varyasyonlar var mı; bloklar ne yapıyor —
tamamen incele."*

**Hiçbir dosya çalıştırılmadı, kurulmadı, depoya alınmadı.** RAR `bsdtar`
ile açıldı, jar'lar zip olarak okundu, sınıf dosyaları `javap -c` ile
**çözüldü** (yürütülmedi). Arşiv yalnız scratchpad'e indi. Bu belgedeki
her sayı o okumadan geliyor; tahmin olan yerler "tahmin" diye yazılı.

---

## 1. Kaynak

| | |
|---|---|
| Drive | `mods.rar`, sahibi `f13videodrive`, yüklenme 2026-09-20 14:29 UTC |
| kimlik | `1dsLebo6-DibNRslxT69T8yHqbIxNz9g2` (bağlantıya sahip herkes okuyabilir) |
| boyut | 528.697.570 bayt — Drive'daki boyutla **birebir aynı** |
| md5 | `242acc52c1bbb2db0ee1a7f31de16569` |
| sha256 | `2de7b992163d0582706057f587a3a47b62d8c53aba08c39ddbd8586b61be32c8` |
| biçim | RAR5, şifresiz, tek cilt; açılınca 575.523.094 bayt |
| içerik | 227 dosya: **54 jar** + Palladium'un ürettiği 180 dosyalık `documentation/` klasörü |

Drive'da aynı adla **ikinci bir dosya** daha var (2026-10-04, 147.770.769
bayt, kimlik `1mEtGIo1hl4XQCgIIj67E7sZ51pm0vPLY`). Bu belge yalnız 20 Eylül
tarihli olanı kapsıyor.

## 2. Kısa cevap: bu paket ne

Bir **Java Edition 1.20.1 Forge oyununun `mods/` klasörü**. Arşivdeki
dosya saatleri bunu gösteriyor: `documentation/palladium/` dosyaları
**14:25**'te yazılmış (Palladium bunu oyun açılırken üretiyor), arşiv
Drive'a **14:29**'da yüklenmiş. Yani paket bu haliyle oyunda açılmış ve
dört dakika sonra paketlenmiş.

İçerik beş katmana ayrılıyor:

| katman | ne için | modlar |
|---|---|---|
| **A. Süper güç sistemleri** | oyuncuyu kahramana çevirmek | Legends (+4 ek), PowerBorne/Palladium, Compound V, Symbiote |
| **B. Tehditler ve dünya** | dövüşülecek düşman, gezilecek yer | Cataclysm, Alex's Caves, Alex's Mobs, Craziness Awakened, Dungeon Crawl |
| **C. Yıkım ve oyuncaklar** | patlatmak, fırlatmak, şans | Ballistix (+Voltaic), Lucky Block, Pandora's Box, Gravity Gun, Aperture (portal) |
| **D. Üs, inşa, yaşam** | üs kurmak, süslemek, taşımak | Create, Hypertube, Chipped/Rechiseled, Secret Doors, Supplementaries, Cuffed, Traveler's Backpack, OreExcavation |
| **E. Altyapı** | yukarıdakilerin çalışması | 23 kütüphane / yardımcı (bölüm 4) |

Ağırlık açıkça **A**'da: dört ayrı güç sistemi, toplamda 38 + 9 + 6 + 2
Legends karakteri, PowerBorne'un 6 karakteri, Compound V'nin 40 gücü ve
simbiyot. **Tahmin:** bu, süper kahraman temalı video çekimi için kurulmuş
bir oyun. Depoda bu Java paketinin nerede kullanıldığına dair bir kayıt
yok (bkz. bölüm 12, soru 1).

## 3. Paket nasıl büyüdü

Jar'ların dosya tarihleri (RAR içindeki değiştirilme zamanı; çoğunlukla
indirme anı). Kesin değil ama sıra anlamlı:

| tarih | eklenenler | yön |
|---|---|---|
| 2023-11 → 2025-09 | 1Legends 1.7.10, architectury, Pehkui, Gravity Gun, Alex's Caves, OreExcavation, curios, rhino | eski indirmeler |
| **2026-02-15** | Create, Alex's Mobs, Chipped, citadel, cloth-config, athena, resourcefullib | ilk temel: makine + yaratık + dekor |
| 2026-04-12/20 | Supplementaries, **Craziness Awakened**, **Aperture**, **Pandora's Box**, AttributeFix | oyuncaklar, OreSpawn tarzı dünya |
| 2026-05/06 | KubeJS, **Cataclysm** + lionfishapi, atlas-core, GeckoLib, BadOptimizations, **Lucky Block**, retro damage indicators, Dungeon Crawl | bosslar, zindan |
| 2026-07/08 | azurelib, Hypertube, Secret Doors, rechiseled_chipped, **Compound V**, **Cuffed**, **Ballistix**, **Palladium**, **Legends-Superheroes**, Voltaic, fabric-api | **süper güç ve yıkım dönemi** |
| 2026-09-06 | **PowerBorne**, Traveler's Backpack, JEI, moonlight, fusion | |
| 2026-09-16/19 | Rechiseled, **Symbiote 1.1.3**, **Legends çekirdek ss1.0.12 + Anime + Power Rangers + Misc** | Legends ailesi tamamlandı |
| 2026-09-20 14:25 | oyun açıldı → 14:29 arşiv | |

## 4. Kim kime hizmet ediyor (bağımlılık ağacı)

`mods.toml` bildirimleri **ve** sınıf dosyalarındaki gerçek paket
kullanımı birlikte ölçüldü. Bildirilmeyen ama gerçekte kullanılan
bağlar da aşağıda.

```
Legends çekirdek ─┬─ azurelib (model/animasyon)         ← Anime, Misc, Power Rangers, Superheroes
                  └─ playeranimator (Legends'in içine gömülü)
PowerBorne ── Palladium ─┬─ palladiumcore (gömülü)
                         └─ KubeJS ─┬─ rhino (JavaScript motoru)
                                    └─ architectury
   (PowerBorne'un 54 .js betiği KubeJS üzerinden çalışıyor; bunu mods.toml'da bildirmiyor)
Ballistix ── Voltaic (enerji çatısı)
Cataclysm ── lionfishapi
Alex's Caves, Alex's Mobs ── citadel
Cuffed ── Lazr's Lib
Pandora's Box ── atlas-core ── cloth-config   (ikisi de bildirilmemiş, kullanım ölçüldü)
Chipped ── athena, resourcefullib ;  Rechiseled ── fusion, supermartijn642 core/config
rechiseled_chipped ── Chipped + Rechiseled
Supplementaries ── moonlight ;  Create ── flywheel, ponder (gömülü) ;  Hypertube ── Create
GeckoLib ← Gravity Gun, Aperture, Craziness Awakened, Palladium
Pehkui (boyut) ← Compound V, Craziness Awakened, PowerBorne
Curios (aksesuar yuvası) ← Cataclysm, Create, Palladium, Supplementaries, Symbiote, Backpack
JEI ← Create, Backpack (+ isteğe bağlı birçok mod)
```

**Kimseye hizmet etmeyenler:** `fabric-api` (Sinytra'nın Forge uyarlaması;
hiçbir mod ona bağlı değil, hiçbir sınıf onu çağırmıyor). `AttributeFix` ve
`BadOptimizations` bağımsız çalışan yardımcılar: biri öznitelik tavanlarını
yükseltiyor (ör. can, saldırı; güç modlarının yüksek değerleri için),
öteki performans.

**Eksik zorunlu bağımlılık yok**; bütün sürüm aralıkları tutuyor.

## 5. A katmanı — süper güç sistemleri

Dört sistem **birbirinden bağımsız**: ayrı güç kaydı, ayrı tuşlar, ayrı
kaynak çubukları. Biri ötekinin gücünü tanımıyor.

### 5.1 Legends (tihyo / Legends Modding Team) — en büyük parça

Dört jar: çekirdek `legendsmod` (43,8 MB) + Superheroes (96,2 MB) + Anime
(25 MB) + Power Rangers (3,5 MB) + Misc (1,7 MB).

**Nasıl çalışıyor (sınıflardan okundu):**

- **Kostüm = karakter.** Her kostüm bir zırh takımı (baş, gövde, bacak,
  ayak). Kostüm sınıfı giyilince oyuncuya `LegendsAbilities.addPassive` /
  `addAbility` / `addSwappableAbility` ile güçleri **seviyeleriyle**
  ekliyor.
- **Güçler `MobEffect` olarak kayıtlı.** Superheroes'taki 925 "efekt" bu
  yüzden var: her güç bir efekt.
- Güç türleri paketlere ayrılmış: `assignable/stamina` (185 sınıf),
  `assignable/mana` (153), `assignable/utility` (125), `assignable/social`
  (44), `passives` (84), `ultimate` (43), `clazz` (15). Yani güçler
  **dayanıklılık** ya da **mana** harcıyor. Her karakterin bir "sınıf"
  gücü, bir "nihai" gücü ve bir "sosyal" hareketi var.
- **Karaktere özel sayaçlar** (komutlardan ve güç adlarından): güneş
  sayacı (Superman/Supergirl), simbiyot öfkesi, ilahilik (Thor), karma
  (Boruto/Kawaki), çakra, lanet mührü (Sasuke), öfke (Naruto).
- **Ortak taban:** neredeyse her karakterde Fortitude, Health, Mana,
  Stamina, Speed, Strength, Regeneration, Piercing Resistance, Mental
  Defense, Soundboard (karakter repliği) var. Aşağıdaki tablo bunları
  çıkarıp **yalnız karaktere özgü güçleri** gösteriyor.

**Oyun döngüsü (dil dosyası ve sınıflardan):**

| parça | ne yapıyor |
|---|---|
| **The Nexus** (blok) | sahibine kilitli üs. Kalkanı (`ForcefieldHealth`) var, yalnız sahibi açıp kırabiliyor. İçine **Nexus Core** konuyor (Basic / Advanced / Ultimate / Admin; kullanım hakkı sınırlı). Ekranları: **karakter seçimi ve kostüm yapımı** (bölüm 12.1), **görev seçimi**, atlas, bakım |
| **Görevler** | Nexus'tan başlıyor, gruplu oynanıyor ("party"): oyuncu başına ek can, bonus ganimet şansı. Superheroes'ta 7 görev bossu: Kingpin, Shocker, Vulture, Bullseye, Speed Demon, Scorpion, Prowler |
| **Book of Legends** | karakter dosyası (dossier), içindekiler, yer imi |
| **Character Mastery** (tuş `` ` ``) | aktif karakterin ustalık puanı (SP). Mastery Booster %10 / %25 / %50, 30 dakika. Karaktere özel yükseltmeler (`SUPERMAN_UPGRADE` gibi) |
| **Etherean** | her evrenin özü (Kryptonian, Speed Force, Asgardian, Gamma, Symbiote…). Kostüm tariflerinin anahtar malzemesi: normal yolda karakterin kendi Etherean'ı, transmute yolunda genel Etherean (bölüm 12.1). Genel Etherean, Etherean Ore'dan çıkıyor |
| **Rune Forge** | zamanlamalı vurma mini oyunu (ısı çubuğu doğru banttayken vur) |
| **Microscope, Molecular Rearranger, Stark Bench** | özel tarif tezgâhları |
| **Kostüm vitrini** | kostümü aksiyon figürü ya da tam boy sergileyen stand; poz, dönüş, galeri |
| **Extra Equipment** | gövde bölgelerine (baş, kollar, bacaklar) ek ekipman yuvası |
| **Taretler** | sahibine ait, mermi dolduruluyor |
| **Boyutlar** | Speed Force, Negative Speed Force, Kingpin (Superheroes); Fractured Echo biyomu (çekirdek) |
| **Cevherler** | Kryptonite, X-Kryptonite, Uru, Vibranium, Nth Metal, Oanite, Lunar, Lightning Stone, Aquastone, Gamma radyasyonu (dünyada üretiliyor) |
| **Olay** | `SymbioteMeteorEvent` — simbiyot meteoru düşüyor |

**Superheroes — 38 karakter, kostüm sınıflarından ölçülen güçler:**

| karakter | kostüm sınıfı | toplam güç | karaktere özgü güçler |
|---|---|---|---|
| Aquaman | 1 | 26 | Ice Spikes · Marine Telepathy · Mind Fracture · Oceanborne · Oceanic Support · Poseidon's Calling · Raging Wave · Telepathic Seizure · Trident Blast · Trident Fury · Trident Stab · Trident of Poseidon · Wrath Of The Seven Seas |
| Batman | 16 | 31 | Attach Explosive · Axe Kick · Bat Swarm · Batarang Onslaught · Cape Counter · Cape Whip · Cloak · Detective Mode · Equip Grappling Gun · Gliding · Nocturnal Takedown · Scatter Bombs · Sliding Kick · Stealth · Straight Grapple · Utility Belt |
| Batman Beyond | 1 | 30 | Beyond Capabilities · Beyond Demand · Beyond Interface · Electrical Discharge · Enhanced Fingertips · Flashbang Assault · Flight · Jet Blitz · Spiked Slashes · Stealth · Straight Grapple · Utility Belt |
| Black Widow | 1 | 24 | Bullet Storm · Covert Takedown · Escape Artist · Red Ledger · Splinter Kick · Stealth · Tactical Gear · Veil of Shadows · Widow Punch · Widow's Bite (Shockwave) · Widow's Bite (Sting) · Widow's Line · Widowmaker |
| Blue Beetle | 1 | 28 | Beetle Pincher · Beetle Scarab · Flight · Khai-Barrage · Khai-Drill · Mandible Flurry · Plasma Cannons · Scarab Capabilities · Scarab Maces · Scarab Obliterator · Scarab Shield · Scarab Swarm · Scarab Swords · Sonic Cannons · Staple Gun |
| Bullseye | 1 | 28 | Adamantium Skeleton · Deadeye Focus · Dealer's Execution · Elbow Strike · Evasion Shot · Killshot Protocol · Lethal Improvisation · Perfect Throw · Pin Down · Precision Strike · Ricochet Shot · Summon Bullseye Weapons · Triple Deck |
| Captain America | 1 | 26 | Adamantium Sentinel · Adrenaline · Blazing Shield · Charging Star · Freedom Charge · Rising Flag · Shield Bash · Shield Slice · Shield Strike · Summon Shield · Super-Soldier Slam · Vibranium Energy Saw |
| Daredevil | 2 | 32 | Adrenaline · Devil Roundhouse · Devil's Chain · Devil's Latch · Devil's Throw · Let The Devil Out!!!!! · Objection! · Radar Sense · Righteous Cross · Sonic Pursuit · Stealth · Summon Billy Clubs · Sweep Pummel · Vigilante Justice |
| Flash | 3 | 27 | Adjustable Speed · Arm Vortex · Heightened Perception · Lightning Throw · Overclock · Speed Blitz · Speed Force Strikes · Speed Force Utility · Speedster Aura · Supersonic Punch · Vibe Step · Vibrate · Vortex Trap · Wall Running · Whirlwind · Wind Vacuum |
| Green Goblin | 1 | 27 | Bag of Tricks · Flight · Glider Assist · Glider Turrets · Goblin Flight · Goblin Slam · Goblin Trident · Goblin's Dread · Goblin's Reign Of Terror · Gobweb Cannon · Homing Missiles · Rocket Blast · Shock Gloves · Spiral Skewer · Summon Glider |
| Green Lantern | 1 | 28 | Flight · Flight Jet Squadron · Hal Corps · Jet Flight · Lantern Aura Passive · Lantern Daggers · Lantern Transform · Oa's Rocket · Turbine Smash · Willpower · Willpower Beam · Willpower Blast · Willpower Capabilities · Willpower Constructs · Willpower Express · Willpower Forcefield |
| Hawkeye | 1 | 24 | Archer Vision · Cluster Arrows · Crescent Slash · Hypersonic Arrow · Nightstorm Arrow · Quickdraw · Relentless Assault · Shuriken Blitz · Specialized Arrow · Summon Bow & Katana · Sweeping Blade · Trick Arrows |
| Homelander | 4 | 26 | Chest Burst · Enhanced Senses · Flight · Heat Glare · Heat Vision · Heightened Perception · Incinerate · Lobotomize · Relax · Rush · Sonic Scream · Turn-Based Mode |
| Hulk | 1 | 28 | Gamma Bombardment · Gamma Nuke · Gamma Poison · Gamma Rage · Gamma Thunderclap · Hulk Leap · Hulk Out! · Hulk Smash · Impact Punch · Radioactive Lockdown · Raged Frenzy · Rampage · Rubble Smash · Tectonic Fury · Wall Scaling · World Breaker |
| Invincible | 1 | 26 | Dash · Flight · Flying Knee Kick · Geyser · Invincible Punch · Meeting of the Minds · Meteor Kick · Perfect Landing · Super Hearing · Thunderclap · Viltrumissile · Viltrumite Rage |
| Iron Man | 7 | 34 | Advanced HUD · Armor Capabilities · Armor Overdrive · Armor Transformation · Energy System · Flight · Ghost Protocol · Jarvis · Power Dive · Power Thrust · Pulse Cannon · Repulsor Beam · Repulsor Blast · Secondary Weapon Systems · Stealth · Thrusters · Unibeam · Unibeam Blast |
| Joker | 6 | 25 | Acid Flower · Balloonatic · Clattering Teeth · Crowbar Slam · Endure · Exploding Pie · Flying Spin Kick · Joker Venom · Joker Weapons · Joy Buzzer · Laugh · Shank Shank · Throwing Cards |
| Kingpin | 1 | 24 | Bear Fat · Bear Hug · Bear Lunge · Burst Shot · Cane Spray · Disintegrator Ray · Fisk Fury · Kingpin! · Lunge · Man-Handle · Powerslam · Summon Guards · Summon Obliterator Cane · Suppression Shot · Unstoppable |
| Moon Knight | 5 | 35 | Crescent Kick · Endure · Equip Weapons · Flight · Gliding · Insanity's Retribution · Khonshu Prayer · Khonshu's Avatar · Lunar Arsenal · Lunar Strike · Lunar Whirlwind · Moon Empowerment · Random BS Go · Silver Cestus · Spatial Disintegration · Stealth · Truncheon Onslaught · Vengeance Burst |
| Nova | 1 | 28 | Centurion Blitz · Centurion Rush · Flight · Gravimetric Field · Gravimetric Pulse · Human Rocket · Nova Force Blast · Nova Force Blaster · Nova Force Javelin · Nova Prime · Nova Slam · Nova Throw · Super Nova · Worldmind · Worldmind Acceleration |
| Omni-Man | 1 | 27 | Bootstain · Conqueror · Cranial Impact · Flight · Knifehand Slice · Last Stop · Mega Clap · No Escape · Skullbreaker · Super Hearing · Viltrumite Pinball · Viltrumite Stance |
| Prowler | 1 | 30 | Condensed Air Blast · Flight · Gauntlet Choke · Gauntlet Darts · Gauntlet Slice · Inattentive Scattershot · Insulated Suit · Jet Boots · Jet Burn · Jet Dash · Pneumatic Gauntlets · Pneumatic Strike · Prowler Ambush · Prowler Gauntlets · Prowler Technology · Stealth · Wall-Crawling |
| Reverse-Flash | 1 | 28 | Adjustable Speed · Arm Vortex · Aura Tear · Chest Burst · Heightened Perception · Lightning Gauntlet · Living Paradox · Negative Speed Force Utility · Overclock · Remnant Army · Speed Blitz · Speed Mirage · Speedster Aura · Vibe Step · Vibrate · Wall Running · Wind Vacuum |
| Robin | 7 | 23 | Attach Explosive · Clean Sweep · Detective Mode · Equip Weapons · Flying Grayson · Flying Spin Kick · Gliding · Robin's Reckoning · Stealth · Sweep Kick · Utility Belt |
| Scorpion | 1 | 25 | Acid Bath · MetasoMa Slam · MetasoMa Strangle · Pincer Gash · Predator Instinct · Prey Piercer · Scorpion Toxin · Scorpion's Prey · Transparent Membrane · Venomous Laser · Venomous Sting · Venomous Toxin · Wall-Crawling |
| Shocker | 1 | 21 | Concussion Bolt · Kinetic Overload · Resonance Lock · Shocker Leap · Shockwave Salvo · Subsonic Blast · Vibrational Blast · Vibrational Field · Vibrational Shield · Vibrational Shockwave · Vibro-Smashers |
| Silver Surfer | 1 | 29 | Board Bash · Cosmic Awareness · Cosmic Blast · Cosmic Block · Cosmic Burst · Cosmic Punch · Cosmic Slice · Cosmic Strike · Cosmic Utility · Energy Absorption · Event Horizon · Power Cosmic · Pulverizing Light · Silver Surfer Flight · Surfer Rise · Warpdash |
| Speed Demon | 1 | 24 | Adjustable Speed · Adrenal Overdrive · Heightened Perception · Incendiary Afterimage · Phase Crash · Sonic Detonation · Speedster Aura · Vibe Step · Vibrate · Vortex Spin · Vortex Trap · Wall Running · Whiplash Barrage · Whirlwind |
| Spider-Man | 12 | 31 | Maximum Spider · Organic Webbing · Spider Kick · Spider Sense Passive · Spider Uppercut · Spider-Capabilities · Wall-Crawling · Web Blossom · Web Gadgets · Web Sling · Web Sling (Tether) · Web Yank · Web Zip Ability · Webbed Fist · Wrecking Ball |
| Spider-Man 2099 | 3 | 34 | Accelerated Attack · Accelerated Decoy · Accelerated Pulsar · Accelerated Vision · Astral Kick · Decoy Strike · Flight · Gliding · Jet Boots · Spider-Capabilities · Spinnerets · Talon Strikes · Talons · Time Paradox · Wall-Crawling · Web Sling · Web Sling (Tether) · Web Yank · Web Zip Ability |
| Super Steve | 1 | 0 | (güç yok — kozmetik kostüm) |
| Supergirl | 1 | 29 | Charged Heat Blast · Flight · Heat Vision · Heightened Perception · Kryptonian Senses · Recklessness · Solar Amplification · Solar Drainage · Solar Endurance · Speeding Bullet · Super Breath (Freeze) · Super Breath (Gust) · Super Scream · Super Uppercut · Superspeed |
| Superman | 23 | 36 | Blood Swords · Disguise · Flight · Heat Array · Heat Glare · Heat Twirl · Heat Vision · Heightened Perception · Kryptonian Senses · Multi-Strike · Power Dive · Solar Amplification · Solar Drainage · Sonic Punch · Super Breath (Freeze) · Super Breath (Gust) · Super Flare · Superspeed · Thunderclap |
| Symbiote Spider-Man | 2 | 36 | Area of Engagement · Bully Maguire · Inkfade · Spider Sense Passive · Stealth · Sym. Spider-Capabilities · Symbiote Adaptation · Symbiote Blast · Symbiote Bomb · Symbiote Constructs · Symbiote Rage Meter · Symbiote Retaliation · Symbiote Strike · Symbiote Surge · Symbiote Tempest · Symbiote Yank · Symbiote's Rage · Symbiotic Dash · Tendril Strike · Wall-Crawling · Web Sling · Web Sling (Tether) |
| Thor | 25 | 33 | Bifrost · Civilian Form · Flight · God Blast · God of Thunder · Hammer Spin · Lightning Blast · Lightning Strike · Lightning Vortex · Mighty Tornado · Storm Striker · Suit Up · Summon Mjolnir · Summon Stormbreaker · Warrior's Fury · Weapon of a King |
| Vulture | 1 | 22 | Aerial Predator · Aerobatic Flight · Buzzard's Cyclone · Cunnin Condor · Electro-Magnetic Harness · Flight Dash · Sharp Feathers · Sky Bombs · Tactical Flight · Upwards Scavenger · Vulture Slash · Winged Repulse · Wingspan Laceration |
| Wolverine | 1 | 27 | Adamantium Claws · Adamantium Claws Passive · Adamantium Skeleton · Berserker Barrage · Berserker Rage · Claw Strike · Feral Leap · Fury Swipes · Pounce · Primal Rage · Regenerative Healing Factor · Scent Tracker · Vicious Rampage · Wall Scaling · Weapon X |
| Wonder Woman | 1 | 27 | Amazonian Cataclysm · Amazonian Resilience · Bracelets of Submission · Flight · Flying Knee Kick · Lasso Bind · Lasso Pull · Shield Bash · Sliding Kick · Sword & Shield · Sword of Ares · Tiara Throw |

Super Steve'in kostümü güç vermiyor (kozmetik). Superman 23, Thor 25,
Batman 16 ayrı kostüm sınıfına sahip; güç listesi kostümler arasında
birleştirildi.

**Anime — 9 karakter (12 form):**

| karakter | karaktere özgü güçler (seçme) |
|---|---|
| Saitama | Normal Punch, Consecutive Normal Punches, Serious Mode, Serious Punch, Omnidirectional Serious Punch, Serious Sneeze, Serious Table Flip, Zero Punch, Work Out |
| Son Goku | Kamehameha, Supreme Kamehameha, Spirit Bomb, Instant Transmission, Ultra Instinct, Destructo Disc Hexa Blade, Dragon Burst, God Bind, Ki Blast; **Super Saiyan'a yükselme** ve **Kaioken** ayrı yetenek |
| Naruto / Naruto Shippuden | Rasengan, Vermillion Rasengan, Giant Rasengan, Rasenshuriken, Shadow Clone Jutsu, Uzumaki Barrage, Kurama Fist, Kurama Chakra Arms; **One-Tailed** ve **Three-Tailed Cloak** formları |
| Sasuke / Sasuke Shippuden | Chidori (Nagashi, Senbon, Sharp Spear, Onyx), Kirin, Fire Style (Fireball, Phoenix Flower, Dragon Flame), Sharingan, Curse Mark |
| Kakashi | Lightning Blade, Kamui, Sharingan: Copy Jutsu / Genjutsu / Deception, Earth Wall, Water Bullet, Thousand Years of Death |
| Boruto / Boruto TBV | Vanishing Rasengan, Rasengan: Uzuhiko, Jougan, Karma Seal, Flying Raijin, Sword of Kusanagi, Purple Lightning |
| Kawaki / Kawaki TBV | Kokugan, Karma Seal, Daikokuten, Sukunahikona, Kāma: Great Burial Wave, Black Piercer |
| Ryomen Sukuna | Cleave, Dismantle Barrage, World Cutting Slash, Malevolent Shrine, Divine Flame |
| Arthur Leywin | Realmheart, Absolute Zero, Black Lightning, White Flame, Burst Step, Mirage Walk |

Ayrıca **Ninja Guard** adlı düşman (28 güç: Sharingan, Kamui, Lightning
Blade…).

**Power Rangers — 6 kostüm:** Mighty Morphin Red / Black / Blue / Green /
White ve Dino Thunder White. Her biri "It's Morphin Time!" dönüşümü,
kendi silahı (Power Sword, Power Axe, Power Lance, Dragon Dagger, Saba,
Drago Sword) ve Dragon Shield. Malzeme: Power Coin, fosiller, Morphin Grid
kristali. Düşman: Putty Patroller.

**Misc — 2 karakter:** Kratos (Blades of Chaos, Spartan Rage, Army of Hades,
Zeus' Fury, Medusa's Gaze, Golden Fleece…) ve Zero / Mega Man (Z-Saber,
Air Dash, Cyberspace, Rakusaiga, Tenretsujin). Zero'nun sınıfı Kratos'un
güç alanlarına da atıf yapıyor; bunun ortak kod mu yoksa gerçekten verilen
güç mü olduğu bytecode okumasıyla ayırt edilemedi. Düşman: Undead
Legionnaire.

### 5.2 PowerBorne Heroes 0.5.1 → Palladium 4.5.9

Ayrıntı `REFERANS_POWERBORNE.md`'de, aynı sürüm. Bu paketteki ek bulgular:

- Palladium'un oyunda ürettiği belge, kayıtlı yetenek türlerini
  gösteriyor: **Palladium 43, PowerBorne 53, GeckoLib 2**; koşul türleri:
  Palladium 79, PowerBorne 31. Legends ve Compound V Palladium kullanmıyor.
- **Kostüm parşömeni (`suit_scroll`):** `accessory_system.js` betiği
  PowerBorne kostüm görünümlerini Palladium'un "destekçiye özel aksesuar"
  mekanizmasıyla kilitliyor. Parşömene sağ tıklayınca görünüm açılıyor;
  **gezgin tüccar** her doğuşta 24–31 zümrüde rastgele bir parşömen
  satıyor. Betik yalnız PowerBorne'un kendi aksesuarlarına dokunuyor;
  zararlı bir şey yok.

### 5.3 Compound V 2.3.6 (Blue Duck) — The Boys

**Mekanizma:** Compound V'yi içen oyuncu **ağırlıklı rastgele** bir güç
alıyor. 496 ayar anahtarı varsayılanlarıyla okundu (`Config` sınıfı).

| eşya | ne yapıyor |
|---|---|
| **Compound V** | kalıcı rastgele güç; %10 ihtimalle kötü sonuç |
| **Temp V** | geçici güç, 24.000 tick (= 20 dakika); kötü sonuç ihtimali 0 |
| **V1** | ayrı, üst düzey güç havuzu (aşağıda) |
| **Anti-V** | gücü siler (`nullify`) |

**Normal güç ihtimalleri** (ağırlık toplamı 144):

- En olası: Enhanced Regen (8 → %5,6).
- Ağırlığı 5 olanlar (her biri %3,5): Atom Charging, Berserker, Density,
  Enlarge, Generic, Invisibility, Laser Eyes (temel), Leap, Levitation,
  Night Vision, Power Absorption, Projectile Immunity, Shrink, Sonic
  Scream, Speedster, Teleportation, Water Power.
- Slime 4; Creative Flight, Explosive, Forcefield, Head Pop, Healing,
  Lifesteal, Luck, Mind Control 3; Aimlock, Cryokinesis, Laser Eyes
  (gelişmiş), Mimic, Nullify, Petrifying Gaze, Pyrokinesis, Size Control,
  Spider, Telekinesis 2.
- En nadir: Instakill, Invincible, Star Power (1 → %0,7).
- **Chest Blast ve Stormfront normal havuzda yok (ağırlık 0)**, yalnız
  V1'den çıkıyor.

**V1 havuzu** (toplam 23): Head Pop 3, Laser Eyes gelişmiş 3, Speedster 3,
Creative Flight 2, Mind Control 2, Size Control 2, Stormfront 2, Teleport
2, Chest Blast 1, Instakill 1, Invincible 1, Star Power 1.

**Kötü sonuçlar** (%10 ihtimalle; ağırlık toplamı 63): kontrolsüz
ışınlanma 15 (%24), solma 8, kontrolsüz boyut 8, kontrolsüz patlama 6
(gücü 6,0; TNT 4,0), kontrolsüz kafa patlatma 6, körlük / süzülme /
manyetizma / yavaşlık 5'er.

**Güç kademeleri** S+ · S · A · B · C · D:

| kademe | güç çarpanı | alınan hasar çarpanı |
|---|---|---|
| S+ | ×3,0 | ×0,15 |
| S | ×2,0 | ×0,30 |
| A | ×1,75 | ×0,40 |
| B | ×1,5 | ×0,50 |
| C | ×1,25 | ×0,65 |
| D | ×1,1 | ×0,80 |

**Varsayılan olarak KAPALI olanlar:** güçlü doğan yaratıklar
(`enableMobPowers=false`; açılırsa %5), aynı anda birden çok güç
(`enableMultiPowers=false`; açılırsa en fazla 2), "bu gücü yalnız N oyuncu
alabilir" sınırı (`exclusivePowers=false`), yaratıklardan V düşmesi (0).

**Örnek sayılar:** Explosive yarıçap 4, bekleme 600 tick (30 sn) · Chest
Blast dolum 200 tick (10 sn), ışın 80 tick (4 sn), bekleme 1200 tick
(60 sn), ışın hasarı tick başına 3,0 · nova yarıçapı 8, gücü 10 · Laser
Eyes temel 0,15/tick menzil 40, gelişmiş 0,35/tick menzil 80 · Sonic Scream
10 hasar, bekleme 300 · Forcefield 100 can · Telekinesis menzil 48 · boyut
0,25–4,0 (Pehkui ile).

**Başka modlara bağlantılar:** Alex's Caves yüklüyse onun "irradiated"
efektini tanıyor (radyasyonun gücü zayıflatması varsayılan kapalı).
Virüs efekti oyuncu ve yaratık güçlerini kapatıyor
(`virusDisablesPlayerPowers=true`).

### 5.4 Symbiote 1.1.3 (kitigawa)

`REFERANS_SIMBIYOT.md` 1.1.2'yi anlatıyor. 1.1.3'te 12 sınıf fazla ama
**dil anahtarları (655) ve 52 yetenek sınıfı aynı**: yamalı sürüm, yeni
yetenek yok. Akış: asteroit / meteor (`MeteorCrashGenerator`) → Dormant
Symbiote Sample → bağ kurma. Infected Zombie düşmanı. 15 tuşu var
(bölüm 9.4).

## 6. B katmanı — tehditler ve dünya

### 6.1 L_Ender's Cataclysm 3.31 — bosslar

Her bossun **vuruş başına hasar tavanı** (`damageCap`) ve **saniye başına
hasar tavanı** (`dpsCap`) var. Tek vuruşla öldürmeye karşı bir koruma bu:

| boss | vuruş tavanı | saniye tavanı |
|---|---|---|
| Netherite Monstrosity | 25 | 20 |
| Ender Guardian | 22 | 13 |
| The Harbinger | 22 | 14 |
| Ancient Remnant | 21 | 14 |
| Scylla | 21 | 13 |
| Clawdian | 21 | 12 |
| Ignis | 20 | 14 |
| The Leviathan | 20 | 15 |
| Maledictus | 20 | 13 |
| Ender Golem | tavan yok (999.999) | tavan yok |

Bu, A katmanıyla doğrudan etkileşiyor: Superman'in ya da Compound V'nin
S+ kademesinin vuruşu ne kadar yüksek olursa olsun bossa en fazla 20–25
hasar geçiyor.

Boss arenaları (yapılar): Ruined Citadel, Burning Arena, Soul Black Smith,
Ancient Factory, Sunken City, Cursed Pyramid, Frosted Prison, Acropolis;
bunları bulduran 8 "göz" eşyası (Eye of Abyss / Curse / Desert / Flame /
Mech / Monstrous / Ruined / Storm). Boss silahlarından: Ceraunus (16
hasar), Soul Render (15), Incinerator (14), Infernal / Void Forge (13),
Astrape (10,5), Gauntlet'ler (11).

### 6.2 Alex's Caves 2.0.2 ve Alex's Mobs 1.22.9

Alex's Caves altı mağara biyomu ekliyor: **Magnetic Caves, Primordial
Caves (dinozorlar), Toxic Caves (radyasyon, Nuclear Bomb, Nucleeper),
Abyssal Chasm (derin deniz, denizaltı), Forlorn Hollows (karanlık),
Candy Cavity (şeker)**. Dev boss: Tremorzilla. 81 varlık, 322 blok.
Alex's Mobs 117 varlık, 255 eşya (gerçek hayvanlardan esinli).

### 6.3 Craziness Awakened 7.0 (Zenyx) — "Orespawned Reawakened"

Eski **OreSpawn** modunun yeniden yapımı. 115 varlık (Mobzilla, The King,
The Kraken, Mothra, T-Rex, Basilisc, Emperor Scorpion, Robo serisi…),
**5 boyut** (Crystal, Danger, Miner's Paradise, Utopia, Village), 10 biyom,
60'tan fazla yapı (Nightmare Spire, Vortex Battle Tower, Ender Reaper
Castle, Inca Temple…). Binek yaratıkların kendi tuşları var (bölüm 9.4).

### 6.4 Dungeon Crawl 2.3.15

Vanilla zindanların yerine çok katlı büyük zindanlar ("Roguelike Dungeons"
ın devamı). Tek yapı türü: `dungeon`.

## 7. C katmanı — yıkım ve oyuncaklar

### 7.1 Ballistix 1.1.1 (+ Voltaic) — Şimşek TNT için en ilgili kısım

Eklentide patlayıcı **blok ailesi yok**: `blocks/` altında 10 blok var,
hiçbiri patlayıcı değil. Kodda `nukleer` yalnız yorumlarda geçiyor
(3 satır), EMP hiç yok. Patlayıcı türünden tek mekanik mayın
(`ayarlar.js` `MAYIN_*`).

Sayılar `BallistixConstants` sınıfının statik başlatıcısından. **Varsayılan
değerler**, ayar dosyasıyla değişebiliyor. Kılavuz metni yarıçapın blok,
sürenin tick olduğunu söylüyor (`Radius: %s blocks`, `Duration: %s ticks`).

| patlayıcı | kademe | yarıçap | süre | kılavuzdaki tanım |
|---|---|---|---|---|
| Condensive | 1 | 2,5 | | zayıf ama hızlı patlayan TNT |
| Incendiary | 1 | 7 | | yarıçaptaki bütün blokları tutuşturur |
| Chemical | 1 | 7 | 1200 | mide bulantısı, kazma yorgunluğu, yavaşlık, zehir gazı |
| Debilitation | 1 | 7 | 1200 | bulantı, kazma yorgunluğu, yavaşlık |
| Contagious | 2 | 7 | 1200 | körlük, güçsüzlük, açlık; bulaşıcı (virüs yarıçapı 10) |
| Infestive | 1 | 7 | 20 | arazi zararı yok, bloklara gümüşçün yerleştirir |
| Shrapnel | 1 | | | 25 şarapnel |
| Fragmentation | 2 | | | 50 patlayan şarapnel |
| Anvil | 1 | | | küre biçiminde 10 örs fırlatır |
| Attractive / Repulsive | 1 | | | varlıkları merkeze çeker / iter |
| Breaching | 2 | 5 | | sertleştirilmiş malzeme kırıcı, enerji 60 |
| Sonic | 2 | 10 | 20 | zayıf blokları uçurur, kırmaz |
| Thermobaric | 2 | 30 | 45 | çok büyük konvansiyonel patlama |
| Obsidian TNT | — | 10 | | güçlendirilmiş TNT |
| Ender | 3 | 9 | | yarıçaptakileri End'e ışınlar |
| Hypersonic | 3 | 18 | 50 | Sonic'in güçlüsü |
| Endothermic | 3 | 30 | 20 | dondurup savurur |
| Exothermic | 3 | 40 | 20 | eritir, yakar (%1 lav) |
| Anti-Gravity | 3 | 30 | 2400 | yerçekimini tersine çevirir (300 bloğa kadar) |
| EMP | 3 | 45 | 80 | makine ve eşyaların enerjisini boşaltır |
| Nuclear | 3 | 45 | 360 | "Nuke go boom." — radyasyon yarıçapı 90, **5 gerçek gün** |
| Antimatter / Large Antimatter | 3 | 45 / 100 | 80 / 200 | antimadde |
| Dark Matter (yapım aşamasında) | 3 | 50 | 1200 | blok ve varlık yutan, sonra serbest dolaşan tekillik |
| Rejuvenation | 3 | | | patladığı chunk'ı sıfırlar |

Her patlayıcının blok, el bombası (dokuzu) ve vagon biçimi var.

**Füze sistemi:** Missile Silo üç parçadan çok bloklu yapı (Launch
Platform + Control Panel + Support Frame, her biri T1/T2/T3). Menzil T1
**500**, T2 **3000**, T3 **10.000** blok. Destek çerçevesi yoksa sapma 45
blok. Füze kademesi taşıyabileceği patlayıcı kademesini sınırlıyor. VLS
(dikey silo, 500 blok), Rocket Launcher (elde, T1), Laser Designator
(uzaktan ateş), Radar Gun, Tracker (bir varlığı izleyip ona füze yollamak)
ve Jammer (izlemeyi bozmak).

**Füze savunması:** Search Radar (600), Fire Control Radar (550), ESM Tower
(düşman radarını bulur), taretler: CIWS (saniyede 20 mermi), SAM (300 blok,
%70 vurma), Railgun, Laser (çok enerji yer, ısınır), Anti-Ballistic Missile.

**Enerji sorunu (ölçüldü):** Kılavuza göre Control Panel, VLS, radarlar,
ESM Tower, Proximity Detector ve enerjili taretler Electrodynamics yoksa
**"başka herhangi bir moddan FE"** istiyor. Pakette **Electrodynamics yok**
ve **FE üreten bir blok bulunamadı**. `IEnergyStorage` kullanan dört jar
var: Palladium'unkiler pil eşyası (Flux Capacitor), Voltaic yalnız çatı ve
yükseltme, Aperture ile Ballistix tüketici. Sonuç: elle tutuşturulan
patlayıcılar, el bombaları, vagonlar, mayın, Rocket Launcher ve Air Raid
Siren çalışır. **Silo ile radar ve taret savunması enerjisiz kalır.**

### 7.2 Diğer oyuncaklar

| mod | ne yapıyor |
|---|---|
| **Lucky Block 13.0** | rastgele sonuçlu blok + Lucky Sword / Bow / Potion |
| **Pandora's Box 2.6.3** (MIT) | açılınca rastgele olay zinciri; Giant varlığı, End taşı blokları |
| **Cloro's Gravity Gun 1.3.1** | Gravity Gun, Supercharged Gravity Gun, **Tool Gun**, Displacer Cannon, Portal Thrower (kendi Portal 1/2'si). Açıklaması: *"çok oyunculuda çalışmayabilir"* |
| **Aperture Innovations 2.0.1** (MIT) | Portal Gun, Long Fall Boots, Companion Cube, Colorful Gel, test odası blokları |

Pakette **iki ayrı portal sistemi** var (Gravity Gun'ın Portal Thrower'ı ve
Aperture'un Portal Gun'ı).

## 8. D katmanı — üs, inşa, yaşam

| mod | ne yapıyor |
|---|---|
| **Create 6.0.8** | mekanik makine sistemi (dişli, pres, tren…) |
| **Create Hypertube 0.6.0** | oyuncuyu taşıyan tüpler (giriş, hızlandırıcı, ayırıcı) |
| **Chipped** (6967 blok) + **Rechiseled** (2418) + köprüsü | dekor blok varyantları, keski ile dönüştürme |
| **Secret Doors** | 158 gizli kapı / kapak (kütük, tuğla, kitaplık görünümlü) |
| **Supplementaries** | vanilla tarzı işlevsel bloklar (225 blok) |
| **Cuffed 1.3.15** | **hapishane seti**: kelepçe, pranga, bacak zinciri, anahtar, maymuncuk, hücre kapısı, güçlendirilmiş taş, giyotin, teşhir boyunduruğu, kasa. 16 büyü (Silence: kelepçeli kişinin manasını boşaltır; Curse of Binding: ölünce de kalır…). Kelepçeliyken başka modların hareket tuşlarını (ParCool, Epic Fight kaçış) da kilitliyor |
| **Traveler's Backpack** | yükseltilebilir sırt çantaları, 25 çanta yeteneği |
| **OreExcavation** | damarı / ağacı tek seferde kazma |
| **JEI** | tarif görüntüleyici |
| **Retro Damage Indicators** | ekranda yaratık canı |

## 9. Çakışmalar ve sorunlar

### 9.1 Yüklenmeyen ve gereksiz jar'lar

- **`1Legends-1.7.10-8.6.2.jar` (88,7 MB) yüklenmez.** Bir 1.7.10 modu
  (`mcmod.info`, `mods.toml` yok); Forge 1.20.1 onu mod saymaz. Yeni
  Legends zaten ayrı jar.
- **`fabric-api` (2,9 MB)** kimseye hizmet etmiyor.

### 9.2 Ballistix'in enerji ihtiyacı karşılanmıyor

Bölüm 7.1, son paragraf.

### 9.3 Aynı adı taşıyan ama birbirinin yerine geçmeyen metaller

Tarifler eşya **kimliği** istiyor (`"item": "palladium:vibranium_ingot"`).
Legends cevherleri ortak Forge etiketi (`forge:ingots/...`) taşımıyor. Bu
yüzden aynı adlı iki cevher dünyada **ayrı ayrı** çıkıyor ve birinin
külçesi ötekinin tarifinde çalışmıyor:

| ad | hangi modlarda |
|---|---|
| Vibranium Ore | Legends · Palladium |
| Uru Ore / Ingot | Legends · PowerBorne |
| Titanium Ore | Legends · Palladium · Craziness Awakened |
| Zinc Ore / Ingot | Legends · Create |
| Ruby / Ruby Ore | Legends · Craziness Awakened |
| Kryptonite Shard, Stormbreaker, Web-Shooters | Legends · PowerBorne |
| **Compound V** | Legends-Superheroes · compound_v |

İki **Compound V** tamamen ayrı eşya. Legends'inki tariflenebilen bir
malzeme (Enhanced Cells + Etherean Liquid + su şişesi + magma kremi +
parıltı tozu) ve Homelander kostüm sınıfı onu anıyor. compound_v modununki
rastgele güç veren iksir.

Toplam 67 ad iki ya da daha fazla modda geçiyor; çoğu zararsız (taş
sütun, kumaş, müzik plağı).

### 9.4 Tuş çakışmaları (varsayılan atamalar, sınıflardan ölçüldü)

| tuş | kaç mod | kimler |
|---|---|---|
| **G** | **6** | Legends Ability 5 · Alex's Caves özel yetenek · Aperture portal tut · Craziness binek 1 · Curios aç · Symbiote canlı zırh |
| **V** | **5** | Legends Ability 3 · Compound V gücü etkinleştir · Cataclysm çizme · Palladium Ability 1 (PowerBorne) · Symbiote aşı |
| **R** | 4 | Legends Ability 1 · Gravity Gun tool gun modu · Aperture sıfırla · Symbiote dokunaç çekme |
| **X** | 4 | Legends Ability 4 · Cataclysm yetenek · Palladium yetenek listesi · Symbiote halka menü |
| **B** | 3 | Palladium Ability 2 · Symbiote besle · Backpack envanteri |
| **C** | 3 | Legends Ability 2 · Cataclysm kask · Symbiote duvara tutun |
| **Z** | 3 | Legends Ultimate · Backpack alet değiştir · Symbiote dokunaç kamçısı |
| **H** | 3 | Legends Utility · Craziness binek 2 · Symbiote kabuk |
| **Y** | 2 | Legends Armor · Cataclysm göğüslük |
| **M** | 2 | Legends Extra Equipment · Palladium Ability 4 |
| **N** | 2 | Palladium Ability 3 · Symbiote kol duvarı |
| **O** | 2 | Legends Social · Symbiote kol ata |

Vanilla tuşlarıyla çakışanlar: **T** (sohbet) ↔ Symbiote suş gücü; **F**
(el değiştir) ↔ Gravity Gun mod seçimi; **/** (komut) ↔ Palladium
ekipman; **L** (başarımlar) ↔ Symbiote kol aç/kapa; **Boşluk** ve **W**
Craziness'ta binek kontrolü (büyük olasılıkla yalnız binekteyken).

Legends'in tam atamaları: Ability 1–5 = R C V X G, Ultimate = Z, Class =
Sol Alt, Utility = H, Armor = Y, Switch Mode = fare yan tuşu, Social = O,
Extra Equipment = M, Team Synergy = atanmamış, Mastery = `` ` ``.

Çakışan iki tuşun ikisi de aynı anda etkin bir durumdaysa (ör. Legends
kostümü giyiliyken Compound V gücü de varsa) tek basış ikisini birden
tetikler. Tuşlar oyunun Kontroller menüsünden değiştirilebilir.

### 9.5 Güç sistemleri birbirini tanımıyor

Aynı oyuncu Legends kostümü giyip Compound V içip simbiyotla bağ kurup
PowerBorne gücü alabilir. Her sistem kendi çubuğunu ve kendi tuşlarını
kullanıyor; aralarında denge yok. AttributeFix'in varlığı yüksek
değerlerin tavana takılmamasını sağlıyor. Cataclysm bossları ise hasar
tavanıyla bu birikimi kesiyor (bölüm 6.1).

## 10. Lisans ve izin

- Kayıt kuralı (`KAYNAKLAR.md`) geçerli: **sayıyı/fikri al, dosyayı
  alma.** Bu paketten hiçbir dosya depoya girmedi.
- İçerik modlarının çoğu **All Rights Reserved**. Açık lisanslı olanlar:
  Aperture Innovations ve Pandora's Box (MIT), Alex's Caves / Alex's Mobs
  (LGPL), Create (MIT), Dungeon Crawl (GPL-3.0), Hypertube (Apache-2.0).
  Lisans `mods.toml`'daki beyandan okundu; varlıkların (doku, ses) ayrı
  lisansı doğrulanmadı.
- **Legends çatısı açık bir yasak koyuyor:** `mods.toml` açıklaması
  *"Addon creation is not permissible during early access."* Legends
  içeriğini temel alan bir eklenti yapmak yapımcının kendi şartına aykırı
  olur. Ölçüm bundan etkilenmiyor; dosya ya da birebir taşıma için
  yapımcının izni gerekir.
- Marka katmanı ayrı: DC, Marvel, Amazon (The Boys), Hasbro (Power
  Rangers), anime lisans sahipleri, Valve (Portal), Sony (God of War),
  Capcom (Mega Man).

## 11. Depoda daha önce işlenmiş olanlar

| mod | durum |
|---|---|
| PowerBorne Heroes **0.5.1** | `REFERANS_POWERBORNE.md` ile aynı sürüm; bu belgede yalnız parşömen sistemi eklendi |
| Symbiote **1.1.3** | 1.1.2 referansıyla aynı yetenekler (bölüm 5.4) |
| Gravity Gun | `REFERANS_BORALO.md`: "zaten yaptık (`cekim_silahi`)" |
| GeckoLib 4.8.4 | bizim kurallarımız 5.5.5'ten (`REFERANS_GECKOLIB.md`); bu eski sürüm |

## 12. Kostümler nasıl yapılıyor ve malzemeler nereden geliyor

### 12.1 Legends — Nexus'ta, kodla tanımlı tarif

Legends kostümlerinin tarifi **JSON'da değil, Java kodunda**. Her kostüm
sınıfının bir `getRecipe(Player, boolean isTransmuting)` metodu var ve
gereken eşyaları adetleriyle bir liste olarak döndürüyor. Kostüm **Nexus**
ekranından yapılıyor: ekran `ServerPacketCraftSuit` paketini yolluyor,
sunucu `CraftingHelper.hasMaterials` ile envanteri kontrol edip eşyaları
düşüyor.

`isTransmuting` iki yol seçiyor:

| yol | ne değişiyor (örnek) |
|---|---|
| normal | karakterin **kendi** Etherean'ı: Superman → Kryptonian Etherean, Iron Man → Arc Reactor |
| transmute | **genel** Etherean ya da başka bir ikame: Superman → Etherean, Iron Man → Palladium Core, Kingpin → Diamond, Blue Beetle → 2 Iron Ingot |

Sayım: Superheroes'ta **70**, Anime'de **13**, Power Rangers'ta **6**,
Misc'te **1** tarif; toplam **90** (alt kostümlerin çoğunun kendi tarifi
var).

**Yapılamayan kostümler (ölçüldü):** Invincible, Nova, Omni-Man, Scorpion,
Super Steve ve Symbiote Spider-Man'in `getRecipe` metodu **boş liste**
döndürüyor. Nexus'ta yapılamıyorlar. Nasıl edinildikleri bytecode'dan
çıkmadı (yaratıcı mod ya da bir olay olabilir).

**Modun kendi hatası (ölçüldü):** Blue Beetle ve Silver Surfer, Shocker'ın
tarifini **birebir** kullanıyor (16 Yellow Fabric, 10 Brown Fabric, 4
Brown Stained Leather, 6 Reinforced Kevlar, 4 Electronics, 8
Anti-Vibrational Fabric, 2 Prototype Vibro Smashers). Üç sınıfın bytecode'u
aynı. Kopyala-yapıştır kalmış.

### 12.2 PowerBorne — Palladium terzi tezgâhı

PowerBorne'un 4 kostümü `palladium:item_tailoring` tarifiyle **Tailoring
Bench**'te yapılıyor. Tarif önce açılmalı (`requires_unlocking: true`) ve
tüketilmeyen bir **alet** istiyor (Captain America için Vibranium Shield):

| kostüm | malzeme |
|---|---|
| Captain America | 16 Light Blue Fabric, 8 Red Fabric, 6 White Fabric, 4 Leather, 4 Iron Ingot |
| Sentry | 16 Gold Ingot, 12 Yellow Fabric, 12 Blue Fabric |
| Spider-Man | 16 Red Fabric, 12 Blue Fabric, 4 Black Fabric, 4 White Fabric, 4 Cobweb, 1 Radioactive Silk |
| Superman | 16 Red Fabric, 16 Light Blue Fabric, 2 Yellow Fabric, 1 Sunstone Shard |

Legends'teki kumaşlar (`legendsmod:fabric_red`) ile Palladium'unkiler
(`palladium:red_fabric`) **farklı eşya**; biri ötekinin tarifinde geçmiyor
(bölüm 9.3).

### 12.3 Özel malzemelerin kaynağı

Kostüm zincirlerinin ham maddelerinden vanilla olmayanların hepsi arandı:
JSON tarifi, ganimet tablosu, dünya üretimi ve kod (köylü takası, olay).

| kaynak | malzemeler |
|---|---|
| **cevher** (madencilik) | Etherean (Etherean Ore), Red Diamond, Titanium, Platinum, Bauxite, Silver, Silicon, Sapphire, Palladium (Legends çekirdek); Vibranium, Uru, Nth Metal, Oanite, Lunar Crystal, Lightning Stone, Aquastone, X-Kryptonite, Gamma radyasyon bloğu (Superheroes); Morphin Grid Crystal, White Dino Gem, fosiller (Power Rangers) |
| **köylü takası** (Superheroes'un iki mesleği) | **Dwarven Smith:** Asgardian Steel Ingot (5 Steel Ingot + 1 iksir), **Asgardian Etherean (10 Asgardian Steel Ingot + 1 Etherean)**. **Archaeologist:** Ivory (9 kemik ya da 1 kemik bloğu), Ivory Axe, Ivory Boomerang, Scarab Dart, Ivory Wristband, Scarab Tracker |
| **gezgin tüccar** (Superheroes) | Grandmaster Formula (iksir + Etherean şişesi), Pneumatic Tube (24 zümrüt + 9 Gold-Titanium Alloy), Vibro Smashers parçası (9 High-Tech Electronics + 9 Lightning Stone Ingot), Obliterator Diamond (5 elmas + Photon Capacitor) |
| **köylü takası** (Anime) | White Cape (iksir + 14 White Fabric), Limit Breaker (4 Creatine + 1 Nether Star) |
| **yaratık ganimeti** | Chakra Essence ve Sharingan Eyeball (Ninja Guard, Kakashi Guard), Momoshiki Karma Data ve Otsutsuki Horn (Momoshiki bossu), Radioactive String (radyoaktif örümcek), Spartan Emblem Fragment (Undead Legionnaire, Greek Urn) |
| **özel blok / eşya** | Stable Saiyan Genome (Blood Analyzer), Kurama Chakra Essence (Summoning Scroll), Sacred Ankh (Khonshu), God of War Etherean (God of War adağı) |

Takaslardaki "iksir"in hangi iksir olduğu kodda NBT ile veriliyor;
bytecode okumasından çıkmadı.

## 13. En çok malzeme gerektiren kostüm ve eşya

**Yöntem.** Pakette yüklenen **3902 tarif** tek veritabanına toplandı
(Legends'in 90 kod tarifi dahil). `forge:mod_loaded` koşulları paketteki
mod listesine göre değerlendirildi; örneğin Ballistix'in "Electrodynamics
varsa" tarifleri sayılmadı. Her eşya, en ucuz tarifi seçilerek ham
maddeye kadar açıldı. Geri dönüşüm tarifleri (alet eritme, blok açma)
elendi. **Vanilla eşyalar açılmadı** (TNT 1 sayıldı). Takasla ya da
ganimetle gelen malzemeler ham sayıldı.

### 13.1 Cevap: Iron Man

| | doğrudan malzeme | ham maddeye açılınca |
|---|---|---|
| **Iron Man** (ve Mark 2) | 46 | **≈ 1355** |

Tarifi: 22 Gold-Titanium Alloy (Red) + 10 Gold-Titanium Alloy (Gold) + 8
Stark Tech + 2 Rocket + 1 JARVIS AI Chip + 2 Prototype Repulsor + 1 **Arc
Reactor**. Ham karşılığı: **351 titanyum cevheri, 324 altın parçası, 181
kızıltaş, 150 bakır külçe, 96 platin cevheri, 54 boksit cevheri, 48 demir
parçası…** Pahalılığın kaynağı Gold-Titanium Alloy (her biri titanyum
bloğuyla yapılıyor) ve tek başına ≈ 577 ham madde tutan Arc Reactor.

**Doğrudan en kalabalık tarif:** Kingpin ve Wolverine, **61**'er eşya.

### 13.2 Kostüm dışındaki en pahalı eşyalar (mod başına)

| mod | eşya | ham maddeye açılınca |
|---|---|---|
| Legends-Superheroes | Arc Reactor (Stealth) / Arc Reactor | ≈ 665 / ≈ 577 |
| Ballistix | Dark Matter Explosive · Large Antimatter · Antimatter · Nuclear | ≈ 501 · 493 · 489 · 481 (zincir: 4 Thermobaric + 4 kızıltaş + 1 netherite parçası → Nuclear; + 8 Nether Star → Antimatter; + 4 → Large; + 8 → Dark Matter. **Tek Dark Matter = 20 Nether Star = 20 Wither**) |
| Legends çekirdek | **The Nexus** | ≈ 171 |
| Legends-Anime | Capsule Corp Signal Scanner | ≈ 86 |
| Alex's Caves | Galena Gauntlet | ≈ 99 |
| Craziness Awakened | Ultimate Block · Fractal Block · Royal Guardian Bomb | 72 · 72 · 69 |
| PowerBorne | Genetic Chamber | ≈ 59 |
| Palladium | Vibranium Flux Capacitor | ≈ 30 |
| Create | Cardboard Chestplate | ≈ 32 |

### 13.3 Bütün kostümlerin toplamı

- 90 Legends kostümünün ham toplamı ≈ **16.466** eşya.
- Ham maddede en çok: **ip 3074**, titanyum cevheri 1414, kızıltaş 1380,
  altın parçası 1276, bakır külçe 1130, Asgardian Steel Ingot 528.
- Doğrudan en çok istenen: **Red Fabric 362** (41 kostümde), Asgardian
  Steel Ingot 352 (16 kostümde), Black Fabric 342, Blue Fabric
  318.

### 13.4 Bütün kostümler, pahalıdan ucuza

"Doğrudan" = Nexus'ta istenen eşya sayısı. "Ham" = ara malzemeler
açılınca.

| sıra | kostüm | paket | doğrudan malzeme | ham maddeye açılınca | tarif (Nexus / terzi tezgâhı) |
|---|---|---|---|---|---|
| 1 | Iron Man | Superheroes | 46 | 1355 | 22 Gold-Titanium Alloy (Red), 10 Gold-Titanium Alloy (Gold), 8 Stark Tech, 2 Rocket, 1 JARVIS AI Chip, 2 Prototype Repulsor, 1 Arc Reactor; transmute: 1 Palladium Core |
| 2 | Iron Man Mark 2 | Superheroes | 46 | 1355 | 22 Gold-Titanium Alloy (Gray), 10 Gold-Titanium Alloy (Light Gray), 8 Stark Tech, 2 Rocket, 1 JARVIS AI Chip, 2 Prototype Repulsor, 1 Arc Reactor; transmute: 1 Palladium Core |
| 3 | Iron Man Stealth | Superheroes | 45 | 840 | 22 Gold-Titanium Alloy (Blue), 10 Gold-Titanium Alloy (Gray), 8 Stark Tech, 1 Stealth Module, 1 JARVIS AI Chip, 2 Prototype Repulsor, 1 Arc Reactor Stealth; transmute: 1 Palladium Core |
| 4 | Iron Man Stealth Mark 3 | Superheroes | 45 | 840 | 22 Gold-Titanium Alloy (Blue), 10 Gold-Titanium Alloy (Light Blue), 8 Stark Tech, 1 Stealth Module, 1 JARVIS AI Chip, 2 Prototype Repulsor, 1 Arc Reactor Stealth; transmute: 1 Palladium Core |
| 5 | Batman Beyond | Superheroes | 39 | 678 | 14 Gold-Titanium Alloy (Black), 4 Gold-Titanium Alloy (Red), 4 Electronics, 12 Wayne Tech, 2 Augmented Vision Lenses, 1 Bat Belt, 2 Beyond Wing Module |
| 6 | Blue Beetle | Superheroes | 50 | 476 | 16 Yellow Fabric, 10 Brown Fabric, 4 Brown Stained Leather, 6 Reinforced Kevlar, 4 Electronics, 8 Anti-Vibrational Fabric, 2 Prototype Vibro Smashers; transmute: 2 Iron Ingot |
| 7 | Shocker | Superheroes | 50 | 476 | 16 Yellow Fabric, 10 Brown Fabric, 4 Brown Stained Leather, 6 Reinforced Kevlar, 4 Electronics, 8 Anti-Vibrational Fabric, 2 Prototype Vibro Smashers; transmute: 2 Iron Ingot |
| 8 | Silver Surfer | Superheroes | 50 | 476 | 16 Yellow Fabric, 10 Brown Fabric, 4 Brown Stained Leather, 6 Reinforced Kevlar, 4 Electronics, 8 Anti-Vibrational Fabric, 2 Prototype Vibro Smashers; transmute: 2 Iron Ingot |
| 9 | Daredevil | Superheroes | 55 | 348 | 24 Red Fabric, 12 Red Stained Leather, 8 Reinforced Kevlar, 6 Red Steel Ingot, 2 Stick, 2 Chain, 1 Radarborn Etherean; transmute: 1 Etherean |
| 10 | Kawaki TBV | Anime | 45 | 345 | 1 Chakra Etherean, 12 Kara Technology, 1 Isshiki Karma Data, 2 Otsutsuki Essence, 16 Black Fabric, 12 Cyan Fabric, 1 Black Headband |
| 11 | Kingpin | Superheroes | 61 | 326 | 24 White Fabric, 12 Purple Fabric, 6 Black Fabric, 8 White Stained Leather, 8 Reinforced Kevlar, 2 Black Steel Stick, 1 Obliterator Diamond; transmute: 1 Diamond |
| 12 | Black Widow | Superheroes | 37 | 284 | 16 Black Fabric, 6 Black Stained Leather, 4 Gold Plate, 4 Reinforced Kevlar, 4 Electronics, 2 Stick, 1 Stealth Module |
| 13 | Vulture | Superheroes | 50 | 282 | 16 Green Fabric, 12 Lime Fabric, 6 Green Stained Leather, 4 Lime Stained Leather, 6 Reinforced Kevlar, 4 High-Tech Electronics, 2 Prototype Vibro Smashers; transmute: 2 Electronics |
| 14 | Batman Dark Knight | Superheroes | 54 | 280 | 6 Black Fabric, 28 Black Stained Leather, 6 Black Steel Ingot, 3 Yellow Stained Leather, 1 Bat Belt, 10 Wayne Tech |
| 15 | Batman | Superheroes | 48 | 274 | 17 Black Fabric, 8 Black Stained Leather, 9 Light Gray Fabric, 3 Yellow Stained Leather, 1 Bat Belt, 10 Wayne Tech |
| 16 | Batman 1966 | Superheroes | 48 | 274 | 17 Blue Fabric, 8 Blue Stained Leather, 9 Light Gray Fabric, 3 Yellow Stained Leather, 1 Bat Belt, 10 Wayne Tech |
| 17 | Batman 1989 | Superheroes | 48 | 274 | 26 Black Fabric, 8 Black Stained Leather, 3 Yellow Stained Leather, 1 Bat Belt, 10 Wayne Tech |
| 18 | Batman 2022 | Superheroes | 48 | 272 | 1 Batarang, 6 Black Fabric, 10 Black Stained Leather, 20 Gray Stained Leather, 1 Bat Belt, 10 Wayne Tech |
| 19 | Prowler | Superheroes | 36 | 229 | 13 Purple Fabric, 11 Green Fabric, 3 Black Fabric, 6 High-Tech Electronics, 2 Jet Fuel, 1 Pneumatic Tube; transmute: 1 Glass Bottle |
| 20 | Reverse-Flash | Superheroes | 45 | 202 | 16 Yellow Fabric, 12 Red Fabric, 2 Black Fabric, 6 Yellow Stained Leather, 4 Red Stained Leather, 4 Red Lightning Block, 1 Negative Speed Force Etherean; transmute: 1 Etherean |
| 21 | Hawkeye | Superheroes | 50 | 200 | 16 Purple Fabric, 12 Magenta Fabric, 10 Black Fabric, 4 Purple Stained Leather, 6 High-Tech Electronics, 1 Carbon Steel Katana, 1 Incomplete Compound Bow |
| 22 | Wolverine | Superheroes | 61 | 176 | 18 Yellow Fabric, 12 Blue Fabric, 8 Black Fabric, 4 Yellow Stained Leather, 8 Unstable Molecule, 10 Adamantium Ingot, 1 Mutant Etherean; transmute: 1 Etherean |
| 23 | Kawaki | Anime | 33 | 176 | 1 Chakra Etherean, 4 Kara Technology, 1 Isshiki Karma Data, 1 Otsutsuki Essence, 16 Blue Fabric, 6 Green Fabric, 4 Gray Fabric |
| 24 | Flash | Superheroes | 47 | 162 | 16 Red Fabric, 14 Yellow Fabric, 2 White Fabric, 6 Red Stained Leather, 4 Yellow Stained Leather, 4 Lightning Block, 1 Speed Force Etherean; transmute: 1 Etherean |
| 25 | Aquaman | Superheroes | 55 | 162 | 16 Orange Fabric, 14 Green Fabric, 4 Orange Stained Leather, 6 Gold Ingot, 6 Nth Metal Ingot, 8 Atlantean Scale, 1 Atlantean Etherean |
| 26 | Green Goblin | Superheroes | 44 | 148 | 16 Green Fabric, 12 Purple Fabric, 6 Green Stained Leather, 4 Purple Stained Leather, 1 Pumpkin, 4 Glider Tech, 1 Goblin Serum; transmute: 1 Etherean |
| 27 | Wonder Woman | Superheroes | 43 | 139 | 14 Red Fabric, 10 Yellow Fabric, 8 Blue Fabric, 4 Gold Block, 4 White Fabric, 2 Amazonian Bracers, 1 Amazonian Etherean; transmute: 1 Etherean |
| 28 | Spider-Man 2099ANAD | Superheroes | 50 | 136 | 14 White Fabric, 8 Red Fabric, 12 Unstable Molecule, 8 Black Stained Leather, 1 Vial of Radioactive Spider DNA, 6 Electronics, 1 Web-Woven Etherean; transmute: 1 Etherean |
| 29 | Homelander | Superheroes | 48 | 132 | 14 Blue Fabric, 5 Gold Ingot, 10 Red Fabric, 8 Red Stained Leather, 6 White Fabric, 4 Carbon Nanotube, 1 Compound V; transmute: 1 Etherean |
| 30 | Robin Teen Titans | Superheroes | 41 | 124 | 16 Green Fabric, 8 Green Stained Leather, 2 Electronics, 8 Red Fabric, 6 Yellow Fabric, 1 Bat Belt |
| 31 | Robin Young Justice | Superheroes | 41 | 124 | 16 Green Fabric, 8 Green Stained Leather, 2 Electronics, 8 Red Fabric, 6 Yellow Fabric, 1 Bat Belt |
| 32 | Green Lantern | Superheroes | 42 | 122 | 14 Green Fabric, 12 Black Fabric, 4 White Fabric, 6 Green Stained Leather, 4 Black Stained Leather, 1 Willpower Ring, 1 Willpower Etherean; transmute: 1 Etherean |
| 33 | Captain America | Superheroes | 46 | 122 | 14 Blue Fabric, 10 Red Fabric, 8 White Fabric, 6 Blue Stained Leather, 6 Titanium Ingot, 1 Proto-Adamantium, 1 Super Soldier Etherean; transmute: 1 Etherean |
| 34 | Robin New 52 | Superheroes | 41 | 119 | 16 Green Fabric, 10 Green Stained Leather, 2 Electronics, 8 Red Fabric, 4 Steel Ingot, 1 Bat Belt |
| 35 | Robin DCAU | Superheroes | 37 | 118 | 10 Black Fabric, 10 Green Fabric, 2 Electronics, 8 Red Fabric, 6 Yellow Fabric, 1 Bat Belt |
| 36 | Robin | Superheroes | 37 | 116 | 12 Green Fabric, 8 Green Stained Leather, 2 Electronics, 8 Red Fabric, 6 Yellow Fabric, 1 Bat Belt |
| 37 | Boruto TBV | Anime | 45 | 114 | 1 Chakra Etherean, 1 Black Headband, 1 Momoshiki Karma Data, 2 Otsutsuki Essence, 20 Black Fabric, 12 Pink Fabric, 8 White Fabric |
| 38 | MMWhite Ranger | Power Rangers | 38 | 109 | 14 M.G. White Fabric, 8 M.G. Yellow Fabric, 6 M.G. Black Fabric, 8 Dragon Shield Material, 1 Tiger Power Coin, 1 Morphin Grid Etherean; transmute: 1 Etherean |
| 39 | MMGreen Ranger | Power Rangers | 37 | 108 | 14 M.G. Green Fabric, 10 M.G. White Fabric, 3 M.G. Black Fabric, 8 Dragon Shield Material, 1 Dragon Power Coin, 1 Morphin Grid Etherean; transmute: 1 Etherean |
| 40 | Naruto Shippuden | Anime | 51 | 108 | 1 Chakra Etherean, 1 Uzumaki Crest, 8 Kurama Chakra Residue, 1 Black Headband, 20 Orange Fabric, 14 Black Fabric, 6 Black Stained Leather |
| 41 | Arthur Leywin | Anime | 47 | 106 | 1 Sylvia Etherean, 1 White Mana Core, 16 Black Fabric, 10 Steel Ingot, 8 Red Fabric, 6 Gold Plate, 5 White Wool |
| 42 | Spider-Man | Superheroes | 37 | 105 | 3 Black Fabric, 9 Blue Fabric, 17 Red Fabric, 4 Red Stained Leather, 2 White Fabric, 1 Web-Shooters, 1 Web-Woven Etherean; transmute: 1 Etherean |
| 43 | DTWhite Ranger | Power Rangers | 46 | 104 | 16 M.G. White Fabric, 12 M.G. Black Fabric, 4 M.G. Red Fabric, 6 M.G. Yellow Fabric, 1 White Dino Gem, 6 Gold Ingot, 1 Morphin Grid Etherean; transmute: 1 Etherean |
| 44 | MMBlack Ranger | Power Rangers | 36 | 98 | 18 M.G. Black Fabric, 12 M.G. White Fabric, 4 Dragon Shield Material, 1 Mastodon Power Coin, 1 Morphin Grid Etherean |
| 45 | MMBlue Ranger | Power Rangers | 36 | 98 | 16 M.G. Blue Fabric, 12 M.G. White Fabric, 2 M.G. Black Fabric, 4 Dragon Shield Material, 1 Triceratops Power Coin, 1 Morphin Grid Etherean; transmute: 1 Etherean |
| 46 | MMRed Ranger | Power Rangers | 36 | 98 | 15 M.G. Red Fabric, 12 M.G. White Fabric, 3 M.G. Black Fabric, 4 Dragon Shield Material, 1 Tyrannosaurus Power Coin, 1 Morphin Grid Etherean; transmute: 1 Etherean |
| 47 | Boruto Ōtsutsuki | Anime | 35 | 96 | 1 Chakra Etherean, 1 Uzumaki Crest, 1 Momoshiki Karma Data, 1 Otsutsuki Essence, 1 Blue Headband, 18 Blue Fabric, 12 Red Fabric |
| 48 | Saitama | Anime | 44 | 94 | 1 Limit Breaker Etherean, 1 White Cape, 2 Red Glove, 16 Yellow Fabric, 14 Red Fabric, 6 White Fabric, 4 Red Stained Leather |
| 49 | Naruto | Anime | 41 | 93 | 1 Chakra Etherean, 1 Uzumaki Crest, 4 Kurama Chakra Residue, 1 Blue Headband, 16 Orange Fabric, 12 Blue Fabric, 6 Orange Stained Leather |
| 50 | Bullseye | Superheroes | 43 | 93 | 16 Black Fabric, 12 White Fabric, 8 Cyan Fabric, 4 Black Stained Leather, 1 Iron Throwing Knife, 1 Liquid Adamantium, 1 Target |
| 51 | Homelander Absolute | Superheroes | 47 | 92 | 14 Blue Fabric, 1 Etherean, 5 Gold Ingot, 10 Red Fabric, 8 Red Stained Leather, 2 Tadpole Damocles, 1 Tadpole, 6 White Fabric |
| 52 | Thor IWV2 | Superheroes | 53 | 91 | 20 Asgardian Steel Ingot, 17 Black Fabric, 6 Enchanted Armor Disc, 6 Red Fabric, 1 Stick, 2 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 53 | Hulk | Superheroes | 46 | 90 | 14 Purple Fabric, 8 White Fabric, 2 Black Stained Leather, 8 Gamma Radiation, 12 Gamma Dust, 1 Gamma Core, 1 Gamma Etherean; transmute: 1 Etherean |
| 54 | Speed Demon | Superheroes | 50 | 88 | 16 Blue Fabric, 10 Red Fabric, 4 Light Blue Fabric, 12 Gold Ingot, 1 Splash Potion, 6 Lightning Ingot, 1 Squadron Etherean; transmute: 1 Etherean |
| 55 | Kakashi Hatake | Anime | 38 | 88 | 1 Hatake Clan Crest, 1 Sharingan Eyeball, 1 Chakra Etherean, 1 Black Headband, 16 Green Fabric, 12 Black Fabric, 6 Green Stained Leather |
| 56 | Ryomen Sukuna | Anime | 46 | 86 | 1 Etherean, 1 Nether Star, 8 Ghast Tear, 4 Fermented Spider Eye, 16 White Fabric, 10 Black Fabric, 6 Red Fabric |
| 57 | Sasuke Shippuden | Anime | 35 | 85 | 1 Chakra Etherean, 1 Uchiha Crest, 2 Uchiha DNA, 1 Sharingan Eyeball, 14 Blue Fabric, 8 Black Fabric, 8 White Stained Leather |
| 58 | Moon Knight | Superheroes | 44 | 84 | 12 Gray Fabric, 4 Gray Stained Leather, 2 Ivory Wristband, 8 Silver Ingot, 16 White Fabric, 1 Lunar Etherean, 1 Sacred Ankh; transmute: 1 Etherean, 1 Ivory |
| 59 | Spider-Man Sam Raimi | Superheroes | 37 | 83 | 3 Black Fabric, 9 Blue Fabric, 17 Red Fabric, 4 Red Stained Leather, 1 Vial of Radioactive Spider DNA, 2 White Fabric, 1 Web-Woven Etherean; transmute: 1 Etherean |
| 60 | Superman CW | Superheroes | 45 | 81 | 15 Blue Fabric, 6 Gold Nugget, 7 Red Fabric, 7 Red Stained Leather, 1 Yellow Fabric, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 61 | Spider-Man 2099 | Superheroes | 43 | 80 | 14 Blue Fabric, 10 Red Fabric, 12 Unstable Molecule, 4 Blue Stained Leather, 1 Vial of Radioactive Spider DNA, 1 Splash Potion, 1 Web-Woven Etherean; transmute: 1 Etherean |
| 62 | Supergirl | Superheroes | 41 | 79 | 15 Blue Fabric, 1 Gold Ingot, 11 Red Fabric, 4 Red Stained Leather, 1 Yellow Fabric, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 63 | Superman | Superheroes | 41 | 79 | 15 Blue Fabric, 1 Gold Ingot, 11 Red Fabric, 4 Red Stained Leather, 1 Yellow Fabric, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 64 | Goku | Anime | 37 | 79 | 1 Saiyan Etherean, 1 Stable Saiyan Genome, 1 Martial Arts Mastery Emblem, 16 Orange Fabric, 12 Blue Fabric, 6 Orange Stained Leather |
| 65 | Superman Justice Lords | Superheroes | 42 | 79 | 15 Black Fabric, 4 Black Stained Leather, 3 Iron Nugget, 1 Red Fabric, 10 White Fabric, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 66 | Superman ZSJL | Superheroes | 40 | 77 | 21 Black Fabric, 4 Black Stained Leather, 5 Gray Fabric, 1 Iron Ingot, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 67 | Superman MAWS | Superheroes | 40 | 76 | 15 Blue Fabric, 1 Gold Ingot, 7 Red Fabric, 7 Red Stained Leather, 1 Yellow Fabric, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 68 | Thor IWV1 | Superheroes | 46 | 76 | 20 Asgardian Steel Ingot, 17 Black Fabric, 6 Enchanted Armor Disc, 1 Stick, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 69 | Sasuke Uchiha | Anime | 30 | 74 | 1 Chakra Etherean, 1 Uchiha Crest, 1 Uchiha DNA, 1 Blue Headband, 16 Blue Fabric, 6 White Stained Leather, 4 Blue Stained Leather |
| 70 | Thor Ragnarok V1 | Superheroes | 45 | 74 | 20 Asgardian Steel Ingot, 16 Black Fabric, 6 Enchanted Armor Disc, 1 Stick, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 71 | Thor Ragnarok V2 | Superheroes | 45 | 74 | 20 Asgardian Steel Ingot, 16 Black Fabric, 6 Enchanted Armor Disc, 1 Stick, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 72 | Superman MOS | Superheroes | 38 | 72 | 15 Blue Fabric, 1 Gold Ingot, 7 Red Fabric, 4 Red Stained Leather, 2 Yellow Fabric, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 73 | Superman BVS | Superheroes | 39 | 72 | 15 Blue Fabric, 3 Gold Ingot, 7 Red Fabric, 4 Red Stained Leather, 1 Yellow Fabric, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 74 | Thor LATV2 | Superheroes | 46 | 70 | 24 Asgardian Steel Ingot, 4 Enchanted Armor Disc, 6 Red Fabric, 1 Stick, 2 Uru Ingot, 8 White Fabric, 1 Asgardian Etherean; transmute: 1 Etherean |
| 75 | Thor LATV3 | Superheroes | 52 | 68 | 24 Asgardian Steel Ingot, 6 Enchanted Armor Disc, 12 Gold Ingot, 6 Red Fabric, 1 Stick, 2 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 76 | Moon Knight MCU | Superheroes | 44 | 66 | 14 Gray Fabric, 4 Black Stained Leather, 2 Ivory Wristband, 10 Gold Ingot, 12 Healing Fabric, 1 Lunar Etherean, 1 Sacred Ankh; transmute: 1 Etherean, 6 Ivory |
| 77 | Kratos | Misc | 32 | 66 | 1 God of War Etherean, 1 Spartan Emblem, 6 Red Fabric, 14 Brown Stained Leather, 4 Red Stained Leather, 4 Gold Ingot, 2 Chain |
| 78 | Thor Iconic | Superheroes | 46 | 62 | 24 Asgardian Steel Ingot, 7 Copper Ingot, 6 Enchanted Armor Disc, 6 Red Fabric, 1 Stick, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 79 | Joker | Superheroes | 29 | 62 | 4 Black Stained Leather, 8 Green Fabric, 1 Splash Potion, 1 Poppy, 15 Purple Fabric |
| 80 | Joker 1966 | Superheroes | 29 | 62 | 4 Black Stained Leather, 8 Green Fabric, 1 Splash Potion, 1 String, 15 Magenta Fabric |
| 81 | Thor Mangaverse | Superheroes | 45 | 62 | 24 Asgardian Steel Ingot, 6 Blue Fabric, 6 Enchanted Armor Disc, 6 Gold Ingot, 1 Stick, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 82 | Thor | Superheroes | 42 | 58 | 24 Asgardian Steel Ingot, 6 Enchanted Armor Disc, 3 Gold Ingot, 6 Red Fabric, 1 Stick, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 83 | Thor 2011 | Superheroes | 42 | 58 | 24 Asgardian Steel Ingot, 6 Enchanted Armor Disc, 6 Red Fabric, 1 Stick, 3 Titanium Ingot, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 84 | Thor Avengers | Superheroes | 42 | 58 | 24 Asgardian Steel Ingot, 6 Enchanted Armor Disc, 6 Red Fabric, 1 Stick, 3 Titanium Ingot, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 85 | Thor Dark World | Superheroes | 42 | 58 | 24 Asgardian Steel Ingot, 3 Copper Ingot, 6 Enchanted Armor Disc, 6 Red Fabric, 1 Stick, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 86 | Thor Party Prince | Superheroes | 40 | 56 | 20 Asgardian Steel Ingot, 6 Enchanted Armor Disc, 5 Gold Ingot, 6 Red Fabric, 1 Stick, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 87 | Thor Avengers V2 | Superheroes | 38 | 54 | 20 Asgardian Steel Ingot, 6 Enchanted Armor Disc, 6 Red Fabric, 1 Stick, 3 Titanium Ingot, 1 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 88 | Thor LATV1 | Superheroes | 38 | 54 | 20 Asgardian Steel Ingot, 7 Blue Fabric, 1 Gold Ingot, 6 Red Fabric, 1 Stick, 2 Uru Ingot, 1 Asgardian Etherean; transmute: 1 Etherean |
| 89 | Superman Anti Kryptonite | Superheroes | 50 | 52 | 11 Lapis Lazuli, 1 Light Blue Stained Glass Pane, 1 Red Fabric, 1 Redstone, 27 Titanium Ingot, 8 Red Diamond, 1 Kryptonian Etherean; transmute: 1 Etherean |
| 90 | Thor IH | Superheroes | 36 | 50 | 20 Asgardian Steel Ingot, 6 Enchanted Armor Disc, 3 Gold Ingot, 1 Stick, 1 Uru Ingot, 4 White Fabric, 1 Asgardian Etherean; transmute: 1 Etherean |
| 91 | Sentry Suit | PowerBorne | 40 | 37 | 16 Gold Ingot, 12 Yellow Fabric, 12 Blue Fabric |
| 92 | Spider-Man Suit | PowerBorne | 41 | 36 | 16 Red Fabric, 12 Blue Fabric, 4 Black Fabric, 4 White Fabric, 4 Cobweb, 1 Radioactive Silk |
| 93 | Captain America Suit | PowerBorne | 38 | 34 | 16 Light Blue Fabric, 8 Red Fabric, 6 White Fabric, 4 Leather, 4 Iron Ingot |
| 94 | Superman Suit | PowerBorne | 35 | 31 | 16 Red Fabric, 16 Light Blue Fabric, 2 Yellow Fabric, 1 Sunstone Shard |

## 14. Aletler, silahlar ve zırhlar

### 14.1 Craziness Awakened — 9 tam alet seti

Her sette kılıç, kazma, balta, kürek ve çapa var. Değerler `Tier`
sınıflarından okundu: dayanıklılık, kazma hızı, kılıcın hasar bonusu,
kazma seviyesi, büyü değeri.

| set | dayanıklılık | kazma hızı | kılıç hasar+ | kazma seviyesi | büyü |
|---|---|---|---|---|---|
| Crystal Wood | 89 | 3 | +2 | 1 (taş) | 2 |
| Kyanite | 156 | 5 | +5 | 2 (demir) | 2 |
| Pink Tourmaline | 235 | 7 | +7 | 3 (elmas) | 2 |
| Tiger's Eye | 300 | 9 | +8 | 3 | 2 |
| Emerald | 660 | 8 | +6 | 3 | 10 |
| Amethyst | 1164 | 8 | +11 | 4 (netherite) | 42 |
| Ruby | 2031 | 10 | +16 | 4 | 55 |
| Ultimate | 2380 | 15 | +36 | 4 | 22 |
| **Fractal** | **3380** | **19** | **+61** | 4 | 26 |
| *karşılaştırma: vanilla elmas* | *1561* | *8* | *+3* | *3* | *10* |
| *karşılaştırma: vanilla netherite* | *2031* | *9* | *+4* | *4* | *15* |

**Tek silahlar (hasar bonusu):** Royal Guardian Sword **+746**
(dayanıklılık 5000), Queen Scale Battle Axe **+662** (10.000), Big Bertha
+496 (8000), Slice +496, Robo Chainsaw +118, Dino Reaper +66, Chainsaw +58,
End Reaper +46, Ultimate Battle Axe +46, Nightmare Sword +44, Nether
Reaper +31, Prismatic Reaper +25. Ayrıca Fairy, Rat, Poison, Experience,
Crystal Error kılıçları, Rosesword, Worm Dagger, Mantis Claw, Big Hammer
ve dayanıklılığı **1** olan şaka eşyası "Get Trolled".

"Hasar+" kademenin bonusu; eşya kendi taban hasarını da ekliyor (o değer
yapıcıda veriliyor, ölçülmedi). Bu silahlar Cataclysm bosslarında
vuruş tavanına (20–25) takılır (bölüm 6.1).

**17 zırh malzemesi:** Queen Scale, Royal Guardian, Mobzilla, Ultimate,
Fractal, Ruby, Amethyst, Emerald, Tiger's Eye, Pink Tourmaline,
Experience, Lapis, Mothra Scale, Peacock Feathers, Lava Eel, Rhyno, Jumpy.

### 14.2 Diğer modlar

| mod | aletler / silahlar | zırhlar |
|---|---|---|
| **Legends çekirdek** | **Red Diamond** tam set (kılıç, kazma, balta, kürek, çapa); **9 çeşit atma bıçağı** (tahta, taş, gümüş, demir, titanyum, altın, elmas, red diamond, netherite); Rune Hammer | Red Diamond, Titanium |
| **Legends-Superheroes** | **Willpower** (Green Lantern iradesi) kazma, balta, kürek, çapa, olta, makas, çakmak; Mjolnir, Mjolnir (MCU), Stormbreaker, Surfer Sword, Amazon Sword ve Shield, Captain America's Shield, Goblin Trident, Hawkeye's Bow ve Katana, Bullseye's Knife ve Sai, Ivory Axe, batarang ve birdarang çeşitleri, Desert Eagle, Joker's Revolver | kostümler (bölüm 13.4) |
| **Legends-Power Rangers** | Power Sword, Power Axe (blaster), Power Lance, Blade Blaster, Dragon Dagger, Saba, Drago Sword | kostümler |
| **Cataclysm** | **Black Steel** tam set; Coral Spear, Coral Bardiche, Ancient Spear, Khopesh; boss silahları (Gauntlet of Guard / Bulwark / Maelstrom, Incinerator, Soul Render, Ceraunus, Astrape, Infernal / Void Forge, Meat Shredder, Tidal Claws) | Sturdy, Bone Reptile, Ignitium, Ignitium Elytra, Cursium |
| **Alex's Caves** | Limestone, Extinction ve Frostmint Spear; Desolate Dagger; Galena Gauntlet | Primordial, Hazmat (radyasyon), Diving, Rainbounce, Gingerbread |
| **Alex's Mobs** | Skelewag Sword, Ghostly Pickaxe | Roadrunner, Crocodile, Centipede, Emu, Froststalker, Straddle, Rocky, Flying Fish |
| **Lucky Block** | Lucky Sword, Lucky Bow | — |
| **Create** | — | Copper ve Netherite Diving, Cardboard |
| **Palladium** | — | Vibranium Weave |
| **Aperture** | Portal Gun | Long Fall Boots |

Legends ve Cataclysm alet kademeleri bu yöntemle çıkmadı. `Tier`
uygulayan ayrı bir sınıfları yok; büyük olasılıkla vanilla kademeleri
kullanıyorlar (ölçülmedi).

## 15. Bloklar ne yapıyor

Pakette toplam **11.764 blok** var. Bunun 9.385'i (yüzde 80) iki dekor
modundan geliyor: Chipped 6967, Rechiseled 2418. Üstüne Secret Doors'un 158
gizli kapısı geliyor.

### 15.1 Cevher seli — ≈ 71 farklı cevher bloğu

| mod | cevherler |
|---|---|
| Legends çekirdek (31) | Bauxite, Bronze, Cassiterite, **Etherean**, Magnesite, Platinum, **Red Diamond**, Ruby, Sapphire, Silicon, Silver, Sphalerite, Titanium, Tungsten, Zinc (+ derin kayrak hâlleri), Palladium |
| Legends-Superheroes (11) | Vibranium, Uru, Nth Metal, Oanite, Lunar, Lightning Stone, Kryptonite, X-Kryptonite (+ derin kayrak) |
| Palladium (10) | Lead, Titanium, Vibranium, Redstone Flux Crystal jeodu ve tomurcukları |
| Craziness Awakened (7) | Ademantite, Amethyst Gem, Mythril, Ruby, Salt, Titanium, Uranium |
| Alex's Caves (5), Power Rangers (3), PowerBorne (2), Create (2) | Alex's Caves cevherleri, Morphin Grid Crystal, White Dino Gem, Kryptonite Cluster, Uru, Zinc |

Aynı adlı cevherlerin birbirinin yerine geçmediği bölüm 9.3'te.

### 15.2 İşlevli bloklar (arkasında BlockEntity sınıfı olanlar)

| mod | bloklar ve ne yaptıkları |
|---|---|
| **Legends çekirdek** | **The Nexus** (üs, kostüm yapımı, görev, kalkan) · **Rune Forge** (rune dövme mini oyunu; 6 rune: Forcefield, Healing, Indestructible, Mission Uplink, Saturation, Security. Adları ve `NexusRune` sınıfı Nexus'a takıldıklarını gösteriyor) · **Microscope** (özel tarifler) · **Turret / Mission Turret** · **Ultramorphic Replicator** (kendi tarif türü ve JEI kategorisi olan tezgâh) · **Suit Display Case**, Holographic Display, Steve / Alex / kask standları |
| **Legends-Superheroes** | **Molecular Rearranger** (Adamantium gibi malzemeler) · **Stark Workbench** · Willpower Battery · Oil Slick · Block of Gamma Radiation |
| **Legends-Anime / PR / Misc** | Paper Bomb, Weight · Microscope · Greek Urn (`ancient_urn` ganimet tablosu Spartan Emblem Fragment düşürüyor) |
| **Palladium / PowerBorne** | **Tailoring Bench** (PowerBorne kostümleri) · Multiversal Iterator · Heart-Shaped Herb · **Genetic Chamber** |
| **Ballistix** | 30'dan fazla patlayıcı blok, mayın, silo parçaları, radarlar, taretler, siren (bölüm 7.1) |
| **Cataclysm** | **4 sunak** (Altar of Abyss / Amethyst / Fire / Void), **Boss Respawner**, Cursed Tombstone, Abyssal Egg; çok sayıda dekor taşı ve duvar resmi |
| **Alex's Caves** (21) | Nuclear Furnace, Nuclear Siren, Magnetic Quarry, Azure ve Scarlet Magnet, Tesla Bulb, Hologram Projector, Conversion Crucible, Enigmatic Engine, Abyssal Altar, Amber Monolith, Geothermal Vent, Volcanic Core, Confection Oven, Gobthumper |
| **Alex's Mobs** (11) | Transmutation Table, Void Worm Beak, Capsid, Leafcutter Anthill, Terrapin Egg, Sculk Boomer, End Pirate kapısı, bayrağı ve dümeni |
| **Craziness Awakened** | karınca yuvaları (Red, Rainbow, Unstable, Termite…; tahmin: OreSpawn'daki gibi her biri kendi karıncasını doğuruyor), Duplication Tree, Science Table, Robo blokları, Dungeon Spawner, Display Block, Liquid Pipe |
| **Supplementaries** (39) | Jar, Cage, Cannon, Bellows, Faucet, Pulley, Turn Table, Spring Launcher, Speaker, Notice Board, Blackboard, Globe, Wind Vane, Safe, Sack, Pedestal, Item Shelf, Flag, Present… |
| **Cuffed** | Cell Door, Bunk, Guillotine, Pillory, Safe, Tray, güçlendirilmiş taş ve parmaklık |
| **Create** (190) | makineler, taşıma bantları, borular, motorlar |
| **Aperture** | Antline (sinyal hattı, sayaç, onay), Large Button, Pedestal Button, test odası yüzeyleri |
| **Tek blokluk modlar** | Lucky Block, Pandora's Box, Hypertube (4 parça), Traveler's Backpack (yere konabiliyor) |

Sınıflandırma bir sezgisel kurala dayanıyor: blok adı bir BlockEntity
sınıfıyla eşleşiyorsa işlevli sayıldı. Yanlış eşleşmeler ayıklandı;
sayılar yaklaşık.

## 16. Açık sorular — kullanıcının kararı

Bu belge yalnız ölçüm. Neyin eklentiye taşınacağı yazılmadı:

1. Bu Java paketi ne için duruyor: kendi oyunun ve video çekimi mi, yoksa
   Bedrock eklentisine (Şimşek TNT) fikir kaynağı mı?
2. Ballistix tarzı bir patlayıcı ailesi (blok + el bombası + füze)
   Şimşek TNT'ye eklensin mi? Eklenecekse hangileri?
3. Compound V'nin güçlerinden ya da "rastgele güç + kötü sonuç" yapısından
   bir şey alınsın mı?
4. Java oyunu için: `1Legends-1.7.10` jar'ını çıkarmak, Ballistix'e bir
   enerji modu eklemek ve tuş çakışmalarını düzeltmek ister misin?
