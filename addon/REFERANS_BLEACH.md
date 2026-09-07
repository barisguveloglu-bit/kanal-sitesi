# Referans · BleachAwaken 1.6.1

**Kaynak:** `BleachAwaken_By_Deephantom_1.6.1_forge1.16.5.jar`
(Forge 1.16.5, MCreator ile üretilmiş).

**Yöntem:** jar **hiç çalıştırılmadı**. Zip olarak açıldı, `.class`
dosyalarının **sabit havuzu** (constant pool) bayt bayt okundu.
Çözümleyici: `scratchpad/cp2.py` — yalnız UTF8 ve sayısal sabitleri
çıkarıyor, bytecode yürütmüyor.

## Modun yapısı

| | Adet |
|---|---|
| Sınıf | 4691 |
| `procedures/` (asıl mantık) | 2268 sınıf, **1064 benzersiz yordam** |
| `item/` | 906 |
| `potion/` | 162 |
| Dil anahtarı (`en_us.json`) | 1512 |

MCreator ürünü olduğu için her yetenek bir *procedure* sınıfı.
Yetenek adları `*SkillNamesProcedure` sınıflarında **düz metin**
olarak duruyor, yanlarında reiatsu bedeliyle:

```
weapon1CD  "Onibi - 65"
weapon2CD  "Killing Stroke - 125"
weapon3CD  "Shikai - 100"
```

Dağıtım `*SkillProcProcedure` sınıflarında: hangi tuşun hangi
yordamı çağırdığı orada.

## Seçilen üç karakter

Ölçüt: **güçlü** olmak ve mevcut üç *yol*dan (Getsuga · Cero ·
Letzt) mekanik olarak **ayrışmak**. Murciélago (Ulquiorra) güçlü
ama Arrancar/Cero yoluyla çakışıyordu; Katen Kyōkotsu'nun "Act
1–4" oyun mekaniği Bedrock'a temiz geçmiyordu.

### 1. Ryūjin Jakka — Yamamoto

| Kaynak yordamı | Okunan sabitler | Bizde |
|---|---|---|
| `OnibiProcedure` | `toRadians/cos/sin` + `yaw` + `10.0` | **Onibi** — 10 blok koni |
| `RyujinSetOnFireProcedure` | — | Onibi'nin yakma kısmı |
| `WestProcedure` → `FlameAoeEffectPotionEffect` → `FlameAoeEffectTickProcedure` | `radius1`, `XRadius2/ZRadius2`, `2.5`, `5.0` | **Alev Halesi** |
| `GeyserOfFireEffectTickProcedure` | `-6.0`/`6.0`, `3.0`, `15.0`, `5.0` | **Ateş Gayzeri** |
| `NorthProcedure` | `shunpo` sesi, `7.0` | alınmadı (ışınma Berserk'te var) |
| `SouthProcedure` | `ryujinOwner`, `MOB_SUMMONED`, `360.0` | alınmadı (varlık çağırma) |

**Kaynakta bulduğum bir tuhaflık:** `RyujinBankaiSkillNames2` "East
- 225" diye bir yetenek gösteriyor ama **`EastProcedure` diye bir
sınıf yok**. `RyujinBankaiSkillProc2` o yuvada `RyujinBankai1Item`
ile `RyujinBankai2Item` arasında geçiş yapıyor. Yani "East/West"
bir yetenek değil, **duruş değiştirme**. Bizde karşılığı yok —
tek eşya kullanıyoruz.

### 2. Nozarashi — Zaraki Kenpachi

| Kaynak yordamı | Okunan sabitler | Bizde |
|---|---|---|
| `StrongSlashProcedure` | `xRadius/zRadius/loop`, `3.0`, `5.0`, `9.0` | **Güçlü Kesik** |
| `TripleSlashProcedure` | `1.5`, `0.0`, `-1.5`, `0.1`, `0.075` | **Üçlü Kesik** |
| `Berserk2OnEffectActiveTickProcedure` | `CanTeleport`, `TargetPotionEffect`, `ClawLeft/ClawRigthParticle`, `shunpo`, `5.0` | **Berserk** |
| `KendoProcedure` | `posX/velX` + `delay` | alınmadı (Getsuga'yla çakışıyor) |
| `RoarPotionEffect` | — | alınmadı |

Berserk bu ailenin en özgün mekaniği: form açıkken **kendiliğinden
hedefe ışınıyor** ve pençeliyor.

### 3. Shinsō — Ichimaru Gin

| Kaynak yordamı | Okunan sabitler | Bizde |
|---|---|---|
| `ShinsoTriggerProcedure` | **`100.0`**, `ShinsoPoisonPotionEffect` | **Tetik** |
| `KamishiniNoYariProcedure` | `2.5`, `10.0`, `0.2`, `ShinsoPoisonPotionEffect` | **Kamishini no Yari** |
| `ButoRenjinProcedure` → `ButoRenjinShotProcedure` | `2.5`, `5.0` | **Butō Renjin** |
| `DashStabProcedure` | `1.25`, `7.0`, `0.45` | alınmadı |
| `ShinsoDodgeProcedure` | `-3.0`, `3.0`, `2.0` | alınmadı |

`ShinsoTrigger`'daki **100.0** bu karakterin bütün kimliği: bıçak
uzuyor ve çok uzaktan deliyor.

## Bedeller nasıl çevrildi

Kaynakta bedeller mutlak reiatsu: 25 · 65 · 70 · 100 · 125 · 225 ·
350 · 445. Ama reiatsu **tavanı** kaynakta seviyeyle büyüyor
(`ReiatsuBar1..20` yordamları bar'ı **kesir** olarak çiziyor:
0.05'ten 1.0'a), yani mutlak sayılar bize geçmiyor — **oran** geçti.
En pahalı kaynak bedeli 445, bizim tavanımız 3000:

| Kaynak | Bizde |
|---|---|
| 25 | 40 |
| 65 / 70 | 100 |
| 125 | 180 |
| 225 | 320 |
| 445 | 600 |

## Alınmayan iki büyük şey ve nedeni

**Üç kademeli form sistemi** (temel → Shikai → Bankai, her
kademede ayrı eşya). Bizde kademe zaten `RUH_KADEMELER`. İkinci
bir "form açık mı" defteri iki doğruluk kaynağı demekti; ikisi
zamanla ayrışırdı. Karakterin üç yeteneği birden açık, güçleri
`ruhCarpani` ile büyüyor.

**Irk/tür ağacı** (`race_type` → Hollow → Vasto → Arrancar →
`ressurection_type`). Bu, moddaki ilerleme sistemi. Bu depoda
ilerleme diye bir şey yok — her şey açık başlıyor, güç
`ruhCarpani`'ndan geliyor.
