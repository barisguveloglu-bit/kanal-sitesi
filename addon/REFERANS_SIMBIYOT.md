# Referans · symbiote 1.1.2

**Kaynak:** `symbiote1.1.2.jar` (Scout, Forge). **Elle yazılmış** bir
mod — MCreator değil, 266 sınıf, düzgün paketlenmiş bir mimari.

**Yöntem:** jar **hiç çalıştırılmadı**. Sınıf sabit havuzları okundu.

## Yapı

| Paket | Sınıf |
|---|---|
| `ability/` | 86 (52 benzersiz yetenek sınıfı) |
| `client/` | 34 |
| `event/` | 21 |
| `tracker/` | 17 |
| `network/` | 15 |
| Dil anahtarı | 655 |
| Ayar anahtarı (`SymbioteConfig`) | **196** |

## İki eksen

**`SymbioteStrain`** (5 suş) — enum sabitleri doğrudan okundu:

```
GUARDIAN · PREDATOR · SHADOW · SCULK · ROYAL
```

**`BondStage`** (5 kademe):

```
UNBONDED · ATTACHED · INTEGRATED · COOPERATIVE · DOMINANT
```

## "En güçlüsü" hangisi — tahmin değil, üç kanıt

**1. Ayar dosyasında ROYAL'e özel beş artırıcı var**, başka hiçbir
suşta bu kadarı yok:

```
ROYAL_DAMAGE_MULT · ROYAL_ARMOR_DR_BONUS · ROYAL_HIT_CAP_FRAC
ROYAL_REGEN_ENABLED · ROYAL_INTENSITY_BONUS · ROYAL_DEFIANCE_MULT
```

Karşılaştırma: `GUARDIAN_ARMOR_DR_BONUS` tek başına;
`PREDATOR_*` dört tane ama ikisi ceza (`HUNGER_DRAIN_MULT`,
`STARVE_THRESHOLD_BONUS`); `SHADOW_*` ve `SCULK_*` ikişer ve
koşullu (gece / sonic).

**2. `CrownedOnslaught` sınıfı `CROWN` ve `crownSlot` taşıyor** —
taç yalnız ROYAL'in.

**3. Apex Form'un tuş açıklaması kaynağın kendi dilinde:**
`key.symbiote.apex = Apex Form (Dominant)` — en üst bond kademesi
şart. Aynı şekilde `key.symbiote.arm_toggle = Toggle Symbiote
Mantle (Dominant)`.

Yani en güçlüsü = **ROYAL suşu + DOMINANT kademesi + Apex Form**.

## Ölçülen sayılar (sınıf sabitleri)

| Sınıf | Sabit | Değer |
|---|---|---|
| `Carapace` | `DAMAGE_REDUCTION` | **0.65** |
| `Frenzy` | `STRIKE_INTERVAL` | **8** tick |
| `Frenzy` | `STRIKE_RANGE` | **6.0** |
| `Frenzy` | `STRIKE_DAMAGE` | **7.0** |
| `CrownedOnslaught` | `MAX_STRIKES_PER_VOLLEY` | 2 |
| `SonicScreech` | `CONE_COS` | 0.57 |
| `GroundSlam` | `LIFT/HOLD/DRIVE_END_TICK` | 16 / 26 / 40 |
| `GroundSlam` | `DAMAGE_MULT` | 1.75 |
| `GroundSlam` | `COOLDOWN_TICKS` | 200 |

## Ölçülemeyen

`APEX_DURATION_TICKS`, `APEX_COOLDOWN_TICKS`, `ROYAL_DAMAGE_MULT`
ve diğer 196 ayarın **değerleri**. Adları `SymbioteConfig`'de var
ama sayılar sabit havuzunda ada bağlanamıyor — `ldc` sırası
güvenilir değil, yanlış eşleştirme uydurma sayı demek olurdu.

Bu üçü bizde **kendi sayımız** ve `ayarlar.js`'te öyle işaretli.

## Bizde nasıl karşılandı

`yetenekler/simbiyot.js`, sıra **550**. Tek yetenek, seçim yok:
düğme doğrudan **en güçlüsünü** veriyor.

- Carapace 0.65 → **Direnç III** (%60). Direnç IV %80, 0.65'e daha
  uzak. Direnç V dokunulmazlık demek ve bu depoda yasak —
  `tarama.mjs` ayrıca deniyor.
- Frenzy → form açıkken **8 tickte bir**, **6 blok** çevreye,
  **7 hasar** × Royal çarpanı × ruh çarpanı.
- Süre sınırlı, tekrar dokununca kapanıyor, ruh yetmezse hiç
  açılmıyor.

**En güçlü suş/kademe listenin SONUNDAN okunuyor**, elle
yazılmıyor: `SIMBIYOT_SUSLAR`'a yeni bir suş eklenirse düğmenin
verdiği şey kendiliğinden kayar. Test bunu değişmez olarak tutuyor.

### Neden Ben 10 gibi eşya değil

Ben 10 dönüşümleri eşyayı **eline almakla** oluyor: görünüşü süren
molang sorgusu (`get_equipped_item_name`) yalnız eli okuyabiliyor.
Simbiyotun Bedrock'ta bir modeli yok; yeni bir yaratık modeli
uydurmak "sahte içerik yasak" kuralına girer.

O yüzden düğme Ben 10 **listesine** değil menünün **altındaki
ekler**'e kondu: liste bilgi veriyor (dönüşüm eşyayla oluyor), bu
düğme ise doğrudan çalıştırıyor. İkisini aynı listede karıştırmak
"dokundum ama bir şey olmadı / dokundum ve bir şey oldu"
karmaşası olurdu.

## Alınmayanlar

Modun 52 yetenek sınıfının çoğu **simbiyotun kendi iradesi**
üzerine: `DefianceController`, `SymbioteDesires`, `SymbioteJealousy`,
`WalkSeizure`, `DeepSeizure`, `SleepTakeover`, `EmotionalMemory`,
`VoidFarewell`. Bunlar oyuncunun kontrolünü **elinden alan**
mekanikler (`override_seizure`, `Symbiote seizes control`).

Bu depoda oyuncunun kontrolünü elinden alan bir şey yok ve olmamalı
— aynı gerekçeyle dışarıdan gelen girdi kilitlerine karşı
`arinma.js` yazılmıştı. Simbiyotun "seni ele geçirir" tarafı bu
yüzden alınmadı; gücü alındı, esareti değil.
