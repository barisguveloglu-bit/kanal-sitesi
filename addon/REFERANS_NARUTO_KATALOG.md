# NarutoMod 0.3.1-beta — Tam İçerik Kataloğu

**Kaynak:** açılmış JAR — `scratchpad/naruto/`
**Mod:** `narutomod` 0.3.1-beta · Minecraft 1.12.2 · Forge · MCreator ile üretilmiş
**Yazar:** AHZNB (YouTube: `youtube.com/c/AHZNB`) · Discord: Naruto Republic
**LİSANS: Mod içinde lisans dosyası YOK. Tüm hakları saklı. Hiçbir varlık, doku,
model veya kod kopyalanamaz. Bu belge yalnızca envanterdir.**

---

## 0. Ölçüm notu — sınıf sayıları

Görev tanımındaki sayılar `.class` **dosya** sayılarıdır; MCreator her özelliği
iç sınıflara (`$Base`, `$EntityCustom`, `$Jutsu`, `$Renderer`, `$1`) böldüğü için
bunlar özellik sayısı değildir. Aşağıda ikisi de verilmiştir.

| Paket | `.class` dosyası | Üst düzey sınıf (`$` içermeyen) |
|---|---|---|
| `net/narutomod/entity/` | 932 | **149** |
| `net/narutomod/item/` | 744 | **196** |
| `net/narutomod/procedure/` | 212 | **97** |
| `net/narutomod/gui/` (overlay hariç) | 169 | **52** |
| `net/narutomod/gui/overlay/` | 10 | **2** |
| `net/narutomod/block/` | 23 | **7** |
| `net/narutomod/potion/` | 23 | **10** |
| `net/narutomod/keybind/` | 15 | **5** |
| `net/narutomod/event/` | 11 | 9 |
| `net/narutomod/world/` | 6 | 1 |
| `net/narutomod/command/` | 8 | 3 |
| `net/narutomod/creativetab/` | 2 | 1 |
| kök (`net/narutomod/*.class`) | — | 15 |

Varlık dosyaları: `en_us.lang` **771 satır**, 130 `.ogg` ses, 22 `.nbt` yapı,
55 tarif (`recipes/`), 22 başarım (`advancements/`), 1 ganimet tablosu.

`en_us.lang` anahtar dağılımı: `item` 282 · `entity` 178 · `subtitles` 93 ·
`tooltip` 65 · `advancements` 44 · `chattext` 40 · `tipped_arrow`/`potion`/
`splash_potion`/`lingering_potion`/`effect` 10'ar · `tile` 6 · `key` 5 ·
`death` 4.

---

## 1. KARAKTERLER / NPC'ler

### 1a. Adlandırılmış insan karakterler — varlık olarak modda (18)

| # | Sınıf | Oyun içi ad |
|---|---|---|
| 1 | `EntityGaara` | Gaara |
| 2 | `EntityDeidara` | Deidara |
| 3 | `EntityHaku` | Haku |
| 4 | `EntityHidan` | Hidan |
| 5 | `EntityItachi` | Itachi Uchiha |
| 6 | `EntityKakashi` | Kakashi |
| 7 | `EntityKakuzu` | Kakuzu |
| 8 | `EntityKankuro` | Kankuro |
| 9 | `EntityKisameHoshigaki` | Kisame Hoshigaki |
| 10 | `EntityKurotsuchi` | Kurotsuchi |
| 11 | `EntityMightGuy` | Might Guy |
| 12 | `EntitySakuraHaruno` | Sakura Haruno |
| 13 | `EntitySasori` | Sasori of the Red Sand |
| 14 | `EntityTemari` | Temari |
| 15 | `EntityTenten` | Tenten |
| 16 | `EntityZabuzaMomochi` | Zabuza Momochi |
| 17 | `EntityIrukaSensei` | Iruka Sensei |
| 18 | `EntityWhiteZetsu` | White Zetsu |

`ModConfig` içinde yedi tanesi için ayrı doğma ağırlığı var:
`SPAWN_WEIGHT_ITACHI`, `_KISAME`, `_DEIDARA`, `_SASORI`, `_HIDAN`, `_ZABUZA`,
`_WHITEZETSU`. Ayrıca `ITACHI_REAL_CHANCE` (karşılaştığın Itachi'nin "gerçek"
olma ihtimali) ve `AGGRESSIVE_BOSSES` ayarları mevcut.

Might Guy'ın kendi diyalog zinciri var (`chattext.mightguy.arrival`,
`.interact1`–`.interact4`) — köylüleri koruma görevi verip ödül olarak
Sekiz Kapı'yı öğretiyor (`advancements.openedgates`).

### 1b. Adlandırılmış çağırma hayvanları (6)

| Sınıf | Ad |
|---|---|
| `EntityGamabunta` | Gamabunta |
| `EntityManda` | Manda |
| `EntitySlug` | Katsuyu |
| `EntityEnma` | Monkey King: Enma |
| `EntityToadFukasaku` | Fukasaku |
| `EntityToadShima` | Shima |

Jenerik çağırmalar: `EntityToad` (Toad), `EntitySnake` (Snake),
`EntityGiantDog2h` (Giant Dog), `EntityCrow` (Crow), `EntityKikaichu`
(Kikaichu böcekleri), `EntitySnake8Heads` (8-branch Jutsu),
`EntitySummonAnimal` (taban sınıf). `ItemSummoningContract` içinde
`EntityGenericToad` ve `EntityGenericSnake` alt sınıfları var.

### 1c. Kuklalar (6)

`EntityPuppet` (taban), `EntityPuppetHiruko` (Hiruko),
`EntityPuppetKarasu` (Karasu), `EntityPuppetSanshouo` (Sanshouo),
`EntityPuppet3rdKazekage` (3. Kazekage), `EntityPuppetHundred`
(Sasori'nin Yüz Kukla ordusu). Her birinin parşömen eşyası var
(`ItemScrollHiruko`, `ItemScrollKarasu`, `ItemScrollSanshouo`,
`ItemScroll3rdKazekage`, `ItemScrollPuppet`).

### 1d. Jenerik NPC'ler (8)

`EntityNinjaMob` (taban), `EntityNinjaKonoha`, `EntityNinjaSuna`,
`EntityNinjaIwa`, `EntityNinjaKiri`, `EntityNinjaKumo`, `EntityAnbu`,
`EntityNinjaMerchant` (`TradeLevel` iç sınıfı ile ticaret kademeleri).

### 1e. Yalnız kıyafet/eşya olarak geçen, varlığı OLMAYAN karakterler

Bunlar mod içinde **NPC değil** — sadece zırh, silah veya doku olarak var:
Naruto (`ninja_armor_naruto_s*`), Sasuke (`mangekyosharingan_sasuke.png`,
Chokuto, Kusanagi), Obito (`mask_obito_1`, `mask_obito_war`,
`ninja_armor_obito_war`, `mangekyosharingan_obito`), Madara
(`ItemScytheMadara`, `madara_jinchuriki.png`, `ItemGunbai`),
Jiraiya (`ItemRobeJiraiya`, `ItemNinjaArmorJiraiya`), Orochimaru
(`kusanagi_oroch.png`), Hiruzen (`hiruzen_1.png`), Yagura
(`ItemYaguraStaff`), Hashirama (`buddha_1000` = Shinsu Senju).

**TOPLAM adlandırılmış varlık: 30** (18 insan + 6 çağırma + 6 kukla).
Jenerik NPC dahil **38**.

---

## 2. KUYRUKLU CANAVARLAR (Bijuu)

**Dokuzunun tamamı + On Kuyruklu mevcut.**

| Kuyruk | Sınıf | Ad |
|---|---|---|
| 1 | `EntityOneTail` | Shukaku |
| 2 | `EntityTwoTails` | Matatabi |
| 3 | `EntityThreeTails` | Isobu |
| 4 | `EntityFourTails` | Son Goku |
| 5 | `EntityFiveTails` | Kokuo |
| 6 | `EntitySixTails` | Saiken |
| 7 | `EntitySevenTails` | Chomei |
| 8 | `EntityEightTails` | Gyuuki |
| 9 | `EntityNineTails` | Kurama |
| 10 | `EntityTenTails` | Ten Tails |
| — | `EntityTenTails$EntitySplit` | Ten Tails Clone |
| — | `EntityGedoStatue` | Demonic Statue of the Outer Path (Gedo Mazo) |

Taban sınıf `EntityTailedBeast$Base`; ortak saldırı
`EntityTailedBeast$EntityTailBeastBall` (Bijudama).

### Jinchuriki mekaniği — VAR, tam kurulu

`EntityBijuManager` sınıfı jinchuriki sistemini yönetiyor. Bulunan üye ve
metotlar: `jinchurikiPlayer`, `jinchurikiLastActiveTime`, `isJinchuriki()`,
`isJinchurikiOf(player, class)`, `getJinchurikiPlayer()`,
`getBijuOfPlayerInWorld()`, `availableBijus()`, `isSealed()`,
`getRandomAvailableBiju()`, `getTails()`, `anyBijuAddedToWorld()`,
`mapByTailnum` (kuyruk sayısına göre kayıt).

Destek parçaları:
- `SpawnTailedBeasts` — dünyada doğma: `SPAWN_MAX_RADIUS`, `SPAWN_MIN_RADIUS`,
  `REQUIRED_DISTANCE`, `TIME_FOR_RESPAWN`, `resetSpawnPos()`.
- `EntityJinchurikiClone` → "Tailed Beast Cloak" (manto/pelerin formu).
- `ItemBijuCloak` (helmet/body/legs) — seviye ilerlemesi tooltip'te yazılı:
  seviye 1 ustalık 400 JXP, seviye 2'ye 3600 JXP; seviye 2 ustalık 800 JXP,
  Biju moduna 4800 JXP.
- `ItemBijuMap` / `item.tailed_beast_map` — "Tailed Beast Map", bijuu bulucu.
- Sohbet metinleri: `chattext.biju.playerisjinchuriki` ("%s is %s's jinchuriki"),
  `chattext.bijumanager.tooweak`, `chattext.tentails.sealedintoplayer`,
  `chattext.outerpath.hasjinchuriki`, `overlay.no_biju_available`.
- Ayarlar: `ModConfig.SPAWN_AS_JINCHURIKI`, `ModConfig.SPAWN_TAILED_BEASTS`.
- Dokular: `bijucloak_kurama.png`, `bijucloak_kcm2.png`, `bijucloak_sand.png`,
  `bijucloakl1/l2.png`, `ninetailskcm.png`, `onetail`…`ninetails.png`,
  `tentails.png`, `tentailsl1.png`, `tentails_minion.png`.
- Sesler: `shukaku_roar`, `matatabi_roar1/2`, `isobu_roar`, `isobu_hurt`,
  `fourtails_idle1/2`, `fourtails_hurt`, `fourtails_defeat`, `chomei_flying`,
  `gyuki_roar`, `gyuki_snort`, `kyuubi_howl`, `kyuubi_death`, `1tails_roar`.

---

## 3. DOUJUTSU

| Eşya sınıfı | Oyun içi ad | İç sınıf sayısı | Not |
|---|---|---|---|
| `ItemSharingan` | Sharingan | 3 | `isBlinded`, `sharingan_blinded`; %60 kaçınma şansı |
| `ItemMangekyoSharingan` | Mangekyo Sharingan — Amaterasu | — | Amaterasu + söndürme |
| `ItemMangekyoSharinganObito` | Mangekyo Sharingan — Kamui | — | Dokunulmazlık + ışınlanma |
| `ItemMangekyoSharinganEternal` | Eternal Mangekyo Sharingan | — | |
| `ItemRinnegan` | Rinnegan | 4 | 6 Yol, aşağıda |
| `ItemByakugan` | Byakugan | 1 | Yakınlaştırma, 8-Trigram Vacuum Palm, 64 Palms |
| `ItemTenseigan` | Tenseigan | 4 | Byakugan'ın evrimi; `tooltip.byakugan.tenseigantime` geri sayımı |
| `ItemTenseiganChakraMode` | Tenseigan Chakra Mode | — | |
| `ItemKekkeiMora` | Kekkei Mora (Rinne Sharingan) | 10 | Expansive Truth Seeking Ball |
| `ItemByakuRinnesharingan` | Fake Rinne Sharingan | — | Yomotsu Hirasaka, chakra darbesi |
| `ItemDojutsu` | Dojutsu (taban sınıf) | — | `hasAnyDojutsu`, `wearingAnyDojutsu`, `getMostRecentWornTime` |

Hepsi **kask (HEAD) yuvasına** takılan eşya olarak modellenmiş.

### Tanımlı kademeler (başarım zinciriyle doğrulandı)

1. Sharingan (`sharinganopened`)
2. Mangekyo Sharingan (`mangekyosharinganopened`) — güçlü duygusal tepkiyle açılır
3. Eternal Mangekyo Sharingan (`eternalmangekyoachieved`)
4. Rinnegan (`rinneganawakened`)
5. Rinne Sharingan (`rinnesharinganactivated`) — kekkei mora
6. Byakugan (`byakuganopened`)
7. Tenseigan (`tenseigan_achieved`)
8. Rinne Sharingan/Byakugan kolu (`tensei_byakugan_activated`)

### Rinnegan — Altı Yol (`chattext.rinnegan.path0`–`path5`)

Deva Path (Shinra Tensei / Bansho Tenin / Chibaku Tensei / Tengai Shinsei) ·
Asura Path (`ItemAsuraPathArmor`, `ItemAsuraCanon`) · Animal Path (çağırma) ·
Preta Path (`EntityPretaShield`, emme kalkanı) · Naraka Path
(`EntityKingOfHell`) · Outer Path (Gedo Mazo, NXP 8100 gerekli).

Ayrıca: `EntityLimboClone` (Limbo klonu), `EntityChibakuTenseiBall`,
`OverlayByakuganView` (Byakugan görüşü HUD), `ProcedureYomotsuHirasaka`,
`ProcedureKamuiJikukanIdo`, `ProcedureKamuiTeleportEntity`,
`WorldKamuiDimension` (Kamui boyutu), `ItemKamuiShuriken`,
`item.kamuidimension` (Kamui Dimension Portal Igniter).

Susanoo: `EntitySusanooBase`, `EntitySusanooSkeleton`, `EntitySusanooClothed`,
`EntitySusanooWinged` + `ItemTotsukaSword`, `ItemKagutsuchiSwordRanged`,
`ItemYaguraStaff`, `yasaka_magatama.png`.

`ModConfig.REMOVE_CHEAT_DOJUTSUS` ayarı ve
`chattext.sharingan.notyours` ("bu senin sharingan'ın değil") ile
çalınmış göz kullanımı engelleniyor.

---

## 4. KEKKEI GENKAI / DOĞA DÖNÜŞÜMLERİ

### 4a. Beş temel doğa (5)

| Eşya | Ad | İç sınıf |
|---|---|---|
| `ItemKaton` | Fire Release | 5 |
| `ItemSuiton` | Water Release | 3 |
| `ItemRaiton` | Lightning Release | 3 |
| `ItemFuton` | Wind Release | 5 |
| `ItemDoton` | Earth Release | 5 |

### 4b. Kekkei genkai birleşimleri (8) — hepsinin başarımı var

| Eşya | Ad | Birleşim (tooltip'ten) | İç sınıf |
|---|---|---|---|
| `ItemMokuton` | Wood Release | Toprak + Su | 6 |
| `ItemHyoton` | Ice Release | Su + Rüzgar | 6 |
| `ItemYooton` | Lava Release | Toprak + Ateş | 6 |
| `ItemFutton` | Boil Release | Su + Ateş | 4 |
| `ItemRanton` | Storm Release | Şimşek + Su | 3 |
| `ItemShakuton` | Scorch Release | Ateş + Rüzgar | 7 |
| `ItemJiton` | Magnet Release | Rüzgar + Toprak | 9 |
| `ItemBakuton` | Explosion Release | Toprak + Şimşek | 6 |

### 4c. Kekkei tota (1)

`ItemJinton` — Dust Release. Toprak + Rüzgar + Ateş **ve 4900 NXP**.
12 iç sınıf (modun en karmaşık doğası). Başarım: `kekkei_tota_awakened`.
Varlıkları: `entity.jintonbeam`, `entity.jintoncube`.

### 4d. Yin / Yang ve ileri seviye (7)

| Eşya | Ad | İç sınıf |
|---|---|---|
| `ItemInton` | Yin Release | 2 |
| `ItemYoton` | Yang Release | 6 |
| `ItemSenjutsu` | Senjutsu (Sage Mode) | 9 |
| `ItemSixPathSenjutsu` | Six Path Senjutsu | 4 |
| `ItemKekkeiMora` | Kekkei Mora | 10 |
| `ItemShikotsumyaku` | Skeletal Control | 8 |
| `ItemEightGates` | Eight Gates Release | 15 |

`ItemShikotsumyaku` (Kaguya klanı kemik kontrolü) dansları: Camellia Dance,
Clematis Dance: Flower, Larch Dance, Willow Dance. Başarımı var.

`ItemEightGates` — sekiz kapının **hepsi** adlandırılmış
(`chattext.eightgates.gate1`–`gate8`): Opening · Healing · Life · Pain ·
Limit · View · Shock · Death. Guy tekniği varlıkları: Asakujaku (Morning
Peacock), Hirudora (Daytime Tiger), Sekizo (Evening Elephant),
Yagai (Night Guy), 80 Gods Vacuum Fists.

`ItemSenjutsu` — Sage Mode tipleri var (`tooltip.senjutsu.type`: kurbağa /
yılan / sümüklüböcek; `sagetoadhelmet.png`, `sagesnakehelmet.png`,
`sageslughelmet.png`). `chattext.senjutsu.denied` = "%s says no!".

### 4e. Diğer jutsu kategorileri (4)

`ItemNinjutsu` (Amenotejikara, Body Replacement, Hiding with Camouflage),
`ItemIryoJutsu` (Medical Ninjutsu, 3 iç sınıf), `ItemJutsu` (taban),
`ItemDojutsu` (taban).

**Doğa/kekkei genkai toplamı: 5 temel + 8 kekkei genkai + 1 kekkei tota +
2 yin/yang + 6 ileri seviye = 22 tanımlı çakra tipi.**

`ProcedureKGDistribution` oyunculara kekkei genkai dağıtımını yapıyor.

---

## 5. SİLAHLAR

### 5a. Sisin Yedi Kılıçustası — 7/7 TAM

| Eşya | Ad | Sahibi |
|---|---|---|
| `ItemZabuzaSword` | Kubikiribocho | Zabuza |
| `ItemSamehada` | Samehada | Kisame |
| `ItemKibaBlades` | Kiba Blades | Ameyuri |
| `ItemNuibariSword` (+ `ItemNuibariThrown`) | Nuibari Sword | Kushimaru |
| `ItemShibukiSword` | Shibuki Sword | Jinpachi |
| `ItemKabutowari` (+ `Axe`, `Hammer`) | Kabutowari | Jinin |
| `ItemHiramekareiSword` | Hiramekarei Sword | Chojuro |

### 5b. Diğer kesici/delici (13)

`ItemAnbuSword` (Anbu Sword) · `ItemChokuto` · `ItemKusanagiSword` ·
`ItemTotsukaSword` · `ItemKagutsuchiSwordRanged` · `ItemBoneSword` ·
`ItemBoneDrill` · `ItemChakraBlades` · `ItemClaw` (Triple bladed claw) ·
`ItemCleaver` (şimşek çakrası ile güçlendirilebilir) ·
`ItemScytheHidan` (3 ağızlı tırpan) · `ItemScytheMadara` ·
`ItemSpearRetractable` (Retractable Spear)

### 5c. Fırlatılabilirler (16)

`ItemKunai` · `ItemKunai3prong` · `ItemKunaiBlade` · `ItemKunaiExplosive` ·
`ItemKunaiHiraishin` · `ItemShuriken` · `ItemFumaShuriken` ·
`ItemKamuiShuriken` · `ItemSenbon` · `ItemPoisonSenbon` · `ItemIceSenbon` ·
`ItemSmokeBomb` · `ItemPoisonbomb` · `ItemGauntletThrown` ·
`ItemNuibariThrown` · `ItemScytheHidanThrown`

### 5d. Asa / yelpaze / eldiven / diğer (10)

`ItemAdamantineNyoi` (Enma'nın sopası — Defend / Extend) ·
`ItemSageStaff` (Truth Seeking Shakujo) · `ItemYaguraStaff` ·
`ItemGunbai` (Madara'nın yelpazesi) · `ItemFoldingFan` (Temari) ·
`ItemGaunlet` (Metal Gauntlet, zincirli) · `ItemSoundGaunlet`
(Sound Reflecting Gauntlet) · `ItemAsuraCanon` · `ItemSenbonArm`
(kukla zehirli senbon kolu) · `ItemIshiken`

### 5e. Vücut/çakra silahları (3)

`ItemAshBones` (All-Killing Ash Bones) · `ItemBlackReceiver` (Kara Alıcı
çubuklar) · `ItemTruthSeekerBall` yok — varlık olarak `EntityTruthSeekerBall`.

**SİLAH TOPLAMI: 49 üst düzey eşya sınıfı** (7 + 13 + 16 + 10 + 3).
`recipes/` içinde 55 tariften ~10'u silah tarifi.

---

## 6. ZIRH / KIYAFET SETLERİ

### 6a. Köy ninja zırhları (`ItemNinjaArmor*`, 17 varyant)

| Set | Ad |
|---|---|
| `ItemNinjaArmorKonoha` | Flak Jacket / Forehead Protector / Ninja Pants (Konoha) |
| `ItemNinjaArmorSuna` | Flak Jacket / Boots / Protector / Pants (Sunagakure) |
| `ItemNinjaArmorIwa` | Flak Jacket / Boots / Protector / Pants (Iwagakure) |
| `ItemNinjaArmorKiri` | Flak Jacket / Boots / Protector / Pants (Kirigakure) |
| `ItemNinjaArmorKumo` | Flak Jacket / Boots / Protector / Pants (Kumogakure) |
| `ItemNinjaArmorAme` | Forehead Protector / Ninja Suit (Amegakure) |
| `ItemNinjaArmorOto` | Ninja Outfit / Mask / Leggings (Otogakure) |
| `ItemNinjaArmorAnbu` | Chest Armor / Boots / Helmet / Pants (Anbu) |
| `ItemNinjaArmorSound` | Ninja Armor Sound (4 parça) |
| `ItemNinjaArmorWar1` | 1st Ninja War Body Armor + Facial Protector (Konoha) |
| `ItemNinjaArmorFishnets` | Ninja Fishnets Shirt and Pants |
| `ItemNinjaArmorJumpsuit` | Jumpsuit |
| `ItemNinjaArmorNarutoS` | Naruto Jacket / Pants (Shippuden) |
| `ItemNinjaArmorSakura1` | Sakura Vest / Leggings |
| `ItemNinjaArmorJiraiya` | Jiraiya Jacket / Clothes / Protector |
| `ItemNinjaArmorObitoWar` | Obito Suit (4th Ninja War) |
| `ItemNinjaArmor` | taban sınıf |

### 6b. Kage kıyafetleri (5 tam set)

`ItemClothesHokage` (Hokage Robe + Hat) · `ItemClothesKazekage` (Kage Robe +
Kazekage Hat) · `ItemClothesMizukage` · `ItemClothesRaikage` ·
`ItemClothesTsuchikage`. Her biri helmet/body/legs/boots.
Dokular: `robe_hokage.png`, `robe_kazekage.png`, `robe_mizukage.png`,
`robe_raikage.png`, `robe_tsuchikage.png`.

### 6c. Akatsuki ve maskeler (8)

`ItemAkatsukiRobe` (Akatsuki Robe + Akatsuki Hat; `robe_akatsuki.png`,
`robe_akatsuki_half.png`) · `ItemMaskAnbu1` · `ItemMaskAnbu2` ·
`ItemMaskAnbu3` · `ItemMaskAnbu4` (dört ayrı Anbu maskesi) ·
`ItemMaskObito1` (Tobi maskesi) · `ItemMaskObitoWar` (4. Ninja Savaşı, 4 parça) ·
`ItemAnbuRobe` (helmet/body/legs/boots).

### 6d. Diğer zırh ve çakra formları (10)

`ItemSamuraiArmor` (4 parça) · `ItemBoneArmor` (Shikotsumyaku) ·
`ItemSteamArmor` (Boil Release buhar zırhı, 3 parça) ·
`ItemBijuCloak` (helmet/body/legs — bijuu mantosu) ·
`ItemAsuraPathArmor` (Asura Path Bodygear) ·
`ItemUchiha` (Uchiha Body/Leggings + Ninja Sandles) ·
`ItemRobe` / `ItemRobeJiraiya` (Jiraiya Robe, 4 parça) ·
`ItemGourd` (Iron Sand Gourd — Gaara'nın su kabağı;
`gourd_sand.png`, `gourd_iron.png`) ·
`ItemTenseigan` (Tenseigan Chakra body/legs) ·
`ItemRinnegan` (Rinne Sharingan Body/Leggings/Boots) ·
`ItemOnBody` (görünmez taşıma yuvası) · `ItemByakuRinnesharingan`
("6 Path Body" / Fake Rinne Sharingan gövde seti, 4 parça).

**ZIRH TOPLAMI: 40 üst düzey zırh/kıyafet sınıfı**, yaklaşık 130 ayrı
giyilebilir parça (`item.*(helmet|body|legs|boots)` anahtarları).

---

## 7. BLOKLAR ve DÜNYA İÇERİĞİ

### 7a. Bloklar — 7 üst düzey sınıf (23 `.class` dosyası)

| Sınıf | Oyun içi ad | İşlev |
|---|---|---|
| `BlockAmaterasuBlock` | Amaterasu Flame | Sönmeyen kara alev; `ModConfig.AMATERASU_BLOCK_DURATION` |
| `BlockExplosiveTag` | Explosive Tag | Patlayıcı mühür (tarifi var) |
| `BlockKamuiBlock` | Kamui Block | Kamui boyutu bloğu |
| `BlockLightSource` | Light Source | Görünmez ışık kaynağı |
| `BlockMud` | Mud (akışkan: `fluid.mud`) | Swamp of the Underworld sıvısı |
| `BlockPortalBlock` | Portal Block | Kamui boyutu geçidi |
| `BlockWaterStill` | Water Still | Suiton jutsuları için durgun su |

`blockstates/` içinde 8 JSON — yukarıdaki 7 + `hiramekarei.json`.

### 7b. Yapılar — 22 `.nbt` dosyası

| Dosya | Adet | Kullanan sınıf |
|---|---|---|
| `world_tree_1.nbt` … `world_tree_20.nbt` | **20** | `ProcedureSpawnGodTree` |
| `meteor.nbt` | 1 | `ProcedureMeteorStrike` (Tengai Shinsei) |
| `wood_house_2.nbt` | 1 | `ItemMokuton$JutsuHouse` (Four-Pillar House Technique) |

**KÖY veya TAPINAK YAPISI YOK.** 22 yapının 20'si tek bir Tanrı Ağacı'nın
(Shinju / God Tree) dilimleridir — Chakra Fruit ile ilişkili
(`ItemChakraFruit`, `ProcedureChakraFruitFoodEaten`).
Mod **vanilla köylerini** kullanıyor, kendi köyünü üretmiyor:
`EventVillageSiege` + `ProcedureCheckVillageSize` +
`chattext.specialevent.villagesiege` ("Event alert: A siege is coming!") +
`scoreboard.objective.siege_kills` — yani köy kuşatması **olayı** var,
köy **yapısı** yok.

### 7c. Boyut

`WorldKamuiDimension` — Kamui boyutu. Giriş:
`ProcedureKamuiDimensionPlayerEntersDimension`, tetikleyici
`item.kamuidimension` (Kamui Dimension Portal Igniter).
**Modda tek özel boyut bu.**

### 7d. Dünya olayları (`net/narutomod/event/`, 9 sınıf)

`EventVillageSiege` · `EventSphericalExplosion` · `EventCylindricalExplosion` ·
`EventVanillaExplosion` · `EventSetBlocks` · `EventDelayedCallback` ·
`EventDelayedSpawn` · `SpecialEvent` · `EnumEventType`.

### 7e. Yiyecek / para / sarf (13)

`ItemIchirakuRamen` · `ItemOnigiri` · `ItemRice` · `ItemCurryandRice` ·
`ItemCurryofLife` · `ItemTea` · `ItemSake` · `ItemWhiteZetsuFlesh` ·
`ItemChakraFruit` · `ItemMilitaryRationsPill` (200 çakra) ·
`ItemMilitaryRationsPillGold` (500 çakra + 30 sn boyunca %5/sn yenilenme) ·
`ItemRyo100` / `ItemRyo1000` / `ItemRyo10000` / `ItemRyo1M` (para birimi).

---

## 8. İKSİR / ETKİLER

10 üst düzey `Potion` sınıfı (23 `.class` dosyası). Onunun da normal iksir,
splash, lingering ve tipped arrow çeşidi var (`10 × 4 = 40` lang anahtarı).

| Sınıf | Etki adı | HUD adı |
|---|---|---|
| `PotionAmaterasuFlame` | Amaterasu | Amaterasu |
| `PotionChakraEnhancedStrength` | Chakra Enhanced Strength | Chakra Enhanced Strength |
| `PotionChakraRegeneration` | Chakra Regeneration | Chakra ++ |
| `PotionCorrosion` | Corrosion | Corrosion |
| `PotionFeatherFalling` | Feather Falling | Feather Falling |
| `PotionFlight` | Flight | Flight |
| `PotionHeaviness` | Heaviness | Heaviness |
| `PotionInstantDamage` | Instant Damage | Instant Damage |
| `PotionParalysis` | Paralysis | Paralysis |
| `PotionReach` | Reach | Reach |

Her birinin `Procedure*OnPotionActiveTick` eşleniği var; `Flight` ve
`Paralysis` ayrıca `PotionExpires` prosedürüne sahip.

---

## 9. TUŞ BAĞLARI

5 üst düzey `keybind` sınıfı (15 `.class`), lang'de **4 adlandırılmış tuş**
+ 1 kategori:

| Anahtar | Ad | Sınıf | İşlev |
|---|---|---|---|
| `key.mcreator.category` | Naruto Mod | — | tuş kategorisi |
| `key.mcreator.powerincrease` | Switch Jutsu / Increase | `KeyBindingPowerIncrease` | Jutsu döngüsü + güç seviyesi artırma (`ProcedurePowerIncreaseOnKeyPressed`) |
| `key.mcreator.specialjutsu1` | Jutsu 1 | `KeyBindingSpecialJutsu1` | `ProcedureSpecialJutsu1OnKeyPressed` |
| `key.mcreator.specialjutsu2` | Jutsu 2 | `KeyBindingSpecialJutsu2` | `ProcedureSpecialJutsu2OnKeyPressed` |
| `key.mcreator.specialjutsu3` | Jutsu 3 | `KeyBindingSpecialJutsu3` | `ProcedureSpecialJutsu3OnKeyPressed` |

Beşinci sınıf `KeyBindingExtendedReachMouseEvent` — tuş değil, `Reach`
etkisi altında fare tıklama menzilini uzatan olay dinleyicisi
(lang girdisi yok).

Ek girdi: `PlayerInput` (kök paket) ve `ProcedureOnKeyEvent`,
`ProcedureOnLeftClickEmpty`, `ProcedureOnLivingJump`, `ProcedureOnItemTossed`.
`ModConfig.NARUTO_RUN` — koşu animasyonu ayarı.

---

## 10. GUI / ARAYÜZ

### 10a. Ekranlar — 52 üst düzey `gui` sınıfı (169 `.class`)

| Tür | Adet | Sınıflar |
|---|---|---|
| Jutsu parşömen ekranı | **49** | `GuiScroll*Gui` (aşağıda) |
| Tıbbi parşömen | 1 | `GuiMedicalScrollGUI` — tıbbi jutsu seçimi; `chattext.medicalgui.notmedninja` |
| Genel ninja parşömeni | 1 | `GuiNinjaScroll` — jutsu öğrenme ekranı |
| Takım yöneticisi | 1 | `GuiTeamManager` — `ItemTeamScroll` ile; `ProcedureTeamManagerJoin` / `Leave` |

**49 jutsu parşömen GUI'si:** BigBlow · BodyReplacement · CellularActivation ·
Chidori · EarthGolem · EarthSandwich · EarthSpears · EarthWall ·
EnhancedStrength · FalseDarkness · FireAnnihilation · FireStream ·
FlameFormation · FlameSlice · FutonChakraFlow · FutonVacuum · Genjutsu ·
GreatFireball · Healing · HidingInAsh · HidingInCamouflage · HidingInMist ·
HidingInRock · Hiraishin · KageBunshin · KikaichuSphere · Kirin ·
LightningBeast · LightningChakraMode · LightningPanther · MindTransfer ·
MultiSize · PoisonMist · Puppet · Rasengan · Rasenshuriken ·
Sealing4Symbols · SealingChains · ShadowImitation · SwampPit ·
Transformation · VacuumWave · WaterCannon · WaterDragon · WaterPrison ·
WaterShark · WaterShockwave · WaterStream · WindBlade.

Buna karşılık **52 `ItemScroll*` eşyası** var — 3 fazlası kukla parşömenleri
(`ItemScrollHiruko`, `ItemScrollKarasu`, `ItemScrollSanshouo`,
`ItemScroll3rdKazekage`) ve GUI'siz doğrudan kullanılan parşömenler.
**ŞÜPHELİ:** GUI–eşya eşleşmesinin tam haritası çıkarılmadı.

### 10b. HUD göstergeleri — 2 üst düzey `overlay` sınıfı (10 `.class`)

| Sınıf | Gösterge |
|---|---|
| `OverlayChakraDisplay` | Çakra barı (`bartop`, `chakraText`, `chakraTextLen`), yeşil alev efekti (`flames_green.png`), `ShowFlamesMessage` ağ paketi ile sunucudan tetikleniyor |
| `OverlayByakuganView` | Byakugan görüşü (`byakuganActivated`, `CustomDataMessage` ağ paketi) — varlıkları duvar ardından görme |

Ek HUD metinleri: `chattext.ninjaexperience` ("Ninja Experience: "),
`chattext.cooldown.formatted` ("Cooldown: %.1f"),
`chattext.intangible` ("Intangible: "),
`overlay.no_biju_available`, `chattext.jutsu.enabled`.

Çakra sistemi çekirdeği kök pakette: `Chakra`, `Chakra$Pathway`,
`Chakra$PathwayPlayer`. Ayar: `ModConfig.CHAKRA_REGEN_RATE`.

### 10c. Komutlar (3)

`CommandAddNinjaXp` · `CommandAddXP2Jutsu` · `CommandLocateEntity`.
Ayrıca `ProcedureAoeCommand`, `ProcedureEventCommandCommandExecuted`.
Ayar: `ModConfig.NINJAXP_MULTIPLIER`.

### 10d. Yaratıcı mod sekmesi

`TabModTab` → `itemGroup.tabmodtab=Naruto` (tek sekme, tüm eşyalar burada).

---

## 11. Ek: başarımlar ve ilerleme sistemi

22 başarım dosyası (`advancements/`). İlerleme iskeleti:

1. `ninjaachievement` — Shinobi ("ninja eğitimine başlayabilirsin")
2. `learned_1st_jutsu` — Learned First Jutsu
3. `achievementmedicalgenin` — Medical Genin
4. `openedgates` — Power of Youth! (Sekiz Kapı)
5. Doujutsu dalı (8 başarım) — bkz. bölüm 3
6. Kekkei genkai dalı (9 başarım): mokuton, hyoton, yooton, futton, ranton,
   shakuton, jiton, bakuton, shikotsumyaku + kekkei_tota

İki XP para birimi var: **NXP** (Ninja Experience, genel seviye) ve
**JXP** (Jutsu Experience, jutsu başına ustalık). Örnek eşikler:
Jinton 4900 NXP, Gedo Mazo çağırma 8100 NXP, Biju Cloak seviye 2 için 3600 JXP.

---

## 12. Belirsizlikler — ŞÜPHELİ işaretliler

- **ŞÜPHELİ:** 49 jutsu GUI'si ile 52 `ItemScroll*` eşyasının birebir
  eşleşmesi doğrulanmadı; hangi parşömenin GUI'si yok, tek tek açılmadı.
- **DOĞRULANDI (şüpheli değil):** `ProcedureSpawnGodTree` sınıfının sabit
  havuzunda `world_tree_1` … `world_tree_20` dizelerinin **yirmisi de ayrı ayrı
  yazılı**. Yani Tanrı Ağacı tek bir prosedürle, 20 şablon parçasının
  yan yana yerleştirilmesiyle kuruluyor — 20 farklı ağaç varyantı değil.
- **ŞÜPHELİ:** `EntityNinjaMerchant$TradeLevel` ticaret kademelerinin sayısı ve
  içeriği (hangi eşyaları satıyor) ölçülmedi.
- **ŞÜPHELİ:** Sage Mode'un üç tipi (kurbağa/yılan/sümüklüböcek) doku
  adlarından (`sagetoadhelmet`, `sagesnakehelmet`, `sageslughelmet`)
  çıkarıldı; `ItemSenjutsu` iç sınıflarıyla teyit edilmedi.
- **KESİN DEĞİL ama güçlü:** Modda köy/tapınak üreten yapı yok; köy kuşatması
  olayı vanilla köylerini kullanıyor. `ProcedureCheckVillageSize` bunu
  destekliyor.
- `entity.teacher.tag=Huang` ve `entity.altcamview` (Cam) gibi birkaç lang
  girdisi geliştirme artığı görünüyor — karşılık gelen üst düzey sınıf yok
  veya iç araç.
- `item.zzz` / `ItemZzz` — uyku/dinlenme eşyası, adı jenerik; işlevi
  `ProcedureZzzRightClickedInAir` / `OnBlock` / `EntitySwingsItem`'da.

---

## 13. Özet tablo

| Kategori | Adet |
|---|---|
| Adlandırılmış karakter/NPC varlığı | **30** (18 insan + 6 çağırma + 6 kukla) |
| Jenerik NPC türü | 8 |
| Kuyruklu canavar | **9 + Ten Tails + Gedo Mazo** |
| Doujutsu eşyası | **11** (8 başarım kademesi) |
| Çakra doğası / kekkei genkai | **22** (5 temel + 8 KG + 1 kekkei tota + 2 yin/yang + 6 ileri) |
| Silah | **49** (7 Sisin Kılıcı dahil) |
| Zırh/kıyafet sınıfı | **40** (~130 giyilebilir parça) |
| Blok | **7** |
| `.nbt` yapı | **22** (20 Tanrı Ağacı + meteor + ahşap ev) |
| Boyut | **1** (Kamui) |
| İksir/etki | **10** (×4 varyant = 40 lang) |
| Tuş bağı | **4** adlandırılmış (+1 olay dinleyici) |
| GUI ekranı | **52** (49 jutsu parşömeni + 3 özel) |
| HUD göstergesi | **2** (Çakra barı, Byakugan görüşü) |
| Jutsu parşömeni eşyası | **52** |
| Başarım | **22** |
| Tarif | **55** |
| Ses dosyası | **130** |
| Komut | **3** |

---

*Bu belge yalnızca envanterdir. Mod'un lisansı yoktur; hiçbir varlık,
doku, model, ses veya kod kopyalanamaz veya türetilemez.*
