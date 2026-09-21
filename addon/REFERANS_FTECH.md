# F-Tech: Equipment 1.0.1 — ölçüm

| alan | değer |
|---|---|
| dosya | `f_tech_equipment-fabric-1.0.1.jar` |
| mod kimliği | `f_tech_equipment` |
| yapımcı | BillBodkin (cablepost.co.uk) |
| **lisans** | **MIT** — `fabric.mod.json` içinde `"license": "MIT"` |
| platform | Fabric, Minecraft 1.20.1, Java 17 |
| bağımlılıklar | `architectury`, `fabric-api`, `f_tech_core >= 2.0-rc.5`, `trinkets` |
| içerik | 156 sınıf · 44 JSON · 27 PNG · 1 OGG |

**Lisans notu:** JAR içinde ayrı bir `LICENSE` dosyası yok; beyan
`fabric.mod.json`'da. Fabric'te lisansın beyan edildiği yer burasıdır,
yani beyan sahibinin kendi sözü. MIT izin verici: kopyalama, değiştirme
ve dağıtma serbest, tek şart telif bildiriminin korunması. Marka katmanı
**yok** (Marvel/Hasbro gibi bir üçüncü taraf hakkı bulunmuyor) — bu yüzden
depo kuralının üçüncü kademesine giriyor: **paylaşılabilir, depoya girer**,
`KAYNAKLAR.md`'ye satırı yazıldı.

---

## 1. Ne yapıyor

`fabric.mod.json` açıklaması, birebir:

> *Adds robotic backpack with automated arms for mining, building, combat,
> and locomotion.*

Sırtta taşınan (Trinkets `chest/back` yuvası) bir çanta; **sekiz robotik
kol** taşıyor. Kollar blok kırar, blok koyar, canavarla dövüşür, yerdeki
eşyayı toplar, varlık kavrar/fırlatır ve yüzeylere tutunup oyuncuyu
havada taşır.

Sekiz kol `BackpackArm` enum'unda adlandırılmış:
`TOP_LEFT · TOP_LEFT_UPPER · TOP_LEFT_LOWER · LEFT ·
TOP_RIGHT · TOP_RIGHT_UPPER · TOP_RIGHT_LOWER · RIGHT`

## 2. Çantanın kendi sayıları

| ölçüm | değer | nereden |
|---|---|---|
| kol sayısı | **8** | `BackpackArm` enum + `FTechEquipment` NBT anahtarları |
| taban depo kapasitesi | **1000 eşya** | `BackpackItem.BASE_CAPACITY` |
| taban kol menzili | **1 blok** | `BackpackItem.BASE_MAX_RANGE` |
| yükseltme yuvası | **9** (3×3) | `BackpackUpgradeSlotsComponent.SLOT_COUNT` |
| kol adım payı | 0.06 | `BackpackItem.ARM_STEP` |
| mesafe yumuşatma | 0.15 | `BackpackItem.BLOCK_DISTANCE_SMOOTH_FACTOR` |
| açık alan dengesi | 0.96 | `BackpackItem.OPEN_SPACE_BALANCE` |
| dar alan dengesi | 0.93 | `BackpackItem.CONFINED_SPACE_BALANCE` |
| dar/açık eşiği | 2.0 / 5.0 | `BackpackItem.CONFINED_THRESHOLD`, `OPEN_THRESHOLD` |
| kol yakınlık eşiği | 3.0 | `BackpackItem.ARM_REACH_CLOSE_THRESHOLD` |

## 3. Yükseltmeler — dokuzu da ölçüldü

`allowsMultiple()` bytecode'dan okundu: `iconst_1` = istiflenir,
`iconst_0` = yalnız bir kez.

| yükseltme | etkisi | istiflenir mi |
|---|---|---|
| Storage Mk.I | **+500** kapasite | evet |
| Storage Mk.II | **+1000** kapasite | evet |
| Storage Mk.III | **+2000** kapasite | evet |
| Range | **+1** menzil | evet |
| Block Operations | kazma/inşa kipini açar | hayır |
| Combat | dövüş kipini açar | hayır |
| Entity Manipulation | kavrama kipini açar | hayır |
| Item Pickup | toplama kipini açar | hayır |
| Locomotion | hareket kipini açar | hayır |
| Queue | sürekli görev kuyruğu | hayır |

Storage kademe/bonus çiftleri `FTechEquipment` kayıt satırlarından:
`(tier 1, 500)`, `(tier 2, 1000)`, `(tier 3, 2000)`.
Range bonusu `iconst_1` = 1.

`LocomotionUpgradeItem` **büyülenebilir** (`method_7870` → `iconst_1`),
büyülenebilirliği **18** (`method_7837` → `bipush 18`) ve kendi
açıklaması "Enchant with Frost Walker to stride on water" diyor.

## 4. Dövüş

| ölçüm | değer | nereden |
|---|---|---|
| saldırı menzili | **10.0** blok | `AttackAction.ATTACK_RANGE` |
| bir hedefe en çok kaç kol | **2** | `AttackAction.MAX_ARMS_PER_TARGET` |
| en az hasar | 1.0 | `BackpackWeaponSlotsComponent.MIN_ATTACK_DAMAGE` |
| savurma hızı | 0.3 | `ATTACK_SWING_SPEED` |
| havada bekleme (en az/en çok) | 2 / 1000 tick | `MIN_HOVER_TICKS`, `MAX_HOVER_TICKS` |
| havalanma yüksekliği / hızı | 0.7 / 0.035 | `HOVER_RISE_MAX`, `HOVER_RISE_SPEED` |
| yukarı savurma eşiği | 2.5 | `UPWARD_SWING_THRESHOLD` |
| hedefe dönüş hızı | 0.05 | `RETURN_TO_HOVER_SPEED` |

Hedef süzgeci üç özel anahtar tanıyor:
`special:all_hostiles`, `special:player_attacks`, `special:attacked_by`
(`BackpackAttackTargetFilterComponent`).

## 5. Varlık kavrama ve fırlatma

| ölçüm | değer | nereden |
|---|---|---|
| kavrama menzili | **10.0** blok | `EntityThrowAction.GRAB_RANGE` |
| kol başına varlık | **1** | `EntityManipulationUpgradeItem` açıklaması |
| tutma mesafesi adımı | 0.35 | `HOLD_DISTANCE_STEP` |
| tutma mesafesi sınırları | −1.75 … +6.0 | `MIN/MAX_HOLD_DISTANCE_OFFSET` |
| tutma yumuşatması | 0.4 | `GrabbedEntityTracker.HOLD_LERP_FACTOR` |
| fırlatma şarjı | **6 … 40 tick** | `EntityReleaseHandler.THROW_MIN/MAX_CHARGE_TICKS` |
| fırlatma hızı | **0.8 … 2.8** | `EntityReleaseHandler.MIN/MAX_THROW_SPEED` |
| hareket çıpası koruması | en az 2 kol | `EntityGrabHandler.MIN_LOCOMOTION_ANCHORS_TO_KEEP` |

Kavranabilir olanlar yükseltmenin kendi açıklamasında:
*"Grab looked-at mobs or primed TNT"*.

## 6. Hareket (locomotion)

| ölçüm | değer | nereden |
|---|---|---|
| tutunma tipi | `SIDE`, `CORNER` | `GrabType` enum |
| yüzey içe kaydırma | 0.15 | `GrabSurfaceDetector.SURFACE_INSET` |
| yukarı yanlılık | 0.3 | `UPWARD_BIAS` |
| hız/bakış ağırlığı | 0.7 / 0.3 | `VELOCITY_WEIGHT_MOVING`, `LOOK_WEIGHT_MOVING` |
| hız ileri-bakış | 15 tick | `VELOCITY_LOOKAHEAD_TICKS` |
| ivme kademeleri | 0.025 · 0.05 · 0.1 | `LocomotionController` sabitleri |
| hız tavanları | 0.7 · 1.2 · 1.5 | `LocomotionController` sabitleri |
| menzil | 10.0 / 12.0 | `LocomotionController` |
| sönümleme | 0.95 | `LocomotionController` |
| en az tutunan kol | **1** | `backpack_locomotion.en_us.txt` |

Belgenin kendi kontrol tablosu: `WASD` yatay, `Jump` yükselme,
`Crouch` iniş.

## 7. Yaprak Temizleyici (ayrı eşya)

| ölçüm | değer | nereden |
|---|---|---|
| koni menzili | **18.0** blok | `FoliageClearerItem.CONE_RANGE` |
| koni açısı | **30.0°** | `CONE_ANGLE` |
| düşürme olasılığı | **0.125** | `DROP_CHANCE` |
| bekleme | **20 tick** | `COOLDOWN_TICKS` |
| dayanıklılık | **256** | `FTechEquipment` kayıt satırı |

Temizlediği bloklar `clearable_foliage` etiketinde: 5 etiket + 36 blok
(yapraklar, çiçekler, fidanlar, otlar, sarmaşıklar, deniz yosunu,
bambu, mantar kökleri, dripleaf, azalea, yosun, sculk damarı).

## 8. Robotik Matkap

Kazma hızı çarpanı **30.0** (`RoboticDrillItem.getBreakingTicks`).
Dayanıklılık ve tier `f_tech_core` bağımlılığından geliyor
(`uk.co.cablepost.f_tech.drills.RoboticDrillItem` yansımayla çağrılıyor),
o JAR elimizde yok — **bu iki sayı ölçülemedi.**

## 9. Platform bloğu

| ölçüm | değer | nereden |
|---|---|---|
| tarama aralığı | 5 tick | `BackpackPlatformBlockEntity.SCAN_PERIOD_TICKS` |
| tarama yarıçapı | 0.85 | `SCAN_RADIUS` |
| tarama yüksekliği | 5.0 | `SCAN_HEIGHT_ABOVE` |
| eşya uçuş süresi | 12 tick | `FLIGHT_DURATION_TICKS` |
| ilerleme/tick | 0.1 | `PROGRESS_DELTA_PER_TICK` |
| aktarım kipleri | tek / istif / hepsi | `PlatformTransferHandler.MODE_*` |
| aynı anda kaç oyuncu | 1 | `backpack_platform.en_us.txt` + `PlatformClaims` |

## 10. Tarifler (15 tane, hepsi okundu)

| sonuç | desen | malzeme |
|---|---|---|
| Backpack | `ICI/INI/III` | I = demir bloğu, C = sandık, N = bakır bloğu |
| Backpack Platform | `LCL/GPG/III` | L = lapis, C = bakır bloğu, G = cam, P = piston, I = demir bloğu |
| Blank Upgrade | `RBR/ICI/RBR` | R = redstone, B = demir parmaklık, I = demir külçe, C = bakır bloğu |
| Block Operations | `RUR/DED/RDR` | U = boş yükseltme, R = redstone bloğu, D = elmas, E = ender incisi |
| Combat | `SUS/ANA/SAS` | S = elmas kılıç, A = yankı kabuğu, N = nether yıldızı |
| Entity Manipulation | `SUS/ANA/SAS` | (aynı desen, farklı malzeme) |

Kalan dokuz tarif aynı `blank_upgrade` merkezli kalıpta.

## 11. Varlıklar

27 PNG + 1 OGG. Eşya ikonları **32×32**, çanta dokusu 64×64, platform
dokusu 128×128, arayüz sekmeleri 16×16, ses `robot_arm.ogg` (11.821 bayt).

Eşya modellerinden ikisi Java `elements` biçiminde ve `texture_size`
alanı **[32, 32]** — `arac/java_gorsel_coz.py` bu alanı bugüne kadar
hiç okumuyordu, v7.96.4'te okumaya başladı (bkz. NOTLAR.md).
