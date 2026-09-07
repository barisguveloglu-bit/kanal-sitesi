# Referans · Mine Mine no Mi 1.20.10 (11.5)

**Kaynak:** `mineminenomi1.20.10.11.5.jar` (Forge, One Piece modu).

**Yöntem:** jar **hiç çalıştırılmadı**. Sınıf sabit havuzları okundu.

## Modun ölçüsü

| | |
|---|---|
| Sınıf | 3271 |
| `abilities/` | **882 yetenek sınıfı** |
| `api/abilities/components` | 87 |
| `effects/` | 62 |
| Şeytan meyvesi (dil dosyasında) | ~60 |

Mod, yetenekleri **bileşen** mimarisiyle kuruyor
(`chargeComponent`, `continuousComponent`, `projectileComponent`,
`rangeComponent`, `altModeComponent`) — bu yüzden her yeteneğin
sabitleri sınıfın kendi havuzunda ada bitişik duruyor ve
okunabiliyor.

## Üç meyve neden bunlar

Ölçüt "bence güçlü" değil, **eserin kendi metninde** yazılı olan:

### 1. Gura Gura no Mi — Edward Newgate (Paramecia)

Sengoku, Marineford'da: *"dünyayı yok edebilecek güce sahip,
**en güçlü** şeytan meyvesi."* Bu bir yorum değil, meyvenin
manga içindeki resmî tanımı.

### 2. Yami Yami no Mi — Marshall D. Teach (Logia)

Tek dokunuşla **başka meyve güçlerini iptal ediyor**. Taşıyıcısı
eserde **iki meyveyi birden taşıyabilen tek kişi**. Onu
diğerlerine karşı üstün kılan şey hasarı değil, bu iptal.

### 3. Ope Ope no Mi — Trafalgar D. Water Law (Paramecia)

Doflamingo'nun sözü: ***"nihai şeytan meyvesi"*** (kyūkyoku no
akuma no mi). Ölümsüzlük Ameliyatı yapabilen tek meyve; uğruna
savaş çıktı.

### Elenen güçlü adaylar

| Meyve | Neden elendi |
|---|---|
| Goro Goro no Mi | "Yenilmez" deniyor ama eserde yenildi |
| Magu Magu no Mi | Yalnız **Mera Mera'ya** üstün olduğu yazılı |
| Pika Pika no Mi | Hız üstünlüğü var, "en güçlü" iddiası yok |

## Ölçülen sayılar (sınıf sabitleri)

| Sınıf | Sabit | Değer |
|---|---|---|
| `GekishinAbility` | `COOLDOWN` / `CHARGE_TIME` / `RANGE` | 240 / 20 / 8 |
| `TenchiMeidoAbility` | `COOLDOWN` / `CHARGE` / **`RANGE`** | 400 / 20 / **26** |
| `KabutowariAbility` | `COOLDOWN` / `CHARGE` / `PULL_TIME` | 200 / 40 / 60 |
| `ShimaYurashiAbility` | `EXPLOSION_RADIUS` / `DEPTH` / `COOLDOWN` | 35 / 10 / 1200 |
| `KurouzuAbility` | `COOLDOWN` / **`DAMAGE`** / `RANGE` | 240 / **30** / 128 |
| `BlackHoleAbility` | `CHARGE` / `COOLDOWN` / `RANGE_Y` | 100 / 200–400 / −6…+6 |
| `DarkMatterAbility` | `COOLDOWN` / `CHARGE` | 280 / 80 |
| `RoomAbility` | `MIN_ROOM_SIZE` / `MAX_ROOM_SIZE` | 8 / 45 |
| `ShamblesAbility` | `COOLDOWN` / `RANGE` | 40 / 64 |
| `GammaKnifeAbility` | `COOLDOWN` / **`DAMAGE`** | 500 / **70** |
| `CounterShockAbility` | `COOLDOWN` | 200 |

**Bekleme sayıları bizde kullanılmıyor** — `BEKLEME = 0` (v7.53,
kullanıcının kendi kararı). Menzil ve hasar geçti, ölçek
Bedrock'a çekildi.

## Kaynaktan alınan en değerli şey: ODA bağımlılığı

`ShamblesAbility`, `GammaKnifeAbility`, `CounterShockAbility` ve
`MesAbility` — **dördü de** sabit havuzunda
`RoomAbility.hasRoomActive` çağrısını taşıyor:

```
xyz/pixelatedw/mineminenomi/abilities/ope/RoomAbility
hasRoomActive | canUse | addCanUseCheck | addContinueUseCheck
```

Yani ODA açık değilse hiçbiri çalışmıyor. Bu bizde de aynen var:
`odaSart()` üç yeteneğin de önünde. Ope'nin bütün olayı zaten o
küre; onsuz meyve üç ayrı saldırıya dönüşürdü.

## Alınmayanlar ve nedeni

**Blok yutma** (`BlackHoleAbility` → `AbsorbedBlocksAbility` →
`LiberationAbility`, 512/1024 bloklu kuyruk). Geri verilmeyen
blok bu depoda eşya kaybı sayılır ve Liberation'ın defterini
kurmak ayrı bir iş. Alan hasarı ve içine çekme alındı.

**Blok kırma** (`TenchiMeido`, `ShimaYurashi` arazi parçalıyor).
Bu depoda blok kıran her şey önce kapalı gelir; üstelik bu bir
düello hamlesi, arazi silahı değil.

**Diğer ~57 meyve.** Katalog `lang/en_us.json` içinde; ileride
başkası istenirse oradan seçilir.

## Bizde nasıl karşılandı

`yetenekler/meyve.js`, sıra **560–570**. Meyve seçimi hem
sohbetten (`gura` / `yami` / `ope`, ve `titrek` / `karanlık` /
`oda`) hem jest sırasından (`meyve_sec`).

Karanlığın imzası **iptal** olarak geçti: Kurouzu çektiği hedefin
**faydalı** efektlerini söküyor, zararlılara dokunmuyor — iptal
bir yardım değil, güç alma.
